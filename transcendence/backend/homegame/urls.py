from django.urls import path
from . import views
from homegame.views import MessageHistoryAPIView, DeclineFriendRequestView,mark_notifications_as_seen
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.home, name='spa'),  # Single Page Application (SPA) route
    path('home/', views.spa, name='home'),

    path('api/save_code', views.save_code, name='save_code'),
    path('api/home', views.home, name='home'),
    path('api/message/', MessageHistoryAPIView.as_view(), name='message-history'),
    path('accept_friend_request/', views.accept_friend_request, name='accept_friend_request'),
    path('create_friend_request/', views.create_friend_request, name='create_friend_request'),
    path('api/friend-decline/<str:friend_from>/', DeclineFriendRequestView.as_view(), name='decline-friend-request'),
    path('api/mark-notifications-as-seen/', mark_notifications_as_seen, name='mark-notifications-as-seen'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
