import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from homegame.models import ChatModel, User, ChatNotification
from channels.layers import get_channel_layer

class PersonalChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if self.user.is_anonymous:
            print("[CONNECT] Anonymous user attempted to connect. Connection rejected.")
            await self.close()
            return

        self.user_id = self.user.id

        # Get the room name from the URL
        room_name = self.scope['url_route']['kwargs']['room_name']
        user_ids = room_name.split('-')
        other_user_id = user_ids[1] if str(self.user_id) == user_ids[0] else user_ids[0]

        try:
            other_user = await database_sync_to_async(User.objects.get)(id=other_user_id)
        except User.DoesNotExist:
            print(f"[CONNECT] Other user with ID {other_user_id} does not exist.")
            await self.close()
            return

        self.room_name = '-'.join(sorted([str(self.user_id), str(other_user_id)]))
        self.room_group_name = f'chat_{self.room_name}'

        print(f"[ROOM ASSIGNED] Room name: {self.room_group_name}")

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"[CONNECT] User {self.user.username} connected to {self.room_group_name}.")

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            # Log the incoming message
            print(f"[Server Receive] WebSocket message received: {data}")

            if message_type == 'message':
                print(f"[Server Receive] Routing message to handle_chat_message: {data}")
                await self.handle_chat_message(data)  # This should call save_message
            else:
                print(f"[Server Error] Unknown message type: {message_type}")

        except Exception as e:
            print(f"[Server Error] Failed to process message: {e}")

    # Corrected indentation: method is now at the same level as 'receive'
    async def handle_chat_message(self, data):
        message = data['message']
        receiver_id = data['receiver']

        # Log the message being processed
        print(f"[handle_chat_message] Processing message: '{message}' for Receiver ID: {receiver_id}")

        # Call save_message
        await self.save_message(self.room_name, message, receiver_id)
        print(f"[handle_chat_message] Message successfully routed to save_message")

        # Send the message to the chat group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': self.user.username,
                'sender_id': self.user.id,
            }
        )

        # Send notification to recipient's notification group
        receiver_user = await database_sync_to_async(User.objects.get)(id=receiver_id)
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"user_{receiver_user.username}",
            {
                "type": "new_message_notification",
                "from_user": self.user.username,
                "message": message,
                "sender_id": self.user.id,
            }
        )
    def send_new_message_notification(to_user_id, from_user_username):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{to_user_id}',  # User-specific group
            {
                'type': 'new_message_notification',
                'from_user': from_user_username,
            }
        )
    
    @database_sync_to_async
    def save_message(self, thread_name, message, receiver_id):
        try:
            sender_user = self.user
            receiver_user = User.objects.get(id=receiver_id)

            # Log the saving process
            print(f"[save_message] Saving message from {sender_user.username} to {receiver_user.username} in thread {thread_name}")

            # Create and save the message
            chat_message = ChatModel.objects.create(
                sender=sender_user,
                receiver=receiver_user,
                message=message,
                thread_name=thread_name
            )

            # Create a notification for the receiver
            ChatNotification.objects.create(chat=chat_message, user=receiver_user)
            print(f"[save_message] Message saved: '{message}' from {sender_user.username} to {receiver_user.username} in thread {thread_name}")
        except User.DoesNotExist:
            print(f"[save_message ERROR] Receiver with ID {receiver_id} does not exist")
        except Exception as e:
            print(f"[save_message ERROR] Failed to save message: {e}")

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        sender_id = event['sender_id']

        print(f"[CHAT_MESSAGE] Sending message to WebSocket: {username} (ID: {sender_id}): {message}")

        await self.send(text_data=json.dumps({
            'type': 'MESSAGE',
            'message': message,
            'username': username,
            'sender_id': sender_id
        }))

    async def disconnect(self, code):
        print(f"[DISCONNECT] User {self.user.username} disconnected from {self.room_group_name}")

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def handle_friend_request(self, data):
        # Handle friend request logic
        message = data['message']
        sender = data['sender']

        print(f"[FRIEND_REQUEST] Friend request from {sender} with message: {message}")

        # Send the notification to the WebSocket group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'friend_request_notification',
                'message': message,
                'sender': sender,
            }
        )

    async def handle_match_invite(self, data):
        # Handle match invite logic
        message = data['message']
        sender = data['sender']

        print(f"[MATCH_INVITE] Match invite from {sender} with message: {message}")

        # Send the notification to the WebSocket group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'match_invite_notification',
                'message': message,
                'sender': sender,
            }
        )

    async def friend_request_notification(self, event):
        # Receive a friend request notification from the room group
        message = event['message']
        sender = event['sender']

        print(f"[SEND] Sending friend request to WebSocket: {message} from {sender}")

        # Send the friend request notification to the WebSocket
        await self.send(text_data=json.dumps({
            'type': 'FRIEND_REQUEST',
            'message': message,
            'sender': sender
        }))

    async def match_invite_notification(self, event):
        # Receive a match invite notification from the room group
        message = event['message']
        sender = event['sender']

        print(f"[SEND] Sending match invite to WebSocket: {message} from {sender}")

        # Send the match invite notification to the WebSocket
        await self.send(text_data=json.dumps({
            'type': 'MATCH_INVITE',
            'message': message,
            'sender': sender
        }))





