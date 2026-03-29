"""
Custom validators for the property management system.
"""
from django.core.exceptions import ValidationError
from django.db.models import Q
from datetime import date


def validate_no_overlapping_leases(lease):
    """
    Check that a lease doesn't overlap with existing active leases for the same apartment.
    """
    if not lease.apartment_id or not lease.move_in or not lease.move_out:
        return  # Can't validate without all fields
    
    overlapping = lease.apartment.leases.filter(
        is_active=True
    ).filter(
        Q(move_in__lte=lease.move_out) & Q(move_out__gte=lease.move_in)
    )
    
    # Exclude self when updating
    if lease.pk:
        overlapping = overlapping.exclude(pk=lease.pk)
    
    if overlapping.exists():
        existing = overlapping.first()
        raise ValidationError(
            f'This apartment is already booked from {existing.move_in} to {existing.move_out}. '
            f'Please choose different dates.'
        )


def validate_move_in_before_move_out(lease):
    """
    Check that move_in date is before move_out date.
    """
    if lease.move_in and lease.move_out and lease.move_in > lease.move_out:
        raise ValidationError('Move-in date must be before move-out date.')


def validate_not_past_date(value, field_name):
    """
    Check that a date is not in the past (for new bookings).
    """
    if value and value < date.today():
        raise ValidationError(f'{field_name} cannot be in the past.')
