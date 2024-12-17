import { initializeSettingsPage } from './settings.js'; // Adjust the path as needed
import { getAccessToken } from './token.js';
import { getCookie } from './token.js';
import {activate_2fa} from './settings.js';

const routes = [
	{
		path: '/',
		callback: () => {
			document.getElementById('app').innerHTML = generateIndexPage();
			document.getElementById('nav').style.visibility = 'hidden';
		}
	},
	{
		path: '/about/',
		callback: () => {
			document.getElementById('app').innerHTML = generateAboutPage();
		}
	},
	{
		path: '/home/',
		callback: () => {
			getAccessToken();
			fetchLoggedInUserID();
			document.getElementById('app').innerHTML = generateHomePage();
		}
	},
	{
		path: '/play/',
		callback: () => {
			document.getElementById('app').innerHTML = generatePlayPage();
		}
	},
	{
		path: '/profil/',
		callback: () => {
			document.getElementById('app').innerHTML = generateProfilPage();
		}
	},
	{
        path: '/settings/',
        callback: () => {
            document.getElementById('app').innerHTML = generateSettingsPage();
			initializeSettingsPage(); // Add this line
			activate_2fa();
        }
    },
	{
		path: '/play/solo/',
		callback: () => {
			document.getElementById('app').innerHTML = generatePlaySoloPage();
			document.getElementById('activate-power').style.backgroundColor = "red";

			// Démarrer le jeu et desactive le bouton demarrer
			document.getElementById('start-game').addEventListener('click', () => {
				document.getElementById('start-game').disabled = true;
			});
		}
	},
	{
		path: '/play/solo',
		callback: () => {
			document.getElementById('app').innerHTML = generatePlaySoloPage();
			document.getElementById('activate-power').style.backgroundColor = "red";

			// Démarrer le jeu et desactive le bouton demarrer
			document.getElementById('start-game').addEventListener('click', () => {
				document.getElementById('start-game').disabled = true;
			});
		}
	},
	{
		path: '/play/tournament/',
		callback: () => {
			document.getElementById('app').innerHTML = generateTournamentPage();
		}
	},
	{
		path: '/play/tournament',
		callback: () => {
			document.getElementById('app').innerHTML = generateTournamentPage();
		}
	},
	{
		path: '/validate_code/',
		callback: () => {
            console.log("stp wsh")
			document.getElementById('app').innerHTML = generateValidate();
            main_validate_code()
		}
	},
    {
		path: '/consult_profil/',
		callback: () => {
			document.getElementById('app').innerHTML = generateConsultProfilPage();
			document.getElementById('nav').style.visibility = 'hidden';
		}
	},
];

function main_validate_code() {
    if (document.getElementById('validation-form')) {
        console.log("IUWREH9W8GQRHGIG");

        document.getElementById('validation-form').addEventListener('submit', async function(event) {
            event.preventDefault(); // Empêche la soumission par défaut du formulaire
            const log_cookie = getCookie("login");
            console.log(log_cookie);
            const validationCode = document.getElementById('validation_code').value;
            try {
                console.log("je tente de POST")
                const response = await fetch('https://' + window.location.hostname + ':8443/api/validate_code/' + log_cookie + "/" + validationCode + "/", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: {
                        "validation_code" : validationCode
                    }
                });
                const data = await response.json();
                
                if (response.ok) {
                    // Redirige vers la page d'accueil
                    window.location.href = "https://localhost:8443/home/";
                } else {
                    // Affiche le message d'erreur
                    alert(data.error || "Erreur lors de la validation du code.");
                }
            } catch (error) {
                console.dir(error)
                // console.error('Erreur lors de la soumission du formulaire :', error);
            }
        });
    }
}

class Router {
	constructor(routes) {
		this.routes = routes;
		this._loadInitialRoute();
	}

	_getCurrentURL() {
		return window.location.pathname;
	}

	_matchURLToRoute(url) {
		return this.routes.find(route => route.path === url);
	}

	loadRoute(url) {
		const matchRoute = this._matchURLToRoute(url);
		if (!matchRoute) {
			console.error('Route not found');
			return;
		}
		matchRoute.callback();
	}

	_loadInitialRoute() {
		const path = this._getCurrentURL();
		this.loadRoute(path);
	}

