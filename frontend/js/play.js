var canvas;
var game;
var anim;
var scaleFactor;
var powerReady = false;
var hitCount = 0;
var speedRatio = 1;
var coalition = null;
var isSlowed = true; // La balle est ralentie au début
var normalSpeedX, normalSpeedY; // Variables pour stocker la vitesse normale
var zone_goal = null;
var zone_size = null;
var zone_player = [];
var zone_computer = [];
const PLAYER_HEIGHT_RATIO = 0.17; // Hauteur du joueur relative à la hauteur du canvas
const PLAYER_WIDTH_RATIO = 0.007; // Largeur du joueur relative à la largeur du canvas
const MAX_SPEED = 50;

import {getCookie} from './token.js'

if (localStorage.getItem('coalition') === null)
	coalition = getCookie('coalition');
else
	coalition = localStorage.getItem('coalition');

const login = getCookie('login');
if (document.querySelector('#player-name'))
	document.querySelector('#player-name').textContent = login;
const opponentLogin = 'rolens';

function checkPowerReady() {
	if (hitCount >= 3) {
		powerReady = true;
		document.getElementById('activate-power').disabled = false;
		document.getElementById('activate-power').style.backgroundColor = "green";
	}
}

// Pouvoir de "The Federation": Agrandir le pad
function enlargePaddle() {
	const originalHeight = game.player.height;
	game.player.height *= 1.5; // Agrandit le pad de 50%
	console.log('Pad agrandi!');

	setTimeout(() => {
		game.player.height = originalHeight; // Rétablit la taille d'origine après 5 secondes
		console.log('Pad revenu à sa taille normale.');
	}, 5000);
}

// Pouvoir de "The Order": Doubler la vitesse de la balle
function ballAcceleration() {
	game.ball.speed.x *= 2;
	game.ball.speed.y *= 2;
	console.log('Vitesse de la balle augmenter');

	setTimeout(() => {
		game.ball.speed.x /= 2;
		game.ball.speed.y /= 2;
		console.log('Vitesse de la balle rétablie.');
	}, 1000); // L'effet dure 1 seconde
}

// Pouvoir de "The Alliance": Téléporter la balle
function teleportBall() {
	// Téléporte la balle dans le camp adverse à une position définie
	game.ball.x = canvas.width * 0.75;
	game.ball.y = Math.random() * canvas.height;

	// Si la balle allait dans la direction du joueur, elle est renvoyée dans l'autre sens
	if (game.ball.speed.x < 0)
		game.ball.speed.x *= -1; // Inverse la direction

	// Inverser l'angle de la balle
	game.ball.speed.y *= -1;
	console.log('Balle téléportée dans le camp adverse et direction inversée!');
}

// Pouvoir de "The Assembly": Freeze le pad adverse
function freezeOpponentPaddle() {
	speedRatio = 0; // Geler le pad
	console.log('Pad adverse gelé!');

	setTimeout(() => {
		speedRatio = 1; // Rétablir la vitesse après 2 secondes
		console.log('Pad adverse dégelé.');
	}, 2000); // L'effet dure 2 secondes
}

function activatePower() {
	console.log('Coalition here : ')
	console.log(coalition);
	if (powerReady) {
		console.log(`Pouvoir spécial de ${coalition} activé!`);

		switch (coalition) {
			case 'THE FEDERATION':
				enlargePaddle();
				break;
			case 'THE ALLIANCE':
				teleportBall();
				break;
			case 'THE ORDER':
				ballAcceleration();
				break;
			case 'THE ASSEMBLY':
				freezeOpponentPaddle();
				break;
			default:
				console.log('Aucune coalition sélectionnée.');
		}

		powerReady = false;
		hitCount = 0;
		document.getElementById('activate-power').disabled = true;
		document.getElementById('activate-power').style.backgroundColor = "red";
	}
}

