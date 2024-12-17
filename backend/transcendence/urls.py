from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from homegame import views
from homegame.views import UserViewset, MatchViewset,FriendRequestViewSet,\
    PointMarqueViewset,\
    LastThreeMatchesViewset, ObtainTokenWithoutPassword,\
    MessageViewset, InviteNotificationViewset,\
    ChatNotificationViewset, CurrentUserViewset, FriendViewSet,\
    TournoiViewset, validate_code, fetch_notifications, TournamentRequestViewSet

router = routers.SimpleRouter()

router.register('user', UserViewset, basename='user')
router.register('match', MatchViewset, basename='match')
router.register('friend', FriendViewSet, basename='friend')
# router.register('blacklist', BlackListViewset, basename='blacklist')
router.register('pointmarque', PointMarqueViewset, basename='pointmarque')
router.register('current-user', CurrentUserViewset, basename='current-user')
router.register('last-three-matches', LastThreeMatchesViewset, basename='last-three-matches')
router.register('message', MessageViewset, basename='message')
router.register('chat-notification', ChatNotificationViewset, basename='chat-notification')
router.register('invite-notification', InviteNotificationViewset, basename='invite-notification')
router.register('tournoi', TournoiViewset, basename='tournoi')
router.register(r'friend-requests', FriendRequestViewSet, basename='friend-request')
router.register(r'tournament-requests', TournamentRequestViewSet, basename='tournament-request')
current_user_upload = CurrentUserViewset.as_view({'post': 'upload_profile_pic'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('homegame.urls')),
    path('api/token/', ObtainTokenWithoutPassword.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),
    # path('validate_code/<str:login>/<str:code>/', views.validate_code, name='validate_code'),
    # Friend request endpoints
    path('api/mark-notifications-as-seen/', views.mark_notifications_as_seen, name='mark-notifications-as-seen'),
    path('api/fetch-notifications/', views.fetch_notifications, name='fetch-notifications'),
    path('api/friend/', views.create_friend_request, name='create_friend_request'),  
    path('api/accept-friend/', views.accept_friend_request, name='accept_friend_request'),  
    # Include the chat app URLs
    # path('chat/', include('chat.urls')),
	path('api/current-user/upload_profile_pic/', current_user_upload, name='upload-profile-pic'),
    path('api/validate_code/<str:user_login>/<str:code>/', views.validate_code, name='validate_code'),
]
