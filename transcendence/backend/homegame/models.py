from django.db import models
from django.utils import timezone
from django.core.validators import FileExtensionValidator,\
	MaxValueValidator, MinValueValidator
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

ext_validator = FileExtensionValidator(['png', 'jpg'])

def validate_file_mimetype(file):
	accept = ['image/png', 'image/jpg']
	file_mime_type = magic.from_buffer(file.read(1024), mime=True)
	if file_mime_type not in accept:
		raise ValidationError("Unsupported file type")
	

def validate_url_extension(url):
    accept = ['png', 'jpg']
    ext = url.split('.')[-1].lower()
    if ext not in accept:
        raise ValidationError("Unsupported file extension. Only PNG and JPG are allowed.")

class User(AbstractUser):
    ALLIANCE = 'THE ALLIANCE'
    ASSEMBLY = 'THE ASSEMBLY'
    FEDERATION  = 'THE FEDERATION'
    ORDER = 'THE ORDER'

    COALITION_CHOICES = (
        (ALLIANCE, 'The Alliance'),
        (ASSEMBLY, 'The Assembly'),
        (FEDERATION, 'The Federation'),
        (ORDER, 'The Order'),
    )
    
    id = models.AutoField(primary_key=True)  # Use AutoField to ensure unique ID for superuser
    description = models.CharField(max_length=200, null=True, blank=True)
    pseudo = models.CharField(max_length=60, null=True, blank=True)
    image = models.URLField(validators=[validate_url_extension], blank=True, null=True)
    image_base64 = models.TextField(blank=True, null=True)  # to store the base64 string
    coalition = models.CharField(max_length=16, choices=COALITION_CHOICES)
    validation_code = models.IntegerField(null=True, blank=True)
    is_online = models.BooleanField(default=True)
    active_2FA = models.BooleanField(default=False)
    blocked_users = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='blocked_by',
        blank=True
    )

    def delete(self):
        self.image.delete()
        super().delete()

    def __str__(self):
        return self.username

    def __id__(self):
        return self.id

    def __coalition__(self) :
        return self.coalition
    
    def __pseudo__(self) :
        return self.pseudo

class Thread(models.Model):
    user1 = models.ForeignKey(User, related_name='thread_user1', on_delete=models.CASCADE)
    user2 = models.ForeignKey(User, related_name='thread_user2', on_delete=models.CASCADE)

    def __str__(self):
        return f"Thread between {self.user1.username} and {self.user2.username}"

# class ChatModel(models.Model):
#     sender = models.ForeignKey(User, related_name='sender', on_delete=models.CASCADE)
#     receiver = models.ForeignKey(User, related_name='receiver', on_delete=models.CASCADE)
#     message = models.TextField()
#     thread = models.ForeignKey(Thread, related_name='thread', on_delete=models.CASCADE)
#     timestamp = models.DateTimeField(auto_now_add=True)

# class ChatNotification(models.Model):
#     chat = models.ForeignKey(ChatModel, related_name='chat_notification', on_delete=models.CASCADE)
#     user = models.ForeignKey(User, related_name='notification_user', on_delete=models.CASCADE)
#     is_seen = models.BooleanField(default=False)

# class InviteNotification(models.Model):
#     sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invites')
#     receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_invites')
#     message = models.CharField(max_length=255)
#     is_seen = models.BooleanField(default=False)
#     timestamp = models.DateTimeField(auto_now_add=True)

class Friend(models.Model):
    friend = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='friends',
        db_column='friend'
    )
    friend_with = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='friends_with',
        db_column='friend_with'
    )
    is_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = 'Accepted' if self.is_accepted else 'Pending'
        return f"{self.friend.username} and {self.friend_with.username} - {status}"


class FriendRequest(models.Model):
    friend = models.ForeignKey(
        User,
        related_name='sent_requests',
        on_delete=models.CASCADE,
        db_column='friend'  # Specify the exact database column name
    )
    friend_with = models.ForeignKey(
        User,
        related_name='received_requests',
        on_delete=models.CASCADE,
        db_column='friend_with'  # Specify the exact database column name
    )
    is_accepted = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

class TournamentRequest(models.Model):
    user = models.ForeignKey(
        User,
        related_name='sent_requests_tournament',
        on_delete=models.CASCADE,
        db_column='user'  # Specify the exact database column name
    )
    user_to_invite = models.ForeignKey(
        User,
        related_name='received_requests_tournament',
        on_delete=models.CASCADE,
        db_column='user_to_invite'  # Specify the exact database column name
    )
    is_accepted = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    tournament_id = models.IntegerField(null=True, blank=True)


class BlackList(models.Model):
	block = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blacklist_user')
	have_block = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_user')

def validate_integer_range(value):
    if value < 2 or value > 4:
        raise ValidationError(f'{value} is not between 2 and 4')

class Tournoi(models.Model):
	name = models.CharField(max_length=100)
	is_full = models.BooleanField(default=False)
	max_player = models.PositiveIntegerField(validators=[validate_integer_range], default=2)
	have_power_up = models.BooleanField(default=False)

	def __str__(self):
		return f"Tournoi {self.name}"

class Match(models.Model):
	match_date = models.DateTimeField(default=timezone.now)
	user_1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_1')
	user_2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_2')
	winner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='won_matches', null=True, blank=True)
	tournament = models.ForeignKey(Tournoi, on_delete=models.CASCADE, related_name='matches', null=True, blank=True)

	def __str__(self):
		return f"match numero {self.id}"

class PointMarque(models.Model):
	user_shoot = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_shoot')
	user_hit = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_hit')
	HIT_ZONE = [
		('T', "Top"),
		('M', "Middle"),
		('B', "Bottom"),
	]
	hit_zone = models.CharField(max_length=1, choices=HIT_ZONE)
	id_match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='id_match')

class Conversation(models.Model):
	pass

class GroupMember(models.Model):
	user_id = models.ForeignKey(User, on_delete=models.CASCADE)
	conversation_id = models.ForeignKey(Conversation, on_delete=models.CASCADE)

class TournoiMember(models.Model):
	tournoi_id = models.ForeignKey(Tournoi, on_delete=models.CASCADE)
	user_id = models.ForeignKey(User, on_delete=models.CASCADE)

	def __str__(self):
		return f"{self.user_id.name} participe Ã  {self.tournoi_id}"
	

class ChatModel(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_chats')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_chats')
    message = models.TextField()
    thread_name = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.sender.username}: {self.message} in thread {self.thread_name}'

class ChatNotification(models.Model):
    chat = models.ForeignKey(to=ChatModel, on_delete=models.CASCADE)
    user = models.ForeignKey(to=User, on_delete=models.CASCADE)
    is_seen = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username

class InviteNotification(models.Model):
    type = models.CharField(max_length=200, null=True, blank=True)
    user = models.ForeignKey(to=User, on_delete=models.CASCADE)
    is_seen = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username