function draw() {
	var context = canvas.getContext('2d');

	// Dessiner le terrain
	context.fillStyle = 'green';
	context.fillRect(0, 0, canvas.width, canvas.height);

	// Ligne médiane
	context.strokeStyle = 'white';
	context.beginPath();
	context.arc(canvas.width / 2, canvas.height / 2, 75 * scaleFactor, 0, Math.PI * 2, true);
	context.moveTo(canvas.width / 2, 0);
	context.lineTo(canvas.width / 2, canvas.height);
	context.stroke();

	// Détails du terrain
	drawFieldDetails(context);

	// Définir la couleur du pad du joueur en fonction de sa coalition
	switch (coalition) {
		case 'THE ALLIANCE':
			context.fillStyle = '#32CD32';
			break;
		case 'THE FEDERATION':
			context.fillStyle = 'blue';
			break;
		case 'THE ORDER':
			context.fillStyle = 'orange';
			break;
		case 'THE ASSEMBLY':
			context.fillStyle = 'violet';
			break;
		default:
			context.fillStyle = 'white'; // Couleur par défaut si aucune coalition n'est sélectionnée
	}

	// Dessiner le pad du joueur
	context.fillRect(10, game.player.y, game.player.width, game.player.height);

	// Couleur blanche pour le pad de l'adversaire
	context.fillStyle = 'white';
	context.fillRect(canvas.width - game.computer.width - 10, game.computer.y, game.computer.width, game.computer.height);

	// Balle
	context.beginPath();
	context.fillStyle = 'white';
	context.arc(game.ball.x, game.ball.y, 8, 0, Math.PI * 2, false);
	context.fill();
}

function drawFieldDetails(context) {
	context.strokeStyle = 'white';

	// Zones de pénalty
	drawCircle(context, 75 * scaleFactor, canvas.height / 2, 5);
	drawCircle(context, canvas.width - 75 * scaleFactor, canvas.height / 2, 5);

	// Corners
	drawCircle(context, 0, 0, 50);
	drawCircle(context, 0, canvas.height, 50);
	drawCircle(context, canvas.width, canvas.height, 50);
	drawCircle(context, canvas.width, 0, 50);

	// Lignes des zones de pénalty
	let penaltyBoxHeight = canvas.height / 2 - 100 * scaleFactor;
	let penaltyBoxTop = canvas.height / 2 - 100 * scaleFactor;
	let penaltyBoxBottom = canvas.height / 2 + 100 * scaleFactor;

	drawBoxLines(context, 0, penaltyBoxTop, 150 * scaleFactor, penaltyBoxBottom);
	drawBoxLines(context, canvas.width - 150 * scaleFactor, penaltyBoxTop, canvas.width, penaltyBoxBottom);

	context.beginPath();
	context.moveTo(canvas.width - 150 * scaleFactor, penaltyBoxTop);
	context.lineTo(canvas.width - 150 * scaleFactor, penaltyBoxBottom);
	context.stroke();
}

function drawCircle(context, x, y, radius) {
	context.beginPath();
	context.arc(x, y, radius * scaleFactor, 0, Math.PI * 2, true);
	context.stroke();
}

function drawBoxLines(context, x1, y1, x2, y2) {
	context.beginPath();
	context.moveTo(x1, y2);
	context.lineTo(x2, y2);
	context.moveTo(x2, y1);
	context.lineTo(x1, y1);
	context.moveTo(x2, y2);
	context.lineTo(x2, y1);
	context.stroke();
}

function changeDirection(playerPosition) {
	var impact = game.ball.y - playerPosition - game.player.height / 2;
	var ratio = 100 / (game.player.height / 2);

	// Obtenir une valeur entre 0 et 10
	game.ball.speed.y = Math.round(impact * ratio / 10);
}

function playerMove(event) {
	if (event.type === 'mousemove') {
		var canvasLocation = canvas.getBoundingClientRect();
		var mouseLocation = event.clientY - canvasLocation.y;

		if (mouseLocation < game.player.height / 2) {
			game.player.y = 0;
		} else if (mouseLocation > canvas.height - game.player.height / 2) {
			game.player.y = canvas.height - game.player.height;
		} else {
			game.player.y = mouseLocation - game.player.height / 2;
		}
	} else if (event.type === 'keydown') {
		var key = event.key;

		if (key === 'ArrowUp') {
			game.player.y -= 20;
			if (game.player.y < 0) game.player.y = 0;
		} else if (key === 'ArrowDown') {
			game.player.y += 20;
			if (game.player.y > 580 - game.player.height) game.player.y = 580 - game.player.height;
		}
	}
}

function smoothMovePad() {
    if (Math.abs(game.player.y - game.player.targetY) > 1) {
        game.player.y += (game.player.targetY - game.player.y) / game.player.speed;
    }
}

function computerMove() {

	// if (Math.abs((Math.round(game.ball.x))) != 0)
	//     return;
	// piste pour reduire frequence calcul
	// augmenter constance pour reduire difficulte
	if (speedRatio === 1) {
		if ((game.ball.y - (game.computer.y + (game.computer.height / 2))) > 0) {
			game.computer.y += 7;
			return;
		}
		if ((game.ball.y - (game.computer.y + (game.computer.height / 2))) < 0)
			game.computer.y -= 7;
	}
}

