import aiohttp  # Assurez-vous d'ajouter aiohttp dans vos dépendances
from channels.generic.websocket import AsyncWebsocketConsumer

import time
import datetime
import asyncio
import json
import requests
from asgiref.sync import sync_to_async
from decouple import config
import ssl

from homegame.models import Tournoi

class Player():
	is_playing = False
	is_admin = False
	player_name = None
	player_id = None
	player_num = None

	def __init__(self, name, id, num):
		self.player_name = name
		self.player_id = id
		self.player_num = num

class MatchResult():

	def __init__(self):
		self.player_1_score = 0
		self.player_2_score = 0

class Match() :

	def __init__(self, player_1, player_2):
		self.id = -1
		self.p1_score = 0
		self.p2_score = 0
		self.p1 = player_1
		self.p2 = player_2
		self.has_played = False


class TournamentInfo() :

	def __init__(self, room_name, user):
		print("tournament info")
		self.id = -1
		self.participant = []
		self.matchs = []
		self.is_closed = False
		self.have_power_up = False
		self.name = room_name
		self.add_user(user)
		self.max_player = 0

	def add_user(self, user):
		self.participant.append(user)

	async def creating_matches(self):
		if len(self.matchs) != 0:
			return 
		nbr_participant = len(self.participant)
		for i in range(nbr_participant):
			for j in range(i + 1, nbr_participant):
				actual_match = Match(self.participant[i], self.participant[j]) 
				self.matchs.append(actual_match)
				async with aiohttp.ClientSession() as session:
					async with session.post("https://" + config("HOST_HOSTNAME") + ":8443/api/match/", json={
						'user_1' : self.participant[i].player_name,
						'user_2' : self.participant[j].player_name,
						'tournament' : self.id,
						},
						ssl = ssl._create_unverified_context()) as request:
						response = await request.json()
						actual_match.id = int(response['id'])
		print(len(self.matchs))

	async def send_one_match(self, tournament, match):
		group_id_name = f"game_{self.id}"
		await tournament.channel_layer.group_send(
			group_id_name,
			{
				"type": "tournament.message",
				"event": "MATCH_START",
				"url_game": self.matchs.index(match),
				"player_1": match.p1.player_id, 
				"player_2": match.p2.player_id,
				"player_1_name": match.p1.player_name, 
				"player_2_name": match.p2.player_name,
				"match_id": match.id,
				"have_power_up": self.have_power_up,
			})

	async def send_tournament_finish(self, tournament):
		group_id_name = f"game_{self.id}"
		await tournament.channel_layer.group_send(
			group_id_name,
			{
				"type": "tournament.message",
				"event": "TOURNAMENT_FINISH",
			})

	def check_played_all_matchs(self) :
		for match in self.matchs:
			if (match.has_played == False):
				return False
		return True

	def sending_all_matches(self) :
		all_matchs_str = ""
		for match in self.matchs:
			if (match.has_played == False) :
				all_matchs_str += f"{match.p1.player_name} vs {match.p2.player_name}\n"
		return all_matchs_str

	async def sending_matches(self, tournament):
		if self.check_played_all_matchs():
			await self.send_tournament_finish(tournament)
			return 
		all_matchs_str = self.sending_all_matches()
		group_id_name = f"game_{self.id}"
		await tournament.channel_layer.group_send(
			group_id_name,
			{
				"type": "tournament.message",
				"event": "ALL_MATCHS_STR",
				"all_matchs_str" : all_matchs_str,
			})
		for match in self.matchs:
			if (match.has_played == False) :
				print(f"match id {match.id}")
				print(f"match.p1 {match.p1.player_name} vs {match.p2.player_name}")
				if match.p1.is_playing == False and match.p2.is_playing == False :
					match.p1.is_playing = True
					match.p2.is_playing = True
					match.has_played = True
					await self.send_one_match(tournament, match)

	def check_max_player(self):
		return len(self.participant) + 1 <= int(self.max_player)
	
	async def start_matches(self, tournament):
		if len(self.participant) == int(self.max_player):
			await tournament.send(text_data=json.dumps(
				{"event": "CREATE_MATCHES"}))

	def player_not_playing(self, id) :
		for x in self.participant :
			if x.player_id == int(id) :
				x.is_playing = False
				return 
	
	def check_player_in_tournament(self, user_id) :
		for x in self.participant :
			if x.player_id == user_id :
				return True
		return False

