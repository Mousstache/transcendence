import json
import aiohttp
import random
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
import ssl
from decouple import config

from homegame.models import Match, User

rand_seed = random.seed(5)
MAX_SPEED = 50

class Ball():
    # echange
    rally = 0

    def __init__(self, canva_height, canva_width):
        self.x = 580 / 2
        self.y = 1400 / 2
        self.speedx = 5
        self.speedy = 5

    def __str__(self):
        return f'{self.x} class Ball'


class Canvas():
    def __init__(self):
        self.height = 580
        self.width = 1400
        self.scale_factor = 1

    def __str__(self):
        return f'Canvas width: {self.width}, height: {self.height}'

class Player():
    is_ready = False
    name = 'lol'
    coalition = None
    pseudo = None
    hit_ball = 0
    is_freeze = False

    def __init__(self):
        self.height = 100
        self.width = 10
        self.x = 10
        self.y = 290 - (self.height / 2)
        self.score = 0

class GameConsumer(AsyncWebsocketConsumer):
    id = -1
    players = {}
    has_started = False
    end = False
    canva = Canvas()
    ball = Ball(canva.height, canva.width)
    player_1 = Player()
    player_2 = Player()
    have_power_up = False

    def calc_Player_Move(self, move, player_num):
        if player_num == 1:
            player = self.player_1
        else:
            player = self.player_2
        move_dist = self.canva.height * 0.05
        if move == 'DOWN':
            if (player.y + move_dist + player.height > self.canva.height):
                player.y = self.canva.height - player.height
            else :
                player.y = player.y + move_dist
        else :
            if (player.y - move_dist < 0):
                player.y = 0
            else :
                player.y = player.y - move_dist
        return player.y

    def changeDirection(self, playerPosition):
        impact = self.ball.y - playerPosition - self.player_1.height / 2 
        ratio = 100 / (self.player_1.height / 2)
        
        self.ball.speedy = round(impact * ratio / 10)

    async def send_score_update(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "event": "UPDATE_SCORE",
                "score_1": self.player_1.score, 
                "score_2": self.player_2.score,
            }
        )

    async def end_game(self, winner):
        self.end = True
        self.ball.x = self.canva.width / 2
        self.ball.y = self.canva.height / 2
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',
                'event': 'END_GAME',
                'winner': winner,
                "ballx": self.ball.x,
                "bally": self.ball.y,
                "score_1": self.player_1.score, 
                "score_2": self.player_2.score,
            }
        )

    def calc_hit_zone(self, position_ball) :
        game_height = self.canva.height
        zone_size = game_height // 3
        print("la balle tape en :" , position_ball)
        print(zone_size, ">", game_height)

        
        if (position_ball < zone_size) :
            return "T"
        elif (position_ball > zone_size and position_ball< zone_size * 2) :
            return "M"
        else :
            return "B"

    async def fetch_one_point(self, position_ball, players_scores, other_player) :
        hited_zone = self.calc_hit_zone(position_ball)
        print(hited_zone)
        async with aiohttp.ClientSession() as session:
            async with session.post("https://" + config("HOST_HOSTNAME") + ":8443/api/pointmarque/", json={
                'hit_zone' : hited_zone,
                'user_shoot' : players_scores.name,
                'user_hit' : other_player.name,
                'id_match' : self.id,
                }, 
                ssl=ssl._create_unverified_context()
                 ) as request:
                response = await request.json()
                print(response)

    async def fetch_end_game(self, winner) :
        match_db = await sync_to_async(Match.objects.get)(id=self.id)
        winner_user = await sync_to_async(User.objects.get)(username=winner.name)
        match_db.winner = winner_user
        await sync_to_async(match_db.save)()
    
    async def send_power_ready(self, player):
        player_num = 1
        if (player == self.player_2) :
            player_num = 2 
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',
                'event': 'POWER_READY',
                'player_num': player_num,
            }
        )

    async def Collide(self, player):
        if self.ball.y >= player.y and self.ball.y <= player.y + player.height:
            self.ball.speedx *= -1
            impact = (self.ball.y - (player.y + player.height / 2)) / (player.height / 2)
            self.ball.speedy += impact * 2

            if (self.ball.rally % 3 == 0):
                self.ball.speedx *= 1.5
                self.ball.speedy *= 1.5
            player.hit_ball += 1
            if (player.hit_ball >= 3 and self.have_power_up == True):
                await self.send_power_ready(player)

        else:
            if player == self.player_1:
                self.player_2.score += 1
                asyncio.create_task(self.fetch_one_point(self.ball.y, self.player_2, self.player_1))
                if self.player_2.score >= 5:
                    await self.fetch_end_game(self.player_2)
                    asyncio.create_task(self.end_game("Player 2"))
                    self.end = True
                    return
            else:
                self.player_1.score += 1
                asyncio.create_task(self.fetch_one_point(self.ball.y, self.player_1, self.player_2))
                if self.player_1.score >= 5:
                    await self.fetch_end_game(self.player_1)
                    asyncio.create_task(self.end_game("Player 1"))
                    self.end = True
                    return

            asyncio.create_task(self.send_score_update())

            self.ball.x = self.canva.width / 2
            self.ball.y = self.canva.height / 2
            direction_x = self.ball.speedx = random.choice([-1, 1])
            direction_y = self.ball.speedy = random.choice([-1, 1])

            self.ball.speedx = direction_x * max(5, abs(self.ball.speedx) * 1.2)
            self.ball.speedy = direction_y * max(5, abs(self.ball.speedy) * 1.2)

    async def calcBallMove(self):
        if self.ball.y > self.canva.height or self.ball.y < 0:
            self.ball.speedy = self.ball.speedy * -1
        if self.ball.x > self.canva.width - self.player_2.width - self.player_1.x:
            await self.Collide(self.player_2)
        elif self.ball.x < self.player_1.x + (self.player_1.width * 2):
            await self.Collide(self.player_1)

        self.ball.x += self.ball.speedx
        self.ball.y += self.ball.speedy

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "event": "MOVE_BALL",
                "ballx": self.ball.x,
                "bally": self.ball.y,
            }
        )

    async def loopball(self):
        while not self.end:
            await self.calcBallMove()
            await asyncio.sleep(0.016)  # 60 FPS equivalent

    async def send_timer(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "event": "TIMER",
            }
        )

    async def send_activate_power(self, player, player_num, coalition) :
        print("send activate_power")
        if coalition == 'THE FEDERATION':
            player.height *= 2
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "event": "ACTIVATE_POWER",
                    "player_num": player_num,
                    "player_height": player.height,
                }
            )
            await asyncio.sleep(5)
            player.height /= 2
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "event": "ACTIVATE_POWER",
                    "player_num": player_num,
                    "player_height": player.height,
                }
            )
        elif coalition == 'THE ORDER':
            self.ball.speedx *= 2
            self.ball.speedy *= 2
            await asyncio.sleep(3)  # La vitesse est doublée pendant 2 secondes
            self.ball.speedx /= 2
            self.ball.speedy /= 2
        elif coalition == 'THE ALLIANCE':
            if player_num == 1:
                # Téléportation dans le camp de player 2
                self.ball.x = self.canva.width * 0.75  # Moitié du terrain mais dans le camp adverse
            else:
                # Téléportation dans le camp de player 1
                self.ball.x = self.canva.width * 0.25

            # Position verticale aléatoire (au milieu du terrain côté adverse)
            self.ball.y = random.uniform(0, self.canva.height)
            # Si la balle va vers celui qui déclenche le pouvoir, inverser la direction

            if (player_num == 1 and self.ball.speedx > 0) or (player_num == 2 and self.ball.speedx < 0):
                self.ball.speedx *= -1  # Inverser la direction horizontale

            # Inverser la direction verticale pour un effet visuel intéressant
            self.ball.speedy *= -1
        elif coalition == 'THE ASSEMBLY':
            if player_num == 1:
                self.player_2.is_freeze = True
            else:
                self.player_1.is_freeze = True
            await asyncio.sleep(2)  # Gèle le pad pendant 2 secondes
            if player_num == 1:
                self.player_2.is_freeze = False
            else:
                self.player_1.is_freeze = False




    async def activate_power(self, player_num):
        print("activate_power")
        player = self.player_1
        if (player_num == 2) : 
            player = self.player_2
        player.hit_ball = 0
        coalition = player.coalition
        
        await self.send_activate_power(player, player_num, coalition)
    
    def setPseudo(self) :
        if (self.user.__pseudo__() == "" or self.user.__pseudo__() == None) :
            return self.user.__str__()
        return self.user.__pseudo__()

    async def connect(self):
        print("connect")
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"game_{self.room_name}"
        self.user = self.scope['user']

        print(self.scope['user'])
        
        if len(self.players) >= 2:
            print("len too much\n\n\n\n")
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        player_number = len(self.players) + 1
        self.players[self.channel_name] = player_number
        if player_number == 1:
            self.player_1.score = 0
            self.player_1.x = 10
            self.player_1.y = 290 - (self.player_1.height / 2)
            self.player_1.is_ready = True
            self.player_1.name = self.user.__str__()  # Nom classique
            self.player_1.pseudo = self.setPseudo()  # Pseudo
            self.player_1.coalition = self.user.__coalition__()
        elif player_number == 2:
            self.player_2.score = 0
            self.player_2.x = 10
            self.player_2.y = 290 - (self.player_2.height / 2)
            self.player_2.is_ready = True
            self.player_2.name = self.user.__str__()  # Nom classique
            self.player_2.pseudo = self.setPseudo()  # Pseudo
            self.player_2.coalition = self.user.__coalition__()
            if self.player_1.is_ready and self.player_2.is_ready:
                await self.send_timer()
                self.ball = Ball(self.canva.height, self.canva.width)
        await self.send(text_data=json.dumps({
            "event":"SETUP_FOR_ME",
            "player_num": player_number,
            "player_coalition": self.user.__coalition__(),
            }))

    async def start_game(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "event": "START",
                "player_1_name": self.player_1.pseudo,
                "player_2_name": self.player_2.pseudo,
                "player_1_coa": self.player_1.coalition,
                "player_2_coa": self.player_2.coalition,
            }
        )
        asyncio.create_task(self.loopball())

    async def disconnect(self, close_code):
        if self.channel_name in self.players:
            del self.players[self.channel_name]

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        event = text_data_json.get("event")
        if event == 'START' and self.has_started == False:
            print("ca start\n\n\n\n")
            self.has_started = True
            await self.start_game()
        elif event == 'MOVE':
            player_num = text_data_json.get('player_num')
            if ((player_num == 1 and not(self.player_1.is_freeze)) or (player_num and not(self.player_2.is_freeze))):
                new_value = self.calc_Player_Move(text_data_json.get('movement'), player_num)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat.message",
                        "event": "MOVE",
                        "player_num": text_data_json.get("player_num"),
                        "player_y": new_value,
                    }
                )
        elif event == 'OPEN':
            self.canva.height = int(text_data_json['height'])
            self.canva.width = int(text_data_json['width'])
            self.canva.scale_factor = self.canva.width / 1400
            self.ball.x = 1400 / 2
            self.ball.y = 580 / 2
            self.id = int(text_data_json['id'])
            self.have_power_up = bool(text_data_json['have_power_up'])
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'event': "OPEN",
                    'height': self.canva.height,
                    'width': self.canva.width,
                    'scaleFactor': (self.canva.width / 1400),
                    'ballx': self.ball.x,
                    'bally': self.ball.y,
                    'player_1_x': self.player_1.x,
                    'player_1_y': self.player_1.y,
                    'player_2_x': self.player_2.x,
                    'player_2_y': self.player_2.y,
                    "player_1_name": self.player_1.pseudo,
                    "player_2_name": self.player_2.pseudo,
                    "player_height": self.player_1.height,
                    "player_width": self.player_1.width,
                }
            )
        elif event == 'MOVE_BALL':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'event': "MOVE_BALL",
                    'ballx': text_data_json['ballx'],
                    'bally': text_data_json['bally'],
                }
            )
        elif event == 'ACTIVATE_POWER':
            asyncio.create_task(self.activate_power(text_data_json.get("player_num")))

    async def chat_message(self, event):
        if event["event"] == "MOVE":
            await self.send(text_data=json.dumps({
                "event": "MOVE",
                "player_num": event["player_num"], 
                "player_y": event["player_y"], 
            }))
        elif event["event"] == "START":
            await self.send(text_data=json.dumps({
                'event': 'START',
                "player_1_name": event["player_1_name"],
                "player_2_name": event["player_2_name"],
                "player_1_coa": event["player_1_coa"],
                "player_2_coa": event["player_2_coa"],
            }))
        elif event["event"] == "TIMER":
            await self.send(text_data=json.dumps({
                'event': 'TIMER',
            }))
        elif event["event"] == "UPDATE_SCORE":
            await self.send(text_data=json.dumps({
                'event': 'UPDATE_SCORE',
                'score_1': event['score_1'],
                'score_2': event['score_2'],
            }))
        elif event["event"] == "END_GAME":
            await self.send(text_data=json.dumps({
                'event': 'END_GAME',
                'winner': event['winner'],
                'score_1': event['score_1'],
                'score_2': event['score_2'],
            }))
        elif event["event"] == "MOVE_BALL":
            await self.send(text_data=json.dumps({
                'event': 'MOVE_BALL',
                'ballx': event['ballx'],
                'bally': event['bally'],
            }))
        elif event["event"] == "OPEN":
            await self.send(text_data=json.dumps({
                'event': 'OPEN',
                'height': event['height'],
                'width': event['width'],
                'scaleFactor': event['scaleFactor'],
                'ballx': event['ballx'],
                'bally': event['bally'],
                'player_1_x': event['player_1_x'],
                'player_1_y': event['player_1_y'],
                'player_2_x': event['player_2_x'],
                'player_2_y': event['player_2_y'],
                'player_width': event['player_width'],
                'player_height': event['player_height'],
            }))
        elif event["event"] == "POWER_ACTIVATED":
            await self.send(text_data=json.dumps({
                'event': 'POWER_ACTIVATED',
                "coalition": event["coalition"],
                "player_num": event["player_num"],
            }))
        elif event["event"] == "POWER_READY":
            await self.send(text_data=json.dumps({
                'event': 'POWER_READY',
                "player_num": event["player_num"],
            }))
        elif event["event"] == "ACTIVATE_POWER":
            await self.send(text_data=json.dumps({
                'event': 'ACTIVATE_POWER',
                "player_num": event["player_num"],
                "player_height": event["player_height"],
            }))