import { connect_tournament } from './tournament.js';

var tournament = {
	have_power_up : false,
	max_player : 0,
	name : undefined,
}

function setTournamentSetting(tournament) {
	const powerUpButton = document.getElementById('power-up');
	const name = document.getElementById('room-name-input');
	if (powerUpButton.classList.contains('active')) {
		tournament.have_power_up = true;
	}
	tournament.name = name.value; 
}

function create_join_button(json_data) {
	var actual = json_data;
	var t_list = document.getElementById("tournament_list");
	if (actual['is_full'] === false) {
		var t_name = actual['name'];
		var t_id = actual['id'];
		var t_powerup = actual['have_power_up'];
		var t_max_player = actual['max_player'];
		t_list.appendChild(generate_join_button(t_name, t_id, t_powerup, t_max_player))
	}
}

function generate_join_button(name, id, power_up, max_player) {
	let button = document.createElement("button");
	button.textContent = name + "	#id:" + id;
	button.id = id;
	button.className = "button-id";
	button.addEventListener('click', function() {
		tournament.have_power_up = power_up;
		tournament.name = button.id;
		tournament.max_player = max_player
		connect_tournament(tournament);
		window.location.hash = "#" + button.id;
	});
	return button
}

function selectPlayers(value) {
	tournament.max_player = value;

	// Mettre à jour les classes des boutons pour indiquer la sélection
	const buttons = document.querySelectorAll('.button-nb-player');
	buttons.forEach(button => {
	  button.classList.remove('selected');
	});

	// Ajouter la classe 'selected' au bouton cliqué
	const selectedButton = Array.from(buttons).find(button => button.textContent.includes(value));
	if (selectedButton) {
	  selectedButton.classList.add('selected');
	}
}

async function get_available_tournament() {
	const response = await fetch("https://" + window.location.hostname + ":8443/api/tournoi/");
	if (!response.ok) {
		return
	}
    const json = await response.json();
	for (let i = 0; i < json['length']; i++) {
		create_join_button(json[i]);
	}
}

async function fetch_tournament(tournament) {
	const response = await fetch('https://' + window.location.hostname + ':8443/api/tournoi/', {
		method : 'POST',
		headers : {
			'Content-Type' : 'application/json',
		},
		body : JSON.stringify ({
			name: tournament.name,
			max_player : tournament.max_player,
			have_power_up : tournament.have_power_up,
		})
	});

	if (response.ok) {
		const data = await response.json()
		console.log(data.id);
		return data.id
	} else {
		throw new Error('Failed to tournament')
	}
}

async function main_index_tournament() {
	var room = document.getElementById('room-name-input');
	var button = document.getElementById('power-up');
	var submit_button = document.getElementById('submit-tournament');
	if (!room || !button)
		return

	document.querySelector('#room-name-input').focus();
	document.querySelector('#room-name-input').onkeyup = function (e) {
		if (e.key === 'Enter') {  // enter, return
			submit_button.click();
		}
	};

	const buttons = document.querySelectorAll('.button-nb-player');
	buttons.forEach(button => {
		button.classList.remove('selected');
		button.addEventListener('click', () => {
			selectPlayers(button.innerHTML);
		});
	});

	submit_button.onclick = async function (e) {
		setTournamentSetting(tournament);
		if (tournament.max_player === 0 || tournament.name === "") {
			document.getElementById("settings-error").innerHTML = "Error missing settings";
		}
		else {
			var tournament_id = await fetch_tournament(tournament);
			tournament.name = tournament_id;
			connect_tournament(tournament);
			window.location.hash = "#" + tournament_id;
		}
	};


	// Initialiser le bouton en tant que grisé
	button.classList.add('disabled');

	// Ajouter un événement de clic au bouton
	button.addEventListener('click', function () {
		// Alterner entre l'état activé et désactivé
		if (button.classList.contains('disabled')) {
			button.classList.remove('disabled');
			button.classList.add('active');
		} else {
			button.classList.remove('active');
			button.classList.add('disabled');
		}
	});

	// requete sur l'api pour recuperez les tournois disponibles
	await get_available_tournament();
}

main_index_tournament();
