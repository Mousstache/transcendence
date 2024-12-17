from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status
from django.shortcuts import render , redirect
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from django.template.loader import render_to_string
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from homegame.serializers import UserDetailSerializer, UserListSerializer,\
    MatchDetailSerializer, MatchListSerializer, FriendSerializer,\
    BlackListSerializer, TournoiDetailSerializer, PointMarqueDetailSerializer,\
    PointMarqueListSerializer, UserUpdateSerializer, UpdateCoalitionSerializer,\
    MessageSerializer, InviteNotificationSerializer, ChatNotificationSerializer,\
    FriendRequestSerializer, TournamentRequestSerializer,\
    FriendRequestSerializer, Update2FASerializer\
    
from homegame.models import  User, Match, Friend, FriendRequest, TournamentRequest, Tournoi, BlackList, PointMarque, ChatModel, ChatNotification, InviteNotification
import requests
import logging
import random
import json
import aiohttp  # Assurez-vous d'ajouter aiohttp dans vos dépendances
from channels.generic.websocket import AsyncWebsocketConsumer

from chat.consumers import send_friend_request_notification  # Import the notification function
from chat.consumers import friend_request_accepted_group  

import time
import datetime
import asyncio
import json
import requests
from asgiref.sync import sync_to_async
from django.contrib.auth import login, authenticate, get_user_model
from django.conf import settings
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from rest_framework import permissions, filters, generics
from chat.consumers import send_friend_request_notification , send_tournament_request_notification # Import the notification function
from django.views.decorators.http import require_POST, require_GET


from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from homegame.models import User  # Import your User model
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from homegame.models import FriendRequest, User

from rest_framework.decorators import api_view
from rest_framework.response import Response
from decouple import config

def spa(request):
    return render(request, 'index.html')

def play(request):
    content_html = render_to_string('partials/play.html')
    js_script_path = '/static/js/play.js'  # The correct path to your JS script

    return JsonResponse({'content': content_html, 'js_script': js_script_path})

from rest_framework.decorators import api_view
from rest_framework.response import Response

from rest_framework.decorators import api_view
from rest_framework.response import Response
from homegame.models import User


# homegame/views.py

from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models

from .models import User, Friend, FriendRequest
from .serializers import UserDetailSerializer


