from django.urls import re_path

from . import consumers
from . import consumers_tournament

websocket_urlpatterns = [
    re_path(r"ws/game/(?P<room_name>\w+)/$", consumers.GameConsumer.as_asgi()),
    re_path(r"ws/tournament/(?P<room_name>\w+)/$", consumers_tournament.TournamentConsumer.as_asgi()),
]