from rest_framework import serializers
from django.db.models import Q
from .models import Apartment, Tenant, Lease, MaintenanceRequest


class ApartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apartment
        fields = '__all__'
    
    def validate_floor(self, value):
        """Ensure floor is not negative."""
        if value < 0:
            raise serializers.ValidationError('Floor number cannot be negative.')
        return value
    
    def validate_number(self, value):
        """Ensure apartment number is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError('Apartment number is required.')
        return value


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = '__all__'
    
    def validate_name(self, value):
        """Ensure name is at least 2 characters."""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters long.')
        return value
    
    def validate_email(self, value):
        """Ensure email is not empty."""
        if not value:
            raise serializers.ValidationError('Email is required.')
        return value


class LeaseSerializer(serializers.ModelSerializer):
    apartment = ApartmentSerializer(read_only=True)
    tenant = TenantSerializer(read_only=True)
    apartment_id = serializers.PrimaryKeyRelatedField(
        queryset=Apartment.objects.all(), source='apartment', write_only=True)
    tenant_id = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(), source='tenant', write_only=True)

    class Meta:
        model = Lease
        fields = [
            'id', 'apartment', 'tenant', 'move_in', 'move_out', 'is_active',
            'apartment_id', 'tenant_id'
        ]
    
    def validate(self, data):
        """
        Cross-field validation for leases.
        """
        move_in = data.get('move_in')
        move_out = data.get('move_out')
        apartment = data.get('apartment')
        is_active = data.get('is_active', True)
        
        # 1. Check date order
        if move_in and move_out and move_in > move_out:
            raise serializers.ValidationError({
                'move_out': 'Move-out date must be after move-in date.'
            })
        
        # 2. Check for overlapping leases (only for active leases)
        if is_active and apartment and move_in and move_out:
            overlapping = Lease.objects.filter(
                apartment=apartment,
                is_active=True
            ).filter(
                Q(move_in__lte=move_out) & Q(move_out__gte=move_in)
            )
            
            # Exclude current lease when updating
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            
            if overlapping.exists():
                existing = overlapping.first()
                raise serializers.ValidationError({
                    'apartment': f'This apartment is already booked from {existing.move_in} to {existing.move_out}. '
                                f'Please choose different dates or mark this lease as inactive.'
                })
        
        return data
    
    def create(self, validated_data):
        """
        Create lease and ensure apartment status is updated.
        The model's save method will handle the status sync.
        """
        try:
            lease = super().create(validated_data)
            return lease
        except Exception as e:
            raise serializers.ValidationError(str(e))
    
    def update(self, instance, validated_data):
        """
        Update lease and ensure apartment status is updated.
        The model's save method will handle the status sync.
        """
        try:
            lease = super().update(instance, validated_data)
            return lease
        except Exception as e:
            raise serializers.ValidationError(str(e))


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    lease = LeaseSerializer(read_only=True)
    lease_id = serializers.PrimaryKeyRelatedField(
        queryset=Lease.objects.all(), source='lease', write_only=True
    )

    class Meta:
        model = MaintenanceRequest
        fields = ['id', 'lease', 'issue', 'status', 'created_at', 'lease_id']
    
    def validate_issue(self, value):
        """Ensure issue description is at least 5 characters."""
        if not value or len(value.strip()) < 5:
            raise serializers.ValidationError('Issue description must be at least 5 characters long.')
        return value
    
    def validate_lease_id(self, value):
        """Ensure lease is active when creating maintenance request."""
        if not value.is_active:
            raise serializers.ValidationError('Cannot create maintenance request for inactive lease.')
        return value
