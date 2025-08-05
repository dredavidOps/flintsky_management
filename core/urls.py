from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'apartments', views.ApartmentViewSet)
router.register(r'tenants', views.TenantViewSet)
router.register(r'leases', views.LeaseViewSet)
router.register(r'maintenance-requests', views.MaintenanceRequestViewSet)

urlpatterns = [
    path('overview/', views.overview, name='overview'),
    path('leases/upcoming-moveins/', views.UpcomingMoveInsView.as_view(), name='upcoming-moveins'),
    path('leases/upcoming-moveouts/', views.UpcomingMoveOutsView.as_view(), name='upcoming-moveouts'),
    path('', include(router.urls)),
]