class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]

        if self.user.is_anonymous:
            # Close the connection if the user is not authenticated
            await self.close()
            return

        self.group_name = f"user_{self.user.username}"
        print(f"[NOTIFICATION_CONNECT] User {self.user.username} connected to notifications.")

        # Add the user to their respective group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def receive(self, text_data):
        data = json.loads(text_data)
        print(f"[RECEIVE] Data received on WebSocket: {data}")

        notification_type = data.get('type')

        if notification_type == 'friend_request':
            print(f"[FRIEND_REQUEST] Friend request from {data['sender']}")
            # asyncio.create_task(self.fetch_notification())
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'friend_request_notification',
                    'message': data['message'],
                    'sender': data['sender'],
                }
            )
        elif notification_type == 'match_invite':
            print(f"[MATCH_INVITE] Match invite from {data['sender']}")
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'match_invite_notification',
                    'message': data['message'],
                    'sender': data['sender'],
                }
            )
        elif notification_type == 'friend_request_accepted':
            print(f"[FRIENDSHIP ACCEPTED] Friend invite accepted by  {data['sender']}")
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'friend_request_accepted',
                    'sender': data['sender'],
                }
            )

    async def friend_request_notification(self, event):
        print(f"[SEND] Sending friend request to WebSocket client: {event}")

        await self.send(text_data=json.dumps({
            'type': 'FRIEND_REQUEST',
            'message': event['message'],
            'sender': event['sender'],
        }))
        
    async def friend_request_accepted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'friend_request_accepted',
            'sender': event['sender'],
        }))


    async def match_invite_notification(self, event):
        print(f"[SEND] Sending match invite to WebSocket client: {event}")

        await self.send(text_data=json.dumps({
            'type': 'MATCH_INVITE',
            'message': event['message'],
            'sender': event['sender'],
        }))
    
    async def new_message_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'NEW_MESSAGE',
            'from_user': event['from_user'],
            'message': event['message'],
            'sender_id': event['sender_id'],
        }))


    async def disconnect(self, code):
        # Check if group_name exists before using it
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            print(f"[NOTIFICATION_DISCONNECT] User {self.user.username} disconnected from notifications.")


from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_friend_request_notification(receiver_username, sender_username):
    channel_layer = get_channel_layer()
    print(f"Sending friend request notification from {sender_username} to {receiver_username}")  # Log the notification
    async_to_sync(channel_layer.group_send)(
        f"user_{receiver_username}",  # Group name based on the receiver's username
        {
            "type": "friend_request_notification",
            "message": f"{sender_username} has sent you a friend request.",
            "sender": sender_username
        }
    )
    