	navigateTo(path) {
		window.history.pushState({}, '', path);
		this.loadRoute(path);
	}
}

const router = new Router(routes);

function navigateTo(path) {
	router.navigateTo(path);
}

window.addEventListener("hashchange", function () {
	document.getElementById('app').innerHTML = generateTournamentPage();
});

function generateIndexPage() {
	return ' <button id="Skip">Skip</button>\
	<canvas></canvas>\
    <input type="hidden" id="platformImagePath" value="../images/index/bottomplatform.jpg">\
    <input type="hidden" id="backgroundImagePath" value="../images/index/background/1.png">\
    <input type="hidden" id="backgroundImage2Path" value="../images/index/background/2.png">\
    <input type="hidden" id="backgroundImage3Path" value="../images/index/background/3.png">\
    <input type="hidden" id="backgroundImage4Path" value="../images/index/background/4.png">\
    <input type="hidden" id="backgroundImage5Path" value="../images/index/background/5.png">\
    <input type="hidden" id="vigilImagePath" value="../images/index/secu.jpg">\
    <input type="hidden" id="schoolImagePath" value="../images/index/asset_school.jpg">\
    <input type="hidden" id="characterImageidlerightPath" value="../images/index/character/idleright.png">\
    <input type="hidden" id="characterImageidleleftPath" value="../images/index/character/idleleft.png">\
    <input type="hidden" id="characterImagejumpleftPath" value="../images/index/character/jumpleft.png">\
    <input type="hidden" id="characterImagejumprightPath" value="../images/index/character/jumpright.png">\
    <input type="hidden" id="characterImagerunleftPath" value="../images/index/character/runleft.png">\
    <input type="hidden" id="characterImagerunrightPath" value="../images/index/character/runright.png">\
    <input type="hidden" id="coinImagePath" value="../images/index/MonedaD2.png">\
    <input type="hidden" id="floatingPlatformImagePath" value="../images/index/floatingPlatform.png">\
    <input type="hidden" id="coinIconImagePath" value="../images/index/coinIcon.png">\
    <input type="hidden" id="priceBubbleImagePath" value="../images/index/bubble/pricebubble.png">\
    <input type="hidden" id="thumbsupBubbleImagePath" value="../images/index/bubble/thumbsupbubble.png">\
	<link rel="stylesheet" href="../css/index.css">';
}

function generateValidate() {
	return `
    <div class="body">\
    <div class="container_valid">\
        <h1>Validez votre Code</h1>\
        <form id="validation-form" method="POST">\
            <div class="form-group_valid">\
                <label class="label-validate" for="validation_code">\
                    <i class="fas fa-key"></i> Entrez le code de validation :\
                </label>\
                <input class="input-validate"\
                    type="text"\
                    id="validation_code"\
                    name="validation_code"\
                    placeholder="Code à 6 chiffres"\
                    required\
                />\
            </div>\
            <button class="button-validate" type="submit">\
                <i class="fas fa-check-circle"></i> Valider\
            </button>\
        </form>\
    </div>\
    </div>`;
}


function generateHomePage() {
	return '\
	<link rel="stylesheet" href="../css/home.css">\
    <div class="menu">\
		<nav class="nav">\
			<a href="/play/">Play</a>\
		</nav>\
		<nav class="nav">\
			<a href="/profil/">Profile</a>\
            </nav>\
		<nav class="nav">\
			<a href="/about/">About</a>\
		</nav>\
        <nav class="nav">\
			<a href="/settings/">Settings</a>\
		</nav>\
		<nav class="nav">\
			<a href="/">Leave</a>\
		</nav>\
    </div>\
</body>';
}

function generatePlaySoloPage() {
	return '\
	<body class="jeu">\
	<main role="main">\
	<div class="scoreboard-container">\
	<h1>PONG</h1>\
	<div class="sousdiv">\
	 <div class="team" id="player-name"></div>\
        <div class="score" id="player-score">0</div>\
		<div class="tild">-</div>\
        <div class="score" id="computer-score">0</div>\
        <div class="team">Rolens</div>\
		</div>\
        </div>\
	<ul class="control-buttons" >\
	<li>\
	<button id="start-game">Demarrer</button>\
	<i class="fa-solid fa-repeat"></i>\
	</li>\
	<li>\
	<button id="stop-game">Arreter</button>\
	</li>\
	<li>\
	<button id="activate-power" disabled>Activer Pouvoir</button>\
	</li>\
	</ul>\
	<div class="canvas-container">\
	<canvas id="canvas" width="1400" height="580"></canvas>\
	</div>\
	</main>\
	<link rel="stylesheet" href="../css/play.css">\
</body>';
}