function zone() {
	zone_size = 580 / 3;

	if (game.ball.y < zone_size) {
        return "T"; // Top zone
    } else if (game.ball.y > zone_size && game.ball.y < zone_size * 2) {
        return "M"; // Middle zone
    } else {
        return "B"; // Bottom zone
    }
}

function collide(player) {
	// Vérifie si la balle est en dehors des limites verticales du joueur (cas où il y a un but)
	if (game.ball.y < player.y || game.ball.y > player.y + game.player.height) {
		zone_goal = zone();
		reset();

		if (player == game.player) {
			zone_computer.push(zone_goal);
			game.computer.score++;
			document.querySelector('#computer-score').textContent = game.computer.score;
		} else {
			zone_player.push(zone_goal);
			game.player.score++;
			document.querySelector('#player-score').textContent = game.player.score;
		}

		// Si l'un des joueurs atteint un score de 5, on arrête
		if (game.player.score >= 5 || game.computer.score >= 5) {
			return;
		}
	} else {
		// Inverser la direction de la balle en X (collision horizontale)
		game.ball.speed.x *= -1;

		// Rétablir la vitesse normale si la balle était ralentie
		if (isSlowed) {
			// Assurez-vous que la direction (positive ou négative) soit correcte lors du rétablissement de la vitesse
			game.ball.speed.x = (game.ball.speed.x < 0 ? -1 : 1) * Math.abs(normalSpeedX);
			game.ball.speed.y = (game.ball.speed.y < 0 ? -1 : 1) * Math.abs(normalSpeedY);
			isSlowed = false; // On arrête le mode ralenti après la première touche
		}

		// Gérer le changement de direction basé sur la position du joueur touché
		changeDirection(player.y);

		// Si c'est le joueur qui touche la balle, on compte le nombre de coups pour des fonctionnalités supplémentaires
		if (player == game.player) {
			hitCount++;
			checkPowerReady();
		}
	}
}

function ballMove() {
	if (game.ball.y > canvas.height || game.ball.y < 0) {
		game.ball.speed.y *= -1;
	}

	if (game.ball.x > canvas.width - game.player.width - 10) {
		collide(game.computer);
	} else if (game.ball.x < game.player.width + 10) {
		collide(game.player);
	}

	game.ball.x += game.ball.speed.x;
	game.ball.y += game.ball.speed.y;
}

async function play() {
	draw();

	smoothMovePad();
	computerMove();
	ballMove();

	if (game.player.score >= 5 || game.computer.score >= 5) {
		await stop();
		return;
	}

	anim = requestAnimationFrame(play);
}

function reset() {
	if (canvas) {
		scaleFactor = canvas.width / 1400; // Largeur de base est de 1400
		game.player.width = canvas.width * PLAYER_WIDTH_RATIO;
		game.player.height = canvas.height * PLAYER_HEIGHT_RATIO;
		game.computer.width = game.player.width;
		game.computer.height = game.player.height;

		game.ball.r = 5 * scaleFactor;

		game.ball.x = canvas.width / 2;
		game.ball.y = canvas.height / 2;
		game.player.y = canvas.height / 2 - game.player.height / 2;
		game.computer.y = canvas.height / 2 - game.computer.height / 2;

		// normalSpeedX = -15 * scaleFactor;
		// normalSpeedY = (Math.random() * 3 + 1) * scaleFactor;

		// Direction et vitesse aléatoire
        let directionX = Math.random() < 0.5 ? -1 : 1;
        let directionY = Math.random() < 0.5 ? -1 : 1;

        normalSpeedX = 15 * scaleFactor * directionX; // Vitesses proportionnelles à l'échelle
        normalSpeedY = (Math.random() * 3 + 1) * scaleFactor * directionY;


		game.ball.speed.x = normalSpeedX / 2;
		game.ball.speed.y = normalSpeedY / 2;

		isSlowed = true;
	}
}

// async function stop() {
// 	cancelAnimationFrame(anim);

// 	reset();

// 	game.ball.speed.x = 0;
// 	game.ball.speed.y = 0;

// 	game.ball.x = canvas.width / 2;
// 	game.ball.y = canvas.height / 2;

// 	let score_j1 = game.player.score;
// 	let score_j2 = game.computer.score;

// 	game.computer.score = 0;
// 	game.player.score = 0;

// 	document.querySelector('#computer-score').textContent = score_j2;
// 	document.querySelector('#player-score').textContent = score_j1;

// 	draw();

// 	document.getElementById('stop-game').disabled = true;

// 	if (score_j1 >= 5 || score_j2 >= 5)
// 		await fetch_to_api(score_j1, score_j2);
// }