class UserViewset(ModelViewSet):
    serializer_class = UserDetailSerializer
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        username = self.request.query_params.get('username', None)

        if username:
            queryset = queryset.filter(username=username)

        if not queryset.exists():
            return queryset.none()  # Return an empty queryset if no user is found

        return queryset

    @action(detail=True, methods=['post'], url_path='block')
    def block_user(self, request, pk=None):
        blocker = request.user
        try:
            blocked_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if blocker == blocked_user:
            return Response({'detail': 'You cannot block yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Remove friendship if exists
        Friend.objects.filter(
            models.Q(friend=blocker, friend_with=blocked_user) | 
            models.Q(friend=blocked_user, friend_with=blocker)
        ).delete()

        # Remove friend requests between the two users
        FriendRequest.objects.filter(
            models.Q(friend=blocker, friend_with=blocked_user) | 
            models.Q(friend=blocked_user, friend_with=blocker)
        ).delete()

        # Add blocked_user to blocker's blocked_users list
        blocker.blocked_users.add(blocked_user)

        return Response({'detail': f'User {blocked_user.username} has been blocked.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unblock')
    def unblock_user(self, request, pk=None):
        blocker = request.user
        try:
            blocked_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Remove blocked_user from blocker's blocked_users list
        blocker.blocked_users.remove(blocked_user)

        return Response({'detail': f'User {blocked_user.username} has been unblocked.'}, status=status.HTTP_200_OK)



class TournoiViewset(ModelViewSet):
    serializer_class = TournoiDetailSerializer

    def get_queryset(self):
        return Tournoi.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
class CurrentUserViewset(ModelViewSet):
    permission_classes = [IsAuthenticated]  # Assurez-vous que seul l'utilisateur connecté peut accéder à cette vue

    def list(self, request):
        # Sérialisation de l'utilisateur connecté
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)

    def get_serializer_class(self):
        # Choisit le sérialiseur basé sur l'action
        if self.action == 'update_user':
            return UserUpdateSerializer
        return UserDetailSerializer

    @action (detail=False, methods=['put'])
    def update_user(self, request, *args, **kwargs):
        user = self.request.user
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)  # `partial=True` permet la mise à jour partielle

        if serializer.is_valid():
            serializer.save()  # Enregistre les modifications
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action (detail=False, methods=['put'])
    def update_coalition(self, request, *args, **kwargs):
        user = self.request.user
        serializer = UpdateCoalitionSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action (detail=False, methods=['put'])
    def update_2FA(self, request, *args, **kwargs):
        user = self.request.user
        serializer = Update2FASerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MatchViewset(ModelViewSet):
    serializer_class = MatchDetailSerializer

    def get_queryset(self):
        queryset = Match.objects.all()
        username = self.request.query_params.get('username')
        if username is not None:
            queryset = queryset.filter(user_1__username=username) | queryset.filter(user_2__username=username)
        return queryset

    @action(detail=False, methods=['post'])
    def create_game(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            headers = self.get_succes_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LastThreeMatchesViewset(ReadOnlyModelViewSet):
    serializer_class = MatchListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Match.objects.filter(Q(user_1=user) | Q(user_2=user)).order_by('-match_date')[:3]

    def get_serializer_context(self):
        # Ajouter l'utilisateur connecté au contexte du serializer
        context = super().get_serializer_context()
        context.update({'player': self.request.user})
        return context

# views.py

from rest_framework.viewsets import ModelViewSet
from homegame.models import Friend, User  # Import your models
from homegame.serializers import FriendSerializer
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import InviteNotification

@login_required
def fetch_notifications(request):
    # Récupère les notifications de l'utilisateur connecté qui ne sont pas encore vues
    notifications = InviteNotification.objects.filter(user=request.user, is_seen=False)
    
    # Formatage des données pour l'API
    data = [
        {
            "id": notification.id,
            "message": notification.message,
            "is_seen": notification.is_seen
        } 
        for notification in notifications
    ]
    return JsonResponse(data, safe=False)

from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_as_seen(request):
    # Update notifications as seen
    InviteNotification.objects.filter(user=request.user, is_seen=False).update(is_seen=True)
    return Response({'status': 'success'}, status=status.HTTP_200_OK)

class FriendViewSet(ModelViewSet):
    queryset = Friend.objects.all()
    serializer_class = FriendSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        blocked_users = user.blocked_users.all()
        return Friend.objects.filter(friend=user).exclude(friend_with__in=blocked_users)


class FriendRequestViewSet(ModelViewSet):
    queryset = FriendRequest.objects.all()
    serializer_class = FriendRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Return pending friend requests where the current user is the receiver_username
        return FriendRequest.objects.filter(friend_with=user, is_accepted=False)

    # homegame/views.py

class FriendRequestViewSet(ModelViewSet):
    queryset = FriendRequest.objects.all()
    serializer_class = FriendRequestSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        sender = request.user
        recipient_username = request.data.get('friend_with')

        if not recipient_username:
            return Response({'detail': 'Friend username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(username=recipient_username)
        except User.DoesNotExist:
            return Response({'detail': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        if sender == recipient:
            return Response({'detail': 'You cannot send a friend request to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if recipient has blocked sender
        if recipient.blocked_users.filter(id=sender.id).exists():
            return Response({'detail': 'Cannot send friend request to this user.'}, status=status.HTTP_403_FORBIDDEN)

        # Check if sender has blocked recipient
        if sender.blocked_users.filter(id=recipient.id).exists():
            return Response({'detail': 'Cannot send friend request to this user.'}, status=status.HTTP_403_FORBIDDEN)

        # Check if a friend request already exists
        if FriendRequest.objects.filter(friend=sender, friend_with=recipient).exists():
            return Response({'detail': 'Friend request already sent.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if they are already friends
        if Friend.objects.filter(friend=sender, friend_with=recipient).exists():
            return Response({'detail': 'You are already friends with this user.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the friend request
        friend_request = FriendRequest.objects.create(friend=sender, friend_with=recipient)
        send_friend_request_notification(recipient.username, sender.username)

        # Serialize and return the created friend request data
        serializer = self.get_serializer(friend_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


    def update(self, request, pk=None):
        friend_request = self.get_object()
        if friend_request.friend_with != request.user:
            return Response({'detail': 'Not authorized to accept this friend request.'}, status=status.HTTP_403_FORBIDDEN)

        is_accepted = request.data.get('is_accepted', False)
        if is_accepted:
            # Create reciprocal Friend objects
            Friend.objects.create(friend=friend_request.friend, friend_with=friend_request.friend_with, is_accepted=True)
            Friend.objects.create(friend=friend_request.friend_with, friend_with=friend_request.friend, is_accepted=True)
            # Delete the friend request
            sender = request.user
            receiver_username = request.data.get('friend_with')
            sender_username = friend_request.friend.username  # Original sender's username
            friend_request_accepted_group(sender_username)
            # friend_request_accepted_group(sender)
            friend_request.delete()
            return Response({'detail': 'Friend request accepted.'}, status=status.HTTP_200_OK)
        else:
            return Response({'detail': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='decline')
    def decline_request(self, request, pk=None):
        # Handle declining a friend request
        user = request.user

        try:
            friend_request = FriendRequest.objects.get(id=pk, friend_with=user, is_accepted=False)
        except FriendRequest.DoesNotExist:
            return Response({'detail': 'Friend request not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Delete the friend request
        friend_request.delete()

        return Response({'detail': 'Friend request declined.'}, status=status.HTTP_200_OK)


class UserListAPIView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        username = self.request.query_params.get('username')
        if username:
            queryset = queryset.filter(username=username)
        else:
            queryset = queryset.none()  # Return empty queryset if no username provided
        return queryset



# class BlackListViewset(ModelViewSet):
#     serializer_class = BlackListSerializer

#     def get_queryset(self):
#         queryset = BlackList.objects.all()
#         username = self.request.query_params.get('username')
#         if username is not None:
#             users = User.objects.filter(username=username)
#             user_ids = users.values_list('id', flat=True)
#             queryset = queryset.filter(block_id__in=user_ids) | queryset.filter(have_block_id__in=user_ids)
#         return queryset

#     @action(detail=False, methods=['post'])
#     def block_user(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         if serializer.is_valid():
#             self.perform_create(serializer)
#             headers = self.get_success_headers(serializer.data)
#             return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PointMarqueViewset(ModelViewSet):
    serializer_class = PointMarqueDetailSerializer

    def get_queryset(self):
        return PointMarque.objects.all()

    @action(detail=False, methods=['post'])
    def create_point(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            headers = self.get_succes_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ObtainTokenWithoutPassword(APIView):
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')

        # Vérifie que les deux champs sont fournis
        if not username or not email:
            return Response({"error": "Username and email are required"}, status=400)

        try:
            # Recherche l'utilisateur avec le nom d'utilisateur ET l'adresse email
            user = User.objects.get(username=username, email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found or email does not match"}, status=404)
        
        # Génère les tokens de rafraîchissement et d'accès
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })

class MessageViewset(ModelViewSet):
    serializer_class = MessageSerializer
    def get_queryset(self):
        return ChatModel.objects.all()
    
class InviteNotificationViewset(ModelViewSet):
    serializer_class = InviteNotificationSerializer
    def get_queryset(self):
        return InviteNotification.objects.all()
    
class ChatNotificationViewset(ModelViewSet):
    serializer_class = ChatNotificationSerializer
    def get_queryset(self):
        return ChatNotification.objects.all() 

from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from homegame.models import FriendRequest, User


@csrf_exempt  # Désactiver temporairement la vérification CSRF pour cette vue (à ne pas faire en production sans précautions)
def save_code(request):
    if request.method == "POST":
        try:
            # Décoder les données JSON envoyées par le front-end
            data = json.loads(request.body)
            code = data.get('code')

            if code:
                print("Code reçu du front-end :", code)
                # Sauvegardez ou utilisez le code ici
                return JsonResponse({"message": "Code reçu avec succès.", "code": code}, status=200)
            else:
                return JsonResponse({"error": "Aucun code fourni."}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Format JSON invalide."}, status=400)
    else:
        return JsonResponse({"error": "Méthode non autorisée."}, status=405)

from django.views.decorators.csrf import csrf_exempt
import json
from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.core.mail import send_mail
from django.conf import settings
from django.http import JsonResponse
import random
import requests
from django.contrib.auth import get_user_model
from decouple import config

@csrf_exempt  # Désactiver temporairement CSRF pour les tests
def home(request):
    client_id = config('42_UID')
    client_secret = config('42_SECRET')
    redirect_uri = config('42_REDIRECT_URI')

    # Récupérer le code depuis une requête POST
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            authorization_code = data.get('code')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
    else:
        # Si aucun code n'est reçu, affichez une erreur
        return JsonResponse({"error": "No authorization code provided."}, status=400)

    print("Authorization code:", authorization_code)

    # Préparer les données pour la requête token
    token_url = 'https://api.intra.42.fr/oauth/token'
    token_data = {
        'grant_type': 'authorization_code',
        'redirect_uri': redirect_uri,
        'client_id': client_id,
        'code': authorization_code,
        'client_secret': client_secret,
    }

    response = requests.post(token_url, json=token_data)

    if response.status_code == 200:
        token_json = response.json()
        access_token = token_json.get('access_token')

        if access_token:
            user_info_url = 'https://api.intra.42.fr/v2/me'
            headers = {'Authorization': f'Bearer {access_token}'}
            user_info_response = requests.get(user_info_url, headers=headers)

            if user_info_response.status_code == 200:
                user_info = user_info_response.json()
                UserModel = get_user_model()

                user, created = UserModel.objects.update_or_create(
                    id=user_info.get('id'),
                    defaults={
                        'username': user_info.get('login'),
                        'first_name': user_info.get('displayname'),
                        'last_name': user_info.get('displayname'),
                        'image': user_info.get('image')['link'],
                        'email': user_info.get('email'),
                    }
                )
                if created:
                    user.coalition = UserModel.ORDER
                    user.active_2FA = False

                if user.active_2FA:
                    validation_code = random.randint(100000, 999999)
                    user.validation_code = validation_code
                    send_mail(
                        'Votre code de validation',
                        f'Votre code de validation est : {validation_code}',
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
                    print(validation_code)

                user.save()

                login(request, user)
                hostname = config('HOST_HOSTNAME')

                if user.active_2FA:
                    response = JsonResponse({"redirect_url": "https://" + config("HOST_HOSTNAME") + ":8443/validate_code/"})
                    # response = JsonResponse({"redirect_url": "https://localhost:8443/validate_code/"})
                else:
                    response = JsonResponse({"redirect_url": "https://" + config("HOST_HOSTNAME")  + ":8443/home/"})
                    # response = JsonResponse({"redirect_url": "https://localhost:8443/home/"})

                response.set_cookie('login', user.username, max_age=7 * 24 * 60 * 60)
                response.set_cookie('email', user.email, max_age=7 * 24 * 60 * 60)
                # print(response)
                return response
            else:
                error_message = f"Failed to fetch user info: {user_info_response.status_code}"
                return render(request, 'partials/home.html', {'error': error_message})
        else:
            error_message = token_json.get('error_description', 'Failed to obtain access token.')
            return render(request, 'partials/home.html', {'error': error_message})
    else:
        error_message = response.json().get('error_description', 'Failed to obtain access token.')
        return render(request, 'partials/home.html', {'error': error_message})


@require_POST
@csrf_exempt
def validate_code(request, user_login, code):
    # Récupérer le login
    # print(request)
    # print(request.COOKIES)
    # login = request.COOKIES.get('login')  # Remplace ceci par request.COOKIES.get('login') si tu l'utilises
    print("login: ", user_login)
    if not user_login:
        return JsonResponse({"error": "Session invalide."}, status=400)

    try:
        user = get_user_model().objects.get(username=user_login)
        # login(request, user)
    except user.DoesNotExist:
        return JsonResponse({"error": "Utilisateur introuvable."}, status=404)
    print("Code: ", code)
    # Vérification si code est None
    if code is None:
        return JsonResponse({"error": "Aucun code de validation fourni."}, status=400)

    try:
        code_int = int(code)
    except ValueError:
        return JsonResponse({"error": "Code de validation doit être un nombre."}, status=400)
    print("User validation code: ", user.validation_code)
    print("Converted code: ", code_int)

    # Vérification du code de validation
    if user.validation_code == code_int:
        login(request, user)
        print("Code is correct. User validation code:", user.validation_code, "code:", code_int)
        return JsonResponse({"success": True})  # Pas besoin de redirection ici
    else:
        print("Code is incorrect. User validation code:", user.validation_code, "code:", code_int)
        return JsonResponse({"error": "Code de validation incorrect."}, status=400)

def message_list(request):
    sender = request.query_params.get('sender')
    receiver = request.query_params.get('receiver')

    if sender and receiver:
        messages = ChatModel.objects.filter(
            (Q(sender__username=sender) & Q(receiver__username=receiver)) |
            (Q(sender__username=receiver) & Q(receiver__username=sender))
        ).order_by('timestamp')
    else:
        messages = ChatModel.objects.none()

    serializer = MessageSerializer(messages, many=True)
    return Response({'results': serializer.data})

# homegame/views.py

from rest_framework.response import Response
from rest_framework.views import APIView
from homegame.models import ChatModel

class MessageHistoryAPIView(APIView):
    def get(self, request, *args, **kwargs):
        # Get the thread_name from the query parameters
        thread_name = request.GET.get('thread_name')
        
        if not thread_name:
            return Response({'error': 'Thread name is required'}, status=400)
        
        # Query the messages for the given thread
        messages = ChatModel.objects.filter(thread_name=thread_name).order_by('timestamp')
        
        # Serialize and return the messages
        return Response({
            'count': messages.count(),
            'results': [
                {
                    'sender': message.sender.id,
                    'message': message.message,
                    'timestamp': message.timestamp
                }
                for message in messages
            ]
        })

@csrf_exempt
def create_friend_request(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        friend = data.get('friend')
        friend_with = data.get('friend_with')

        # Check if a friend request already exists in either direction
        if FriendRequest.objects.filter(friend=friend, friend_with=friend_with).exists() or \
            FriendRequest.objects.filter(friend=friend_with, friend_with=friend).exists():
            return JsonResponse({'status': 'Friend request already exists'}, status=400)

        # Create the friend request
        FriendRequest.objects.create(friend=friend, friend_with=friend_with, is_accepted=False)
        return JsonResponse({'status': 'Friend request created'})

    return JsonResponse({'error': 'Invalid method'}, status=405)


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from homegame.models import FriendRequest

@csrf_exempt
def accept_friend_request(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        friend = data.get('friend')  # The current user (who is accepting)
        friend_with = data.get('friend_with')  # The original sender of the friend request

        try:
            # Update the existing friend request to accepted
            friend_request = FriendRequest.objects.get(friend=friend_with, friend_with=friend)
            friend_request.is_accepted = True
            friend_request.save()

            # Optionally, create the reverse entry to mark full friendship
            if not FriendRequest.objects.filter(friend=friend, friend_with=friend_with).exists():
                FriendRequest.objects.create(friend=friend, friend_with=friend_with, is_accepted=True)

            return JsonResponse({'status': 'Friend request accepted'}, status=200)
        except FriendRequest.DoesNotExist:
            return JsonResponse({'error': 'Initial friend request not found'}, status=400)

    return JsonResponse({'error': 'Invalid method'}, status=405)

class DeclineFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, friend_from):
        try:
            friend_from_user = User.objects.get(username=friend_from)
            friend_with_user = request.user

            # Logic to decline the friend request
            FriendRequest.objects.filter(sender=friend_from_user, receiver=friend_with_user).delete()

            return Response({'detail': 'Friend request declined.'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        


class TournamentRequestViewSet(ModelViewSet):
    queryset = TournamentRequest.objects.all()
    serializer_class = TournamentRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Return pending friend requests where the current user is the recipient
        return TournamentRequest.objects.filter(user_to_invite=user, is_accepted=False)

    def create(self, request, *args, **kwargs):
        sender = request.user
        print(f"Sender: {sender}")

        receiver_id = request.data.get('user_to_invite')
        print(f"Receiver ID: {receiver_id}")
        tournament_id = request.data.get('tournament_id')

        if not receiver_id:
            return Response({'detail': 'User to invite is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(id=receiver_id)
            print(f"Receiver: {receiver}")
        except User.DoesNotExist:
            print("Receiver does not exist.")
            return Response({'detail': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        if TournamentRequest.objects.filter(user=sender, user_to_invite=receiver).exists():
            print("Tournament request already exists.")
            return Response({'detail': 'Tournament request already sent.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tournament_request = TournamentRequest.objects.create(
                user=sender,
                user_to_invite=receiver,
                is_accepted=False,
                tournament_id=tournament_id
            )
            print(f"Tournament Request Created: {tournament_request}")
        except Exception as e:
            print(f"Error creating TournamentRequest: {e}")
            return Response({'detail': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Send notification
        try:
            send_tournament_request_notification(receiver.username, sender.username)
        except Exception as e:
            print(f"Error sending notification: {e}")

        serializer = self.get_serializer(tournament_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        tournament_request = self.get_object()
        if tournament_request.user_to_invite != request.user:
            return Response({'detail': 'Not authorized to accept this tournament request.'}, status=status.HTTP_403_FORBIDDEN)

        is_accepted = request.data.get('is_accepted', False)
        if is_accepted:
            tournament_request.delete()
            return Response({'detail': 'Tournament request accepted.'}, status=status.HTTP_200_OK)
        else:
            return Response({'detail': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='decline')
    def decline_request(self, request, pk=None):
        # Handle declining a friend request
        user = request.user

        try:
            tournament_request = TournamentRequest.objects.get(id=pk, user_to_invite=user, is_accepted=False)
        except TournamentRequest.DoesNotExist:
            return Response({'detail': 'Tournament request not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Delete the friend request
        tournament_request.delete()


        return Response({'detail': 'Tournament request declined.'}, status=status.HTTP_200_OK)