function generatePlayPage() {
	return '\
		<div class="row" id="play-row"> \
			<nav>\
				<a href="/play/solo/" id="solo-mode">Play Solo Mode</a>\
			</nav>\
		</div>\
		<div class="row" id="play-row">\
			<div class="col-sm">\
				<p class="p-play">Create a Tournament</p>\
				<input id="room-name-input" type="text" size="64" placeholder="TOURNAMENT NAME"><br>\
				<p class="p-play" id="max-player-text">MAX PLAYERS :</p>\
				<div id="button-max-player-group"> \
					<button class="button-nb-player">2</button>\
					<button class="button-nb-player">3</button>\
				</div>\
				<div class="button-group">\
                    <button class="button-id" id="power-up">POWER_UP</button>\
				    <button class="button-id" id="submit-tournament">submit-tournament</button>\
					<p class="p-play" id="settings-error"></p>\
                    </div>\
			</div>\
			<div class="col-sm">\
				<div id="tournament_list">Tournament List</div>\
			</div>\
	<link rel="stylesheet" href="../css/tournament.css">\
	';
}

function generateTournamentPage() {
	return '\
		<link rel="stylesheet" href="css/waiting.css">\
		<main role="main">\
			<div class="scoreboard-container" id="scoreboard" hidden="hidden">\
			<h1>PONG</h1>\
			<div class="sousdiv">\
			<div class="team" id="player-name"></div>\
			<p class="team" id="player1-name"></p> \
				<p class="score" id="player-score">0</p> \
				<div class="tild">-</div>\
				<p class="score" id="computer-score">0</p> \
				<p class="team" id="player2-name"></p> \
				</div>\
				</div>\
			<div class="canvas-container" id="canvas-container" hidden="hidden"> \
				<div class="wesh">\
				</div> \
                <button id="active-power">Pouvoir</button>\
				<canvas id="canvas" width="1400" height="580"></canvas> \
				<p id="timer">3</p> \
			</div> \
		</main> \
		<div id="tournament-result" style="display:none;"></div>\
		<h1 id="waiting_msg">Tournament waiting room</h1> \
        <div class="loading" id="loading">\
            <div class="loading-box">\
                <div class="WH color l1"></div>\
                <div class="ball color"></div>\
                <div class="WH color l2"></div>\
		    </div>\
	    </div>\
	';
}

