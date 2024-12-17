import logging
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.conf import settings
from django.http import JsonResponse

User = get_user_model()

@database_sync_to_async
def get_user(scope):
    query_string = scope['query_string'].decode()
    token_key = 'token='
    token = None

    if token_key in query_string:
        token = query_string.split(token_key)[1].split('&')[0]
    
    if not token:
        logging.warning("No token found in query string")
        return AnonymousUser()

    try:
        access_token = AccessToken(token)
        user = User.objects.get(id=access_token['user_id'])
        return user
    except Exception as e:
        logging.error(f"Token validation failed: {e}")
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope['user'] = await get_user(scope)
        return await super().__call__(scope, receive, send)

class CheckAuthMiddleware:
    """
    Middleware qui bloque les appels aux vues pour les utilisateurs non connectés.
    Si l'utilisateur n'est pas authentifié, retourne une réponse 403.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # print(f"[DEBUG] Middleware exécuté pour : {request.path}")

        # Vérifie si l'utilisateur n'est pas connecté
        if not request.user.is_authenticated:
            # Retourne une réponse JSON avec un statut 403 si l'utilisateur n'est pas connecté
            return JsonResponse({'error': 'Authentication required'}, status=403)

        # Si tout va bien, continue le traitement de la requête
        response = self.get_response(request)
        return response