async function stop() {
	cancelAnimationFrame(anim);

	reset();

	game.ball.speed.x = 0;
	game.ball.speed.y = 0;

	game.ball.x = canvas.width / 2;
	game.ball.y = canvas.height / 2;

	let score_j1 = game.player.score;
	let score_j2 = game.computer.score;

	game.computer.score = 0;
	game.player.score = 0;

	document.querySelector('#computer-score').textContent = score_j2;
	document.querySelector('#player-score').textContent = score_j1;

	draw();

	document.getElementById('stop-game').disabled = true;

	let winner = null;

	// Identifier le gagnant
	if (score_j1 > score_j2) {
		winner = login;
	} else {
		winner = opponentLogin;
	}

	// Enregistrer les résultats après l'animation
	if (score_j1 >= 5 || score_j2 >= 5)
		await fetch_to_api(score_j1, score_j2);
	// Lancer l'animation de fin
	await displayWinnerAnimation(winner);
}

async function displayWinnerAnimation(winner) {
	return new Promise((resolve) => {
		// Obtenir le contexte du canvas
		const context = canvas.getContext('2d');

		let opacity = 0;
		const interval = setInterval(() => {
			// Effacer le canvas
			context.clearRect(0, 0, canvas.width, canvas.height);

			// Dessiner le texte du gagnant
			context.font = "bold 60px Arial";
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillStyle = `rgba(255, 255, 255, ${opacity})`; // Augmenter l'opacité progressivement
			context.fillText(`${winner} Wins!`, canvas.width / 2, canvas.height / 2);

			opacity += 0.02;

			// Arrêter l'animation lorsqu'elle est complètement visible
			if (opacity >= 1) {
				clearInterval(interval);
				setTimeout(() => {
					// Attendre un moment avant de terminer l'animation
					resolve();
				}, 2000); // Pause de 2 secondes après l'affichage complet
			}
		}, 50); // Rafraîchir l'animation toutes les 50 ms
		window.location.href = 'https://' + window.location.hostname + ':8443/play/';
	});
}

document.addEventListener('DOMContentLoaded', function () {
	canvas = document.getElementById('canvas');
	game = {
		player: {
			score: 0,
			width: 0,
			height: 0,
		},
		computer: {
			score: 0,
			speedRatio: 1,
			width: 0,
			height: 0,
		},
		ball: {
			speed: {}
		}
	};

	reset();

	if (canvas) {
		addEventListener('mousemove', playerMove);
	}

	if (document.querySelector('#start-game') && document.querySelector('#stop-game')) {
		document.querySelector('#start-game').addEventListener('click', play);
		document.querySelector('#stop-game').addEventListener('click', stop);
	}

	window.addEventListener('resize', reset); // Réinitialiser le jeu lors du redimensionnement de la fenêtre

	document.addEventListener('keydown', playerMove); // Ajouter le gestionnaire d'événements pour les touches du clavier
});

async function fetch_to_api(score_j1, score_j2) {
	let winner = null;

	if (score_j1 > score_j2)
		winner = login
	else
		winner = opponentLogin

	try {
		const match = await fetch('https://' + window.location.hostname + ':8443/api/match/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				user_1: login,
				user_2: opponentLogin,
				winner: winner,
			})
		});
		if (!match.ok) {
			throw new Error(`HTTP error for match! Status: ${match.status}`);
		}

		const data = await match.json(); // Récupérer les données de la réponse
		const matchId = data.id;

		for (let i = 0; i < score_j1; i++) {
			const joueur1 = await fetch('https://' + window.location.hostname + ':8443/api/pointmarque/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					hit_zone: zone_player[i],
					user_shoot: login,
					user_hit: opponentLogin,
					id_match: matchId,
				})
			});

			if (!joueur1.ok) {
				throw new Error(`HTTP error for a point scored! Status: ${joueur1.status}`);
			}
		}

		for (let j = 0; j < score_j2; j++) {
			const joueur2 = await fetch('https://' + window.location.hostname + ':8443/api/pointmarque/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					hit_zone: zone_computer[j],
					user_shoot: opponentLogin,
					user_hit: login,
					id_match: matchId,
				})
			});

			if (!joueur2.ok) {
				throw new Error(`HTTP error for a point scored! Status: ${joueur2.status}`);
			}
		}
	} catch (error) {
		console.error('Error saving match info. ', error);
	}
}

function main_play_solo() {
	if (!document.getElementById('activate-power')) {
		return;
	}
	document.getElementById('activate-power').addEventListener('click', activatePower);

	// Ajouter un événement pour détecter l'appui sur la touche 'E'
	document.addEventListener('keydown', function (event) {
		if (event.key === 'e' || event.key === 'E') {
			activatePower();
		}
	});
}

main_play_solo();
