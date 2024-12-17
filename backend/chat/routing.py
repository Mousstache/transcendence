from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
	re_path(r'ws/chat/(?P<room_name>[\w-]+)/$', consumers.PersonalChatConsumer.as_asgi()),
    re_path(r'ws/online/$', consumers.OnlineStatusConsumer.as_asgi()),
    re_path(r'ws/notify/$', consumers.NotificationConsumer.as_asgi()),
]

