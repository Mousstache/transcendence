from rest_framework import serializers
from rest_framework import viewsets
from django.db.models import Count, Q
from homegame.models import User, Match, Friend, BlackList,FriendRequest, PointMarque,\
	Tournoi, TournoiMember, ChatModel, ChatNotification, InviteNotification, TournamentRequest \


class UserDetailSerializer(serializers.ModelSerializer):
	matches_played = serializers.SerializerMethodField()
	matches_won = serializers.SerializerMethodField()
	matches_lost = serializers.SerializerMethodField()
	winrate = serializers.SerializerMethodField()
	total_points_scored = serializers.SerializerMethodField()
	current_win_streak = serializers.SerializerMethodField()
	preferred_hit_zone = serializers.SerializerMethodField()
	vulnerability_zone = serializers.SerializerMethodField()
	blocked_users = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True
    )
	class Meta:
		model = User
		fields = [
			'id', 'first_name', 'username', 'pseudo', 'description', 'is_online',
			'coalition', 'matches_played', 'matches_won', 'matches_lost', 'winrate',
			'total_points_scored', 'current_win_streak', 'preferred_hit_zone',
			'vulnerability_zone', 'image', 'blocked_users', 'active_2FA', 'image_base64'
		]


	def get_matches_played(self, obj):
		return Match.objects.filter(Q(user_1=obj) | Q(user_2=obj)).count()

	def get_matches_won(self, obj):
		return Match.objects.filter(winner=obj).count()

	def get_matches_lost(self, obj):
		return self.get_matches_played(obj) - self.get_matches_won(obj)

	def get_winrate(self, obj):
		total_matches = self.get_matches_played(obj)
		if total_matches == 0:
			return 0.0  # Retourne un float avec deux décimales
		winrate = (self.get_matches_won(obj) / total_matches) * 100
		return round(winrate, 2)  # Limite à 2 décimales

	def get_total_points_scored(self, obj):
		return PointMarque.objects.filter(user_shoot=obj).count()

	def get_current_win_streak(self, obj):
		matches = Match.objects.filter(Q(user_1=obj) | Q(user_2=obj)).order_by('-match_date')
		streak = 0
		for match in matches:
			if match.winner == obj:
				streak += 1
			else:
				break
		return streak

	def get_preferred_hit_zone(self, obj):
		points = PointMarque.objects.filter(user_shoot=obj)
		hit_zone_counts = points.values('hit_zone').annotate(count=Count('hit_zone')).order_by('-count')
		if hit_zone_counts:
			max_count = hit_zone_counts[0]['count']
			preferred_zones = [dict(PointMarque.HIT_ZONE).get(hz['hit_zone'], hz['hit_zone']) for hz in hit_zone_counts if hz['count'] == max_count]
			return preferred_zones
		return None

	def get_vulnerability_zone(self, obj):
		points = PointMarque.objects.filter(user_hit=obj)
		hit_zone_counts = points.values('hit_zone').annotate(count=Count('hit_zone')).order_by('-count')
		if hit_zone_counts:
			max_count = hit_zone_counts[0]['count']
			vulnerability_zones = [dict(PointMarque.HIT_ZONE).get(hz['hit_zone'], hz['hit_zone']) for hz in hit_zone_counts if hz['count'] == max_count]
			return vulnerability_zones
		return None

	def update(self, instance, validated_data):
		# Met à jour uniquement les champs spécifiés
		instance.pseudo = validated_data.get('pseudo', instance.pseudo)
		instance.description = validated_data.get('description', instance.description)
		instance.coalition = validated_data.get('coalition', instance.coalition)
		instance.active_2FA = validated_data.get('active_2FA', instance.active_2FA)
		instance.save()
		return instance


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['pseudo', 'description', 'image', 'image_base64']

    def update(self, instance, validated_data):
        instance.pseudo = validated_data.get('pseudo', instance.pseudo)
        instance.description = validated_data.get('description', instance.description)
        
        # Update the image field if provided
        if 'image' in validated_data:
            instance.image = validated_data['image']
        
        # Update the image_base64 field if provided
        if 'image_base64' in validated_data:
            instance.image_base64 = validated_data['image_base64']

        instance.save()
        return instance


class UpdateCoalitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['coalition']

    def update(self, instance, validated_data):
        instance.coalition = validated_data.get('coalition', instance.coalition)
        instance.save()
        return instance


class Update2FASerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['active_2FA']

    def update(self, instance, validated_data):
        instance.active_2FA = validated_data.get('active_2FA', instance.active_2FA)
        instance.save()
        return instance


class UserListSerializer(serializers.ModelSerializer):

	class Meta:
		model = User
		fields = ['username']


