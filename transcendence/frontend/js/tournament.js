import { draw } from './tournament_game.js';

let tournamentSocket;

var player = {
	id : undefined,
	num : undefined,
	name : undefined,
}

var powerReady = false;

function activatePower(gameSocket, player_num) {
	gameSocket.send(JSON.stringify({
		'event': "ACTIVATE_POWER",
		'player_num': player_num,
	}))

	powerReady = false;
	document.getElementById('active-power').disabled = true;
	document.getElementById('active-power').style.backgroundColors = "red";
}

function setPowerReady() {
	// Activer le pouvoir et mettre le bouton en vert lorsqu'il est prêt
	powerReady = true;
	document.getElementById('active-power').disabled = false;
	document.getElementById('active-power').style.backgroundColor = "green";
}

export function connect_tournament(tournament) {
	if (!(window.location.hash === undefined || window.location.hash === "")) {
		tournament.name = window.location.hash.split("#")[1];
	}

	const token = localStorage.getItem('accessToken');

	tournamentSocket = new WebSocket(
		'wss://'
		+ window.location.hostname
		+ ':8443/ws/tournament/'
		+ tournament.name
		+ '/?token='
		+ token
	);
	
	tournamentSocket.onopen = function open() {
		tournamentSocket.send(JSON.stringify({
			"event": "SETUP_TOURNAMENT",
			"have_power_up": tournament.have_power_up,
			"max_player": tournament.max_player,
		}));
	};


	tournamentSocket.onmessage = function (e) {
		let data = JSON.parse(e.data);
		let event = data["event"];
		console.log(data);
		switch (event) {
			case 'SETUP_PLAYER':
				if (player.id === undefined && player.name === undefined) {
					player.id = data["player_id"];
					player.num = data["player_num"];
					player.name = data["player_name"];
				}
				break;
			case 'CREATE_MATCHES':
				tournamentSocket.send(JSON.stringify({
					"event": "CREATE_MATCHES",
				}));
				break;
			case 'MATCH_START':
				let p1_id = data["player_1"];
				let p2_id = data["player_2"];
				if (p1_id === player.id || p2_id === player.id) {
					let match_id = data["match_id"];
					set_hidden();
					document.getElementById('timer').innerHTML = data["player_1_name"] + " VS " + data["player_2_name"];
					document.getElementById('timer').style.color = "White";
					init_game(data["url_game"], match_id, data["have_power_up"]);
				}
				break;
			case 'SENDING_TOURNAMENT_ID' :
				tournament.id = data["tournament_id"]
				;
				window.location.hash = "#" + tournament.id;
				break;
			case 'ALL_MATCHS_STR' :
				var all_matchs_str = data["all_matchs_str"]
				document.getElementById("scoreboard").innerHTML = "MATCHS ORDER : \n" + all_matchs_str;
				document.getElementById("waiting_msg").innerHTML = "Tournament waiting room <br>" + "-----<br>" + all_matchs_str;
				break;
			case 'TOURNAMENT_FINISH' :
				tournamentSocket.close();
				window.location.hash = '';
				window.location.href = '/play/';
			default:
				console.error("event :" + event);
				break;
		}
	};

	tournamentSocket.onclose = function (e) {
		console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
	};

	if (tournamentSocket.readyState == WebSocket.OPEN) {
		tournamentSocket.onopen();
	}
}

var canvas;
var scaleFactor;

var p1 = {
	x : 0,
	y : 0,
	name : undefined,
	score : 0,
	height : 0,
	width : 0,
	coalition : undefined,
}

var p2 = {
	x : 0,
	y : 0,
	name : undefined,
	score : 0,
	height : 0,
	width : 0,
	coalition : undefined,
}

var ball = { x: 1400 / 2, y: 580 / 2 };
var player_num = undefined;
let gameState = 'start';
const SPEED = 580;

function send_movement(movement, player_num, gameSocket) {
	gameSocket.send(JSON.stringify({
		'event': "MOVE",
		'movement': movement,
		'player_num': player_num,
	}))
}

function set_hidden() {
    let element = document.getElementById("canvas-container");
    let element2 = document.getElementById("scoreboard");
    let hidden = element.getAttribute("hidden");
	let waiting_msg = document.getElementById("waiting_msg"); 
	let loading = document.getElementById("loading"); 

    if (hidden) {
    	element.removeAttribute("hidden");
    	element2.removeAttribute("hidden");
		waiting_msg.setAttribute("hidden", "hidden");
		loading.setAttribute("hidden", "hidden");

    } else {
		waiting_msg.removeAttribute("hidden");
		loading.removeAttribute("hidden");
		element.setAttribute("hidden", "hidden");
    }
}


function updateScores(score_1, score_2) {
	document.getElementById('player-score').textContent = score_1;
	document.getElementById('computer-score').textContent = score_2;
}

function apply_mov(player_y, player_num) {
	if (player_num == 1) {
		p1.y = player_y
	} else {
		p2.y = player_y
	}
}

