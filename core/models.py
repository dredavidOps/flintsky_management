from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.dispatch import receiver
from django.db.models.signals import post_save, post_delete


class Apartment(models.Model):
    number = models.CharField(max_length=10, unique=True)
    floor = models.IntegerField()
    bedrooms = models.IntegerField(
        choices=[(1, '1 Bedroom'), (2, '2 Bedrooms')],
        default=1
    )
    status = models.CharField(
        max_length=10,
        choices=[('available', 'Available'), ('occupied', 'Occupied')],
        default='available'
    )
    notes = models.TextField(blank=True)

    def clean(self):
        """Validate apartment data."""
        if self.floor < 0:
            raise ValidationError('Floor number cannot be negative.')
        
        if self.status not in ['available', 'occupied']:
            raise ValidationError('Status must be either "available" or "occupied".')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Apartment {self.number}"


class Tenant(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)

    def clean(self):
        """Validate tenant data."""
        if not self.name or len(self.name.strip()) < 2:
            raise ValidationError('Name must be at least 2 characters long.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Lease(models.Model):
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='leases')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='leases')
    move_in = models.DateField()
    move_out = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-move_in']

    def clean(self):
        """Validate lease data before saving."""
        # 1. Check date order
        if self.move_in and self.move_out and self.move_in > self.move_out:
            raise ValidationError('Move-in date must be before move-out date.')
        
        # 2. Check for overlapping leases (only if this lease is active)
        if self.is_active:
            self._check_overlapping_leases()

    def _check_overlapping_leases(self):
        """Check for overlapping active leases on the same apartment."""
        if not self.apartment_id or not self.move_in or not self.move_out:
            return
        
        overlapping = Lease.objects.filter(
            apartment=self.apartment,
            is_active=True
        ).filter(
            Q(move_in__lte=self.move_out) & Q(move_out__gte=self.move_in)
        )
        
        # Exclude self when updating
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        
        if overlapping.exists():
            existing = overlapping.first()
            raise ValidationError(
                f'This apartment is already booked from {existing.move_in} to {existing.move_out}. '
                f'Please choose different dates.'
            )

    def save(self, *args, **kwargs):
        """Save lease and sync apartment status."""
        self.clean()
        super().save(*args, **kwargs)
        self._sync_apartment_status()

    def delete(self, *args, **kwargs):
        """Delete lease and update apartment status."""
        apartment = self.apartment
        super().delete(*args, **kwargs)
        # Update apartment status after deletion
        _update_apartment_status(apartment)

    def _sync_apartment_status(self):
        """Sync apartment status based on active leases."""
        _update_apartment_status(self.apartment)

    def __str__(self):
        return f"Lease {self.id}: {self.apartment.number} - {self.tenant.name}"


def _update_apartment_status(apartment):
    """
    Update apartment status based on active leases.
    Call this whenever a lease is created, updated, or deleted.
    """
    has_active = apartment.leases.filter(is_active=True).exists()
    expected_status = 'occupied' if has_active else 'available'
    
    if apartment.status != expected_status:
        apartment.status = expected_status
        apartment.save(update_fields=['status'])


class MaintenanceRequest(models.Model):
    lease = models.ForeignKey(Lease, on_delete=models.CASCADE, related_name='maintenance_requests')
    issue = models.TextField()
    status = models.CharField(
        max_length=10,
        choices=[('open', 'Open'), ('closed', 'Closed')],
        default='open'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        """Validate maintenance request data."""
        # Check that lease is active
        if self.lease_id and not self.lease.is_active:
            raise ValidationError('Cannot create maintenance request for inactive lease.')
        
        # Check issue text
        if not self.issue or len(self.issue.strip()) < 5:
            raise ValidationError('Issue description must be at least 5 characters long.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Request #{self.id}: {self.issue[:30]}..."


# Signal handlers as backup for apartment status sync
@receiver(post_save, sender=Lease)
def lease_post_save(sender, instance, created, **kwargs):
    """
    Ensure apartment status is synced after lease save.
    This is a backup to the model's save method.
    """
    _update_apartment_status(instance.apartment)


@receiver(post_delete, sender=Lease)
def lease_post_delete(sender, instance, **kwargs):
    """
    Update apartment status after lease deletion.
    This is a backup to the model's delete method.
    """
    _update_apartment_status(instance.apartment)