class PointMarqueListSerializer(serializers.ModelSerializer):
	user_shoot = UserListSerializer()
	user_hit = UserListSerializer()
	
	class Meta:
		model = PointMarque
		fields = ['hit_zone', 'user_shoot', 'user_hit']


class MatchDetailSerializer(serializers.ModelSerializer):
	user_1 = serializers.CharField(source='user_1.username')
	user_2 = serializers.CharField(source='user_2.username')
	winner = serializers.CharField(source='winner.username', required=False, allow_null=True)
	points_marques = serializers.SerializerMethodField()

	class Meta:
		model = Match
		fields = ['id', 'match_date', 'user_1', 'user_2', 'winner', 'points_marques']

	def get_points_marques(self, obj):
		points = PointMarque.objects.filter(id_match=obj)
		return PointMarqueListSerializer(points, many=True).data

	def validate(self, data):
		user_1_username = data['user_1']['username']
		user_2_username = data['user_2']['username']
		winner_username = data.get('winner', {}).get('username')

		try:
			user_1 = User.objects.get(username=user_1_username)
			user_2 = User.objects.get(username=user_2_username)
			winner = User.objects.get(username=winner_username) if winner_username else None
		except User.DoesNotExist:
			raise serializers.ValidationError("One or both users do not exist.")

		if user_1_username == user_2_username:
			raise serializers.ValidationError("User cannot play against themselves.")

		if BlackList.objects.filter(block=user_1, have_block=user_2).exists() or \
			BlackList.objects.filter(block=user_2, have_block=user_1).exists():
			raise serializers.ValidationError("Match cannot be created due to blocking.")

		if winner and winner not in [user_1, user_2]:
			raise serializers.ValidationError("Winner must be one of the players.")

		data['user_1'] = user_1
		data['user_2'] = user_2
		data['winner'] = winner

		return data

	def create(self, validated_data):
		user_1 = validated_data.pop('user_1')
		user_2 = validated_data.pop('user_2')
		winner = validated_data.pop('winner', None)
		return Match.objects.create(user_1=user_1, user_2=user_2, winner=winner, **validated_data)


class MatchListSerializer(serializers.ModelSerializer):
	user_1 = UserListSerializer()
	user_2 = UserListSerializer()
	winner = UserListSerializer()
	score_1 = serializers.SerializerMethodField()
	score_2 = serializers.SerializerMethodField()
	preferred_hit_zone = serializers.SerializerMethodField()
	vulnerability_zone = serializers.SerializerMethodField()

	class Meta:
		model = Match
		fields = ['id', 'match_date', 'user_1', 'user_2', 'winner', 'score_1',
			'score_2', 'tournament', 'preferred_hit_zone', 'vulnerability_zone'
		]

	def get_score_1(self, obj):
		return PointMarque.objects.filter(id_match=obj, user_shoot=obj.user_1).count()

	def get_score_2(self, obj):
		return PointMarque.objects.filter(id_match=obj, user_shoot=obj.user_2).count()

	def get_preferred_hit_zone(self, obj):
		# Récupérer le joueur depuis le contexte
		player = self.context.get('player')

		if player == obj.user_1:
			points = PointMarque.objects.filter(user_shoot=obj.user_1, id_match=obj)
		elif player == obj.user_2:
			points = PointMarque.objects.filter(user_shoot=obj.user_2, id_match=obj)
		else:
			return None  # Si le joueur n'est ni user_1 ni user_2, on retourne None

		hit_zone_counts = points.values('hit_zone').annotate(count=Count('hit_zone')).order_by('-count')
		if hit_zone_counts:
			max_count = hit_zone_counts[0]['count']
			preferred_zones = [
				dict(PointMarque.HIT_ZONE).get(hz['hit_zone'], hz['hit_zone'])
				for hz in hit_zone_counts if hz['count'] == max_count
			]
			return preferred_zones
		return None

	def get_vulnerability_zone(self, obj):
		# Récupérer le joueur depuis le contexte
		player = self.context.get('player')

		if player == obj.user_1:
			points = PointMarque.objects.filter(user_hit=obj.user_1, id_match=obj)
		elif player == obj.user_2:
			points = PointMarque.objects.filter(user_hit=obj.user_2, id_match=obj)
		else:
			return None  # Si le joueur n'est ni user_1 ni user_2, on retourne None

		hit_zone_counts = points.values('hit_zone').annotate(count=Count('hit_zone')).order_by('-count')
		if hit_zone_counts:
			max_count = hit_zone_counts[0]['count']
			vulnerability_zones = [
				dict(PointMarque.HIT_ZONE).get(hz['hit_zone'], hz['hit_zone'])
				for hz in hit_zone_counts if hz['count'] == max_count
			]
			return vulnerability_zones
		return None


