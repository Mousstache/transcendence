"""
ASGI config for spa project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

# mysite/asgi.py
import os
import django
from django.urls import path
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")
django.setup()
django_asgi_app = get_asgi_application()

# Import your consumers
from chat.consumers import PersonalChatConsumer
from game.consumers import GameConsumer  # Assuming GameConsumer exists in game app

# Import your websocket URL patterns
from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from game.routing import websocket_urlpatterns as game_websocket_urlpatterns

# Import your JWTAuthMiddleware
from homegame.middleware import JWTAuthMiddleware  # Adjust the path as necessary

# Combine the websocket URL patterns from both chat and game
websocket_urlpatterns = chat_websocket_urlpatterns + game_websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter([
                path('ws/<int:id>/', PersonalChatConsumer.as_asgi()),
                # path('ws/notify/', NotificationConsumer.as_asgi()),  # Uncomment if using NotificationConsumer
                *websocket_urlpatterns,  # Include the combined websocket routes
            ])
        )
    ),
})
