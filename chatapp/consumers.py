import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Room, Message, UserProfile, MessageReaction, ReadReceipt, TypingStatus

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope["user"]

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Set user as online
        await self.update_user_status(True)
        
        # Broadcast user's online status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'user_id': self.user.id,
                'status': 'online'
            }
        )

    async def disconnect(self, close_code):
        # Set user as offline
        await self.update_user_status(False)
        
        # Broadcast user's offline status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'user_id': self.user.id,
                'status': 'offline'
            }
        )

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')

        if message_type == 'message':
            message = data['message']
            username = data['username']
            parent_id = data.get('parent_id')
            file_url = data.get('file_url')

            # Save message to database
            saved_message = await self.save_message(username, message, parent_id, file_url)

            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': username,
                    'message_id': saved_message.id,
                    'parent_id': parent_id,
                    'file_url': file_url,
                    'timestamp': saved_message.timestamp.isoformat()
                }
            )

        elif message_type == 'typing':
            # Handle typing status
            await self.save_typing_status()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_status',
                    'user_id': self.user.id,
                    'username': self.user.username
                }
            )

        elif message_type == 'reaction':
            message_id = data['message_id']
            emoji = data['emoji']
            await self.save_reaction(message_id, emoji)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_reaction',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'emoji': emoji
                }
            )

        elif message_type == 'read_receipt':
            message_id = data['message_id']
            await self.save_read_receipt(message_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_receipt',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'username': self.user.username
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def typing_status(self, event):
        await self.send(text_data=json.dumps(event))

    async def message_reaction(self, event):
        await self.send(text_data=json.dumps(event))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_status(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def update_user_status(self, is_online):
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.is_online = is_online
        profile.last_seen = timezone.now()
        profile.save()

    @database_sync_to_async
    def save_message(self, username, message_content, parent_id=None, file_url=None):
        user = User.objects.get(username=username)
        room = Room.objects.get(name=self.room_name)
        parent_message = None
        if parent_id:
            parent_message = Message.objects.get(id=parent_id)
        
        message = Message.objects.create(
            user=user,
            room=room,
            content=message_content,
            parent_message=parent_message,
            file=file_url
        )
        return message

    @database_sync_to_async
    def save_typing_status(self):
        room = Room.objects.get(name=self.room_name)
        TypingStatus.objects.update_or_create(
            room=room,
            user=self.user,
            defaults={'timestamp': timezone.now()}
        )

    @database_sync_to_async
    def save_reaction(self, message_id, emoji):
        message = Message.objects.get(id=message_id)
        MessageReaction.objects.create(
            message=message,
            user=self.user,
            emoji=emoji
        )

    @database_sync_to_async
    def save_read_receipt(self, message_id):
        message = Message.objects.get(id=message_id)
        ReadReceipt.objects.create(
            message=message,
            user=self.user
        )