class PointMarqueDetailSerializer(serializers.ModelSerializer):
	user_shoot = serializers.CharField(source='user_shoot.username')
	user_hit = serializers.CharField(source='user_hit.username')
	id_match = serializers.PrimaryKeyRelatedField(queryset=Match.objects.all())

	class Meta:
		model = PointMarque
		fields = ['hit_zone', 'user_shoot', 'user_hit', 'id_match']

	def validate(self, data):
		user_shoot_username = data['user_shoot']['username']
		user_hit_username = data['user_hit']['username']
		match = data['id_match']

		try:
			user_shoot = User.objects.get(username=user_shoot_username)
			user_hit = User.objects.get(username=user_hit_username)
		except User.DoesNotExist:
			raise serializers.ValidationError("One or both users do not exist.")

		if user_shoot_username == user_hit_username:
			raise serializers.ValidationError("User cannot mark points against themselves.")

		if not Match.objects.filter(id=match.id).exists():
			raise serializers.ValidationError(f"Match with ID '{match.id}' does not exist.")

		data['user_shoot'] = user_shoot
		data['user_hit'] = user_hit

		return data

	def create(self, validated_data):
		user_shoot = validated_data.pop('user_shoot')
		user_hit = validated_data.pop('user_hit')
		return PointMarque.objects.create(user_shoot=user_shoot, user_hit=user_hit, **validated_data)


class FriendSerializer(serializers.ModelSerializer):
    friend = serializers.CharField()
    friend_with = serializers.CharField()
    is_accepted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Friend
        fields = ['friend', 'friend_with', 'is_accepted']

    def validate(self, data):
        friend_username = data['friend']
        friend_with_username = data['friend_with']

        # if friend_username == friend_with_username:
        #     raise serializers.ValidationError("You cannot add yourself as a friend.")

        try:
            friend = User.objects.get(username=friend_username)
        except User.DoesNotExist:
            raise serializers.ValidationError({"friend": f"User '{friend_username}' does not exist."})

        try:
            friend_with = User.objects.get(username=friend_with_username)
        except User.DoesNotExist:
            raise serializers.ValidationError({"friend_with": f"User '{friend_with_username}' does not exist."})

        # Check for existing blocks
        if BlackList.objects.filter(block=friend, have_block=friend_with).exists() or \
        	BlackList.objects.filter(block=friend_with, have_block=friend).exists():
            raise serializers.ValidationError("Friendship cannot be created due to blocking.")

        # Check if friend request already exists
        if Friend.objects.filter(friend=friend, friend_with=friend_with).exists():
            raise serializers.ValidationError("Friend request already sent.")

        data['friend'] = friend
        data['friend_with'] = friend_with
        return data

    def create(self, validated_data):
        return Friend.objects.create(**validated_data)


class BlackListSerializer(serializers.ModelSerializer):
	block = serializers.CharField()
	have_block = serializers.CharField()

	class Meta:
		model = BlackList
		fields = ['block', 'have_block']

	def validate(self, data):
		block_username = data['block']
		have_block_username = data['have_block']

		try:
			block = User.objects.get(username=block_username)
			have_block = User.objects.get(username=have_block_username)
		except User.DoesNotExist:
			raise serializers.ValidationError("One or both users do not exist.")

		if block_username == have_block_username:
			raise serializers.ValidationError("User cannot block themselves.")

		if BlackList.objects.filter(block=block, have_block=have_block).exists():
			raise serializers.ValidationError("Block entry already exists.")

		data['block'] = block
		data['have_block'] = have_block
		return data

	def create(self, validated_data):
		block = validated_data.pop('block')
		have_block = validated_data.pop('have_block')
		return BlackList.objects.create(block=block, have_block=have_block, **validated_data)

class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = ChatModel
        fields = ['sender_id', 'sender_username', 'message', 'thread_name', 'timestamp']


class ChatNotificationSerializer(serializers.ModelSerializer):
    chat = MessageSerializer(read_only=True)
    user = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ChatNotification
        fields = ['chat', 'user', 'is_seen']


class InviteNotificationSerializer(serializers.ModelSerializer):

    class Meta:
        model = InviteNotification
        fields = ['type', 'user', 'is_seen']

class TournoiDetailSerializer(serializers.ModelSerializer):

	class Meta:
		model = Tournoi
		fields = ['id', 'name', 'is_full', 'max_player', 'have_power_up']

# serializers.py

class FriendRequestSerializer(serializers.ModelSerializer):
    friend = serializers.ReadOnlyField(source='friend.username')
    friend_with = serializers.ReadOnlyField(source='friend_with.username')

    class Meta:
        model = FriendRequest
        fields = ['id', 'friend', 'friend_with', 'is_accepted', 'timestamp']

class TournamentRequestSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    user_to_invite = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all()
    )

    class Meta:
        model = TournamentRequest
        fields = ['id', 'user', 'user_to_invite', 'is_accepted', 'timestamp', 'tournament_id']
