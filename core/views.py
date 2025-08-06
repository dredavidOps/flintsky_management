from django.shortcuts import render

from rest_framework import viewsets, generics
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from datetime import date, timedelta

from .models import Apartment, Tenant, Lease, MaintenanceRequest
from .serializers import (
    ApartmentSerializer, TenantSerializer, LeaseSerializer, MaintenanceRequestSerializer
)

class ApartmentViewSet(viewsets.ModelViewSet):
    queryset = Apartment.objects.all()
    serializer_class = ApartmentSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class LeaseViewSet(viewsets.ModelViewSet):
    queryset = Lease.objects.all()
    serializer_class = LeaseSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def overview(request):
    total = Apartment.objects.count()
    occupied = Apartment.objects.filter(status='occupied').count()
    available = Apartment.objects.filter(status='available').count()
    today = date.today()
    next_week = today + timedelta(days=7)
    upcoming_move_ins = Lease.objects.filter(move_in__range=[today, next_week])
    upcoming_move_outs = Lease.objects.filter(move_out__range=[today, next_week])

    def lease_brief(lease):
        return {
            "apartment": lease.apartment.number,
            "tenant": lease.tenant.name,
            "move_in": lease.move_in,
            "move_out": lease.move_out
        }

    return Response({
        "total_apartments": total,
        "occupied": occupied,
        "available": available,
        "upcoming_move_ins": [lease_brief(l) for l in upcoming_move_ins],
        "upcoming_move_outs": [lease_brief(l) for l in upcoming_move_outs],
    })

class UpcomingMoveInsView(generics.ListAPIView):
    serializer_class = LeaseSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        today = date.today()
        next_week = today + timedelta(days=7)
        return Lease.objects.filter(move_in__range=[today, next_week])

class UpcomingMoveOutsView(generics.ListAPIView):
    serializer_class = LeaseSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        today = date.today()
        next_week = today + timedelta(days=7)
        return Lease.objects.filter(move_out__range=[today, next_week])