function generateAboutPage() {
	return '\
	<div id="app">\
        <h1>About SIUUUUUUUUU</h1>\
		<img src="../images/notre_mur.png" alt="" id="rotating-image">\
    </div>\
    <div class="social-buttons">\
        <a href="https://github.com/Mousstache" class="social-button github">\
            <svg class="cf-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 0 19 19">\
                <path d="M9.464 17.178a4.506 4.506 0 0 1-2.013.317 4.29 4.29 0 0 1-2.007-.317.746.746 0 0 1-.277-.587c0-.22-.008-.798-.012-1.567-2.564.557-3.105-1.236-3.105-1.236a2.44 2.44 0 0 0-1.024-1.348c-.836-.572.063-.56.063-.56a1.937 1.937 0 0 1 1.412.95 1.962 1.962 0 0 0 2.682.765 1.971 1.971 0 0 1 .586-1.233c-2.046-.232-4.198-1.023-4.198-4.554a3.566 3.566 0 0 1 .948-2.474 3.313 3.313 0 0 1 .091-2.438s.773-.248 2.534.945a8.727 8.727 0 0 1 4.615 0c1.76-1.193 2.532-.945 2.532-.945a3.31 3.31 0 0 1 .092 2.438 3.562 3.562 0 0 1 .947 2.474c0 3.54-2.155 4.32-4.208 4.548a2.195 2.195 0 0 1 .625 1.706c0 1.232-.011 2.227-.011 2.529a.694.694 0 0 1-.272.587z"></path>\
            </svg>\
        </a>\
        <a href="https://github.com/mvachera" class="social-button linkedin">\
            <svg class="cf-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 0 19 19">\
                <path d="M9.464 17.178a4.506 4.506 0 0 1-2.013.317 4.29 4.29 0 0 1-2.007-.317.746.746 0 0 1-.277-.587c0-.22-.008-.798-.012-1.567-2.564.557-3.105-1.236-3.105-1.236a2.44 2.44 0 0 0-1.024-1.348c-.836-.572.063-.56.063-.56a1.937 1.937 0 0 1 1.412.95 1.962 1.962 0 0 0 2.682.765 1.971 1.971 0 0 1 .586-1.233c-2.046-.232-4.198-1.023-4.198-4.554a3.566 3.566 0 0 1 .948-2.474 3.313 3.313 0 0 1 .091-2.438s.773-.248 2.534.945a8.727 8.727 0 0 1 4.615 0c1.76-1.193 2.532-.945 2.532-.945a3.31 3.31 0 0 1 .092 2.438 3.562 3.562 0 0 1 .947 2.474c0 3.54-2.155 4.32-4.208 4.548a2.195 2.195 0 0 1 .625 1.706c0 1.232-.011 2.227-.011 2.529a.694.694 0 0 1-.272.587z"></path>\
            </svg>\
        </a>\
        <a href="https://github.com/Pierre7B" class="social-button facebook">\
            <svg class="cf-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 0 19 19">\
                <path d="M9.464 17.178a4.506 4.506 0 0 1-2.013.317 4.29 4.29 0 0 1-2.007-.317.746.746 0 0 1-.277-.587c0-.22-.008-.798-.012-1.567-2.564.557-3.105-1.236-3.105-1.236a2.44 2.44 0 0 0-1.024-1.348c-.836-.572.063-.56.063-.56a1.937 1.937 0 0 1 1.412.95 1.962 1.962 0 0 0 2.682.765 1.971 1.971 0 0 1 .586-1.233c-2.046-.232-4.198-1.023-4.198-4.554a3.566 3.566 0 0 1 .948-2.474 3.313 3.313 0 0 1 .091-2.438s.773-.248 2.534.945a8.727 8.727 0 0 1 4.615 0c1.76-1.193 2.532-.945 2.532-.945a3.31 3.31 0 0 1 .092 2.438 3.562 3.562 0 0 1 .947 2.474c0 3.54-2.155 4.32-4.208 4.548a2.195 2.195 0 0 1 .625 1.706c0 1.232-.011 2.227-.011 2.529a.694.694 0 0 1-.272.587z"></path>\
            </svg>\
        </a>\
        <a href="https://github.com/FibiiG" class="social-button instagram">\
            <svg class="cf-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 0 19 19">\
                <path d="M9.464 17.178a4.506 4.506 0 0 1-2.013.317 4.29 4.29 0 0 1-2.007-.317.746.746 0 0 1-.277-.587c0-.22-.008-.798-.012-1.567-2.564.557-3.105-1.236-3.105-1.236a2.44 2.44 0 0 0-1.024-1.348c-.836-.572.063-.56.063-.56a1.937 1.937 0 0 1 1.412.95 1.962 1.962 0 0 0 2.682.765 1.971 1.971 0 0 1 .586-1.233c-2.046-.232-4.198-1.023-4.198-4.554a3.566 3.566 0 0 1 .948-2.474 3.313 3.313 0 0 1 .091-2.438s.773-.248 2.534.945a8.727 8.727 0 0 1 4.615 0c1.76-1.193 2.532-.945 2.532-.945a3.31 3.31 0 0 1 .092 2.438 3.562 3.562 0 0 1 .947 2.474c0 3.54-2.155 4.32-4.208 4.548a2.195 2.195 0 0 1 .625 1.706c0 1.232-.011 2.227-.011 2.529a.694.694 0 0 1-.272.587z"></path>\
            </svg>\
        </a>\
    </div>\
<div id="app">\
<link rel="stylesheet" href="../css/about.css">';
}