def friend_request_accepted_group(receiver_username):
    channel_layer = get_channel_layer()
    print(f"friend_request_accepted_group to {receiver_username}")
    async_to_sync(channel_layer.group_send)(
        f"user_{receiver_username}",
        {
            "type": "friend_request_accepted",
            "sender": receiver_username
        }
    )

def send_tournament_request_notification(receiver_username, sender_username):
    channel_layer = get_channel_layer()
    print(f"Sending tournament request notification from {sender_username} to {receiver_username}")  # Log the notification
    async_to_sync(channel_layer.group_send)(
        f"user_{receiver_username}",  # Group name based on the receiver's username
        {
            "type": "match_invite_notification",
            "message": f"{sender_username} has sent you a tournament request.",
            "sender": sender_username
        }
    )

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class OnlineStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.room_group_name = 'online_users'

        if self.user.is_anonymous:
            logging.warning("[ONLINE_CONNECT] Anonymous user attempted to connect.")
            await self.close()
            return

        logging.info(f"[ONLINE_CONNECT] User {self.user.username} connected to OnlineStatusConsumer.")

        try:
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()

            # Notify others that the user is online
            await self.change_is_online('online')
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_online",
                    "user": self.user.username,
                }
            )
            logging.info(f"[GROUP_ADD] User {self.user.username} added to group {self.room_group_name}.")
        except Exception as e:
            logging.error(f"[ERROR] Failed to add user {self.user.username} to group {self.room_group_name}: {e}")
            await self.close()

    async def disconnect(self, close_code):
        if self.user.is_anonymous:
            logging.warning("[ONLINE_DISCONNECT] Anonymous user attempted to disconnect.")
            return

        logging.info(f"[ONLINE_DISCONNECT] User {self.user.username} disconnected from OnlineStatusConsumer.")

        try:
            await self.change_is_online('offline')
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_offline",
                    "user": self.user.username,
                }
            )
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            logging.info(f"[GROUP_DISCARD] User {self.user.username} removed from group {self.room_group_name}.")
        except Exception as e:
            logging.error(f"[ERROR] Failed to remove user {self.user.username} from group {self.room_group_name}: {e}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        connection_type = data.get('type')
        user = self.scope['user']

        if connection_type == 'open':
            logging.info(f"[RECEIVE] Received 'open' event from user {user.username}")
            await self.change_is_online('online')
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_online",
                    "user": user.username,
                }
            )
        elif connection_type == 'close':
            logging.info(f"[RECEIVE] Received 'close' event from user {user.username}")
            await self.change_is_online('offline')
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_offline",
                    "user": user.username,
                }
            )

    async def user_online(self, event):
        user = event['user']
        logging.info(f"[USER_ONLINE] Notifying WebSocket clients that user {user} is online.")
        await self.send(text_data=json.dumps({
            'type': 'USER_ONLINE',
            'user': user,
        }))

    async def user_offline(self, event):
        user = event['user']
        logging.info(f"[USER_OFFLINE] Notifying WebSocket clients that user {user} is offline.")
        await self.send(text_data=json.dumps({
            'type': 'USER_OFFLINE',
            'user': user,
        }))

    @database_sync_to_async
    def change_is_online(self, status):
        try:
            userprofile = User.objects.get(username=self.scope['user'].username)
            userprofile.is_online = (status == 'online')
            userprofile.save()
            logging.info(f"[DB_UPDATE] User {self.scope['user'].username} is now {'online' if status == 'online' else 'offline'}.")
        except User.DoesNotExist:
            logging.error(f"[DB_ERROR] User {self.scope['user'].username} does not exist in the database.")
        except Exception as e:
            logging.error(f"[DB_ERROR] Failed to update online status for user {self.scope['user'].username}: {e}")

