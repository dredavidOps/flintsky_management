from rest_framework import serializers
from .models import Apartment, Tenant, Lease, MaintenanceRequest

class ApartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apartment
        fields = '__all__'

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = '__all__'

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

class MaintenanceRequestSerializer(serializers.ModelSerializer):
    lease = LeaseSerializer(read_only=True)
    lease_id = serializers.PrimaryKeyRelatedField(
        queryset=Lease.objects.all(), source='lease', write_only=True
    )

    class Meta:
        model = MaintenanceRequest
        fields = ['id', 'lease', 'issue', 'status', 'created_at', 'lease_id']