function generateSettingsPage() {
    return `
    <link rel="stylesheet" href="../css/settings.css">
    <div class="settings-container">
        <h1>Settings</h1>
        <button class="btn btn-success btn-sm" id="show-blocked-users-btn">Blocked Users</button>
		<p id="block-users-error"></p>
        <!-- Popup for blocked users -->
        <div id="blocked-users-popup" class="popup2" style="display: none;">
            <h2>Blocked Users</h2>
            <div id="blocked-users-list">
                <!-- Blocked users will be loaded here -->
            </div>
            <button id="close-blocked-users-popup" class="btn btn-success btn-sm">Close</button>
        </div>
            <div class="auth-2FA">\
        </div>\
    </div>
    `;
}

function generateProfilPage() {
	return '<div class="container">\
			<div class="row justify-content-center">\
				<div class="col-4" id="picture_profil">\
					<div class="row justify-content-center">\
						<div class="replace_picture" alt="">\
							<form method="POST" enctype="multipart/form-data">\
								<div class="containers">\
									<img src="" alt="avatar" class="image" id="profile-pic">\
								</div>\
								<img src="../images/maillots/Order.png" id="maillot">\
								<div class="d-flex justify-content-between" id="selection_coa">\
									<button type="button" id="prev-btn">&lt;</button>\
									<ul id="list_maillot">\
										<li class="active">The Order</li>\
										<li>The Federation</li>\
										<li>The Alliance</li>\
										<li>The Assembly</li>\
									</ul>\
									<button type="button" id="next-btn">&gt;</button>\
								</div>\
								<input type="button" value="Save" class="btn btn-success btn-sm" id="save-btn">\
							</form>\
						</div>\
					</div>\
				</div>\
				<div class="col-4">\
					<div class="row justify-content-center">\
						<div class="data_user">\
						</div>\
					</div>\
					<div class="row justify-content-center">\
						<div class="data_form">\
						</div>\
					</div>\
					<div class="row justify-content-center">\
						<div class="statistique">\
						</div>\
					</div>\
				</div>\
				<div class="col-4">\
					<div class="row justify-content-center">\
						<div class="history">\
							History\
						</div>\
						<div class="match_1">\
							Dernier match\
						</div>\
						<div class="match_2">\
							Avant dernier match\
						</div>\
						<div class="match_3">\
							Avant avant dernier match\
						</div>\
					</div>\
				</div>\
			</div>\
		</div>\
	<link rel="stylesheet" href="../css/profil.css">';
}

document.addEventListener('DOMContentLoaded', async function () {
	await fetchLoggedInUserID();
});

async function fetchLoggedInUserID() {
	try {
		const token = localStorage.getItem('accessToken');
		if (!token) {
			return;
		}
		const response = await fetch('https://' + window.location.hostname + ':8443/api/current-user/', {
			headers: {
				'Authorization': `Bearer ${token}`,
			},
		});
		const data = await response.json();
		if (data && data.id) {
			window.loggedInUserID = data.id;
			window.loggedInUser = data.username;
			console.log(`Logged-in user ID: ${window.loggedInUserID}, Username: ${window.loggedInUser}`);
		}
	} catch (error) {
		console.error('Failed to fetch logged-in user ID:', error);
	}
}

// Function to send a message
document.getElementById('chat-message-submit').onclick = () => {
	if (window.currentChatSocket && window.currentChatSocket.readyState === WebSocket.OPEN) {
		const messageInput = document.getElementById('message_input');
		const message = messageInput.value.trim();
		if (message) {
			console.log(`[WebSocket Send] Sending message: "${message}" to chat partner ID: ${window.chatPartnerID}`);
			window.currentChatSocket.send(JSON.stringify({
				type: 'message',
				message,
				receiver: window.chatPartnerID,
			}));
			messageInput.value = '';  // Clear input field
		} else {
			console.warn('[WebSocket Send] Cannot send an empty message');
		}
	} else {
		console.error('[WebSocket Send] WebSocket is not open');
	}
};

function getAuthorizationCode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Fonction pour envoyer le code au back-end
async function sendCodeToBackend() {
    const code = getAuthorizationCode();

    if (!code) {
        console.error("Authorization code is missing from the URL.");
        return;
    }

    try {
        const response = await fetch('/api/home', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Backend response:", data);

            // Redirigez en fonction de la réponse
            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            }
        } else {
            console.error("Error from backend:", await response.text());
        }
    } catch (error) {
        console.error("Error sending request:", error);
    }
}

// Exécutez la fonction seulement après que le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    sendCodeToBackend();
	// handleHomeResponse();
});