from django.db import models

class Apartment(models.Model):
    number = models.CharField(max_length=10, unique=True)
    floor = models.IntegerField()
    status = models.CharField(
        max_length=10,
        choices=[('available', 'Available'), ('occupied', 'Occupied')],
        default='available'
    )
    notes = models.TextField(blank=True)

class Tenant(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)

class Lease(models.Model):
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='leases')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='leases')
    move_in = models.DateField()
    move_out = models.DateField()
    is_active = models.BooleanField(default=True)

class MaintenanceRequest(models.Model):
    lease = models.ForeignKey(Lease, on_delete=models.CASCADE, related_name='maintenance_requests')
    issue = models.TextField()
    status = models.CharField(
        max_length=10,
        choices=[('open', 'Open'), ('closed', 'Closed')],
        default='open'
    )
    created_at = models.DateTimeField(auto_now_add=True)