class TournamentConsumer(AsyncWebsocketConsumer):
	all_tournament = []

	def get_tournament_with_name(self, room_name):
		for x in self.all_tournament:
			if room_name.isdigit():
				if x.id == int(room_name):
					return x
			if x.name == room_name:
				return x
		return None

	async def set_tournament_full(self, tournament) :
		tournament_db = await sync_to_async(Tournoi.objects.get)(id=tournament.id)
		tournament_db.is_full = True
		await sync_to_async(tournament_db.save)()

	async def connect(self):
		self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
		self.room_group_name = f"game_{self.room_name}"
		self.user = self.scope['user']

		print("connect in tournament")
		print(self.user)

		actual_tournament = self.get_tournament_with_name(self.room_name)
		size = 0
		if (actual_tournament and actual_tournament.check_player_in_tournament(self.user.__id__())) :
			return
		if actual_tournament:
			size = len(actual_tournament.participant) + 1
		await self.channel_layer.group_add(self.room_group_name, self.channel_name)
		await self.accept()


		player_tmp = Player(self.user.__str__(), self.user.__id__(), size + 1)
		if actual_tournament is None:
			actual_tournament = TournamentInfo(self.room_name, player_tmp)
			self.all_tournament.append(actual_tournament)
		else:
			player_tmp = Player(self.user.__str__(), self.user.__id__(), size) 
			if actual_tournament.check_max_player():
				actual_tournament.add_user(player_tmp)
			else:
				await self.close()
		actual_tournament.id = int(self.room_name)
		await self.send(text_data=json.dumps(
			{
				"event": "SETUP_PLAYER",
				"player_num": len(actual_tournament.participant),
				"player_name": self.user.__str__(),
				"player_id": self.user.__id__(),
			}
		))

		await actual_tournament.start_matches(self)
		if (len(actual_tournament.participant) == actual_tournament.max_player):
			await self.set_tournament_full(actual_tournament)

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
		
	async def receive(self, text_data):
		text_data_json = json.loads(text_data)
		event = text_data_json.get("event")
		print(text_data_json)
		actual_tournament = self.get_tournament_with_name(self.room_name)
		if event == 'SETUP_TOURNAMENT':
			actual_tournament.have_power_up = bool(text_data_json["have_power_up"])
			actual_tournament.max_player = int(text_data_json["max_player"])
		elif event == "INVITE_PLAYER":
			invited_user_id = text_data_json.get("invited_user_id")
			await self.channel_layer.group_send(
				f"user_{invited_user_id}",
				{
					"type": "tournament.invitation",
					"event": "INVITATION_RECEIVED",
					"tournament_id": actual_tournament.id,
					"inviter_name": self.user.__str__()
				}
			)
		elif (event == "CREATE_MATCHES"):
			await actual_tournament.creating_matches()
			await actual_tournament.sending_matches(self)
		elif (event == "MATCH_START"):
			await self.channel_layer.group_send(
				self.room_group_name,
				{
					"type": "tournament.message",
					"event": "MATCH_START",
					"url_game": text_data_json['url_game'],
					"player_1": text_data_json['player_1'],
					"player_2": text_data_json['player_2'], 
					"player_1_name": text_data_json["player_1_name"],
					"player_2_name": text_data_json["player_2_name"],
					"match_id": text_data_json["match_id"],
					"have_power_up": text_data_json["have_power_up"],
				}
			)
		elif (event == "MATCH_END"):
			actual_tournament.player_not_playing(text_data_json['player_id'])
			await actual_tournament.sending_matches(self)

	async def tournament_message(self, event):
		if event["event"] == "MATCH_START" :
			await self.send(text_data=json.dumps({
				"event": "MATCH_START",
				"url_game": event["url_game"],
				"player_1": event["player_1"],
				"player_2": event["player_2"],
				"player_1_name": event["player_1_name"],
				"player_2_name": event["player_2_name"],
				"match_id": event["match_id"],
				"have_power_up": event["have_power_up"],
			}))
		if event["event"] == "TOURNAMENT_FINISH" :
			await self.send(text_data=json.dumps({
				"event": "TOURNAMENT_FINISH",
      		}))
		if event["event"] == "SENDING_TOURNAMENT_ID" :
			await self.send(text_data=json.dumps ({
				"event" : "SENDING_TOURNAMENT_ID",
				"tournament_id": event["tournament_id"],
				"have_power_up": event["have_power_up"],
			}))
		if event["event"] == "ALL_MATCHS_STR" :
			await self.send(text_data=json.dumps ({
				"event" : "ALL_MATCHS_STR",
				"all_matchs_str": event["all_matchs_str"],
			}))

	async def tournament_invitation(self, event):
		await self.send(text_data=json.dumps({
			"event": "INVITATION_RECEIVED",
			"tournament_id": event["tournament_id"],
			"inviter_name": event["inviter_name"]
		}))