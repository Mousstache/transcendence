function get_paddle_color(player_coalition) {
	switch (player_coalition) {
		case 'THE ORDER' :
			return 'coral';
		case 'THE ASSEMBLY' :
			return 'mediumpurple';
		case 'THE FEDERATION' :
			return 'cornflowerblue';
		case 'THE ALLIANCE' :
			return 'limegreen'
		default :
			return undefined
	}
}

function draw_paddle(context, canvas, player, num) {
	let pad_color = get_paddle_color(player.coalition)
	context.fillStyle = pad_color;
	if (num == 1) {
		context.fillRect(player.x, player.y, player.width, player.height)	
	}
	else {
		context.fillRect(canvas.width - player.x - player.width, player.y, player.width, player.height);
	}
}

function draw_grass(canvas, context) {
	const size = canvas.width / 7;

	context.fillStyle = 'green';
	context.fillRect(0, 0, size, canvas.height);
	context.fillStyle = 'yellowgreen';
	context.fillRect(size, 0, size, canvas.height);
	context.fillStyle = 'green';
	context.fillRect(size * 2, 0, size, canvas.height);
	context.fillStyle = 'yellowgreen';
	context.fillRect(size * 3, 0, size, canvas.height);
	context.fillStyle = 'green';
	context.fillRect(size * 4, 0, size, canvas.height);
	context.fillStyle = 'yellowgreen';
	context.fillRect(size * 5, 0, size, canvas.height);
	context.fillStyle = 'green';
	context.fillRect(size * 6, 0, size, canvas.height);
}

export function draw(canvas, p1, p2, scaleFactor, ball) {
	var context = canvas.getContext('2d');

	// Dessiner le terrain
	draw_grass(canvas, context);

	// Ligne médiane
	context.strokeStyle = 'white';
	context.beginPath();
	context.arc(canvas.width / 2, canvas.height / 2, 75 * scaleFactor, 0, Math.PI * 2, true);
	context.moveTo(canvas.width / 2, 0);
	context.lineTo(canvas.width / 2, canvas.height);
	context.stroke();

	// Détails du terrain
	drawFieldDetails(context, scaleFactor, canvas);

	// Joueurs
	draw_paddle(context, canvas, p1, 1);
	draw_paddle(context, canvas, p2, 2);

	// Balle
	context.beginPath();
	context.fillStyle = 'white';
	context.arc(ball.x, ball.y, 10 * scaleFactor, 0, Math.PI * 2, false);
	context.fill();
}

function drawFieldDetails(context, scaleFactor, canvas) {
	context.strokeStyle = 'white';

	// Zones de pénalty
	drawCircle(context, 75 * scaleFactor, 300 * scaleFactor, 5);
	drawCircle(context, (canvas.width - 75 * scaleFactor), 300 * scaleFactor, 5);

	// Corners
	drawCircle(context, 0, 0, 50);
	drawCircle(context, 0, canvas.height, 50);
	drawCircle(context, canvas.width, canvas.height, 50);
	drawCircle(context, canvas.width, 0, 50);

	// Lignes des zones de pénalty
	drawBoxLines(context, 0, 200 * scaleFactor, 150 * scaleFactor, 400 * scaleFactor);
	drawBoxLines(context, canvas.width - 150 * scaleFactor, 200 * scaleFactor, canvas.width, 400 * scaleFactor);
}

function drawCircle(context, x, y, radius, scaleFactor) {
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
	context.moveTo(x1, y1);
	context.lineTo(x1, y2);
	context.stroke();
}