function timer(gameSocket){
    var sec = 3;
    var timer = setInterval(function(){
        document.getElementById('timer').innerHTML = '' + sec;
        sec--;
        if (sec < 0) {
            clearInterval(timer);
			document.getElementById('timer').innerHTML = "";
			if (player_num == 1) {
				gameSocket.send(JSON.stringify({
					"event": "START",
				}));
			}
        }
    }, 1000);
}



function connect(gameSocket, match_id, have_power_up) {
	gameSocket.onopen = function open() {
		document.addEventListener('keydown', (e) => {
			if (e.key == 'ArrowUp') {
				send_movement('UP', player_num, gameSocket);
			}
			if (e.key == 'ArrowDown') {
				send_movement('DOWN', player_num, gameSocket);
			}
		});

		canvas = document.getElementById('canvas')
		p1.y = SPEED
		p1.x = 10
		p1.height = 100
		p1.width = 10
		p2.y = SPEED
		p2.x = 10
		gameSocket.send(JSON.stringify({
			"event": "OPEN",
			"height": "580",
			"width": "1400",
			"player_x": "0",
			"player_y": "0",
			"id" : match_id,
			"have_power_up": have_power_up,
		}));
	};

	gameSocket.onmessage = function (e) {
		let data = JSON.parse(e.data);
		let event = data["event"];
		switch (event) {
			case 'START':
				document.getElementById("scoreboard").innerHTML = '<h1>PONG</h1>\
				<div class="sousdiv">\
				<div class="team" id="player-name"></div>\
				<p class="team" id="player1-name"></p> \
					<p class="score" id="player-score">0</p> \
					<div class="tild">-</div>\
					<p class="score" id="computer-score">0</p> \
					<p class="team" id="player2-name"></p> \
					</div>\
					</div>';
				gameState = gameState == 'start' ? 'play' : 'start';
				p1.name = data.player_1_name;
				p2.name = data.player_2_name;
				p1.coalition = data.player_1_coa;
				p2.coalition = data.player_2_coa;
				document.getElementById('player1-name').textContent = p1.name;
				document.getElementById('player2-name').textContent = p2.name;
				break;
			case 'SETUP_FOR_ME':
				if (player_num === undefined) {
					player_num = data.player_num;
				}
				break;
			case 'OPEN':
				canvas.height = data.height
				canvas.width = data.width
				scaleFactor = data.scaleFactor
				ball.x = data.ballx
				ball.y = data.bally
				p1.x = data.player_1_x
				p1.y = data.player_1_y
				p2.x = data.player_2_x
				p2.y = data.player_2_y
				p1.height = data.player_height
				p1.width = data.player_width
				p2.height = data.player_height
				p2.width = data.player_width
				draw(canvas, p1, p2, scaleFactor, ball)
				break;
			case 'TIMER' :
				timer(gameSocket);
				break;
			case 'END_GAME':
				ball.x = data.ballx;
				ball.y = data.bally;
				p1.score = data['score_1'];
				p2.score = data['score_2'];
				updateScores(p1.score, p2.score);
				tournamentSocket.send(JSON.stringify({
					"event": "MATCH_END",
					"player_id": player.id,
				}));
				set_hidden();
				gameSocket.close();
				player_num = undefined;
				break;
			case 'MOVE_BALL':
				ball.x = data.ballx;
				ball.y = data.bally;
				draw(canvas, p1, p2, scaleFactor, ball)
				break;
			case 'MOVE':
				apply_mov(data.player_y, data.player_num);
				break;
			case 'UPDATE_SCORE':
				p1.score = data['score_1'];
				p2.score = data['score_2'];
				gameState = gameState == 'start' ? 'play' : 'start';
				updateScores(data['score_1'], data['score_2']);
				break;
			case 'POWER_READY':
				if (data['player_num'] == player_num)
					setPowerReady();
				break;
			case 'ACTIVATE_POWER':
				if (data['player_num'] == 1) {
					p1.height = data['player_height'];
				}
				else {
					p2.height = data['player_height'];
				}
				draw(canvas, p1, p2, scaleFactor, ball)
				break;
			default:
				console.error("event :" + event);
		}	
	};

	gameSocket.onclose = function (e) {
		console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
	};

	if (gameSocket.readyState == WebSocket.OPEN) {
		gameSocket.onopen();
	}
}

function init_game(url_game, match_id, have_power_up) {

	const token = localStorage.getItem('accessToken');

	const gameSocket = new WebSocket(
		'wss://'
		+ window.location.hostname
		+ ':8443/ws/game/'
		+ "Tournoi" + window.location.hash.split("#")[1] + "jeu" + url_game
		+ '/?token='
		+ token
	);
	document.getElementById('active-power').addEventListener('click', () => {
		if (powerReady) {
			activatePower(gameSocket, player_num);
		}
	})
	if (have_power_up === false) {
		document.getElementById('active-power').setAttribute("hidden", "hidden");
	}
	connect(gameSocket, match_id, have_power_up);
}
