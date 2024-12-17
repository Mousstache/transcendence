let token = null;
let message = null;

import { getAccessToken } from './token.js';
import { getCookie } from './token.js';

function checkCookies(redirectUrl = 'https://' + window.location.hostname + ':8443') {
    const loginCook = getCookie('login');
    const emailCook = getCookie('email');

    if (!loginCook || !emailCook) {
        window.location.href = redirectUrl;
    }
}

function protectRoutes() {
    const currentPath = window.location.pathname;
    const protectedRoutes = ['/profil', '/home', '/play', '/about'];
    const shouldBlock = protectedRoutes.some(route => currentPath.includes(route));
    if (shouldBlock) {
        checkCookies();
    }
}

function deleteCookies() {
    const requiredCookies = ["login", "email"];
    for (let cookie of requiredCookies) {
        document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }
}

function signCookies(value) {
    const requiredCookies = ["login", "email"];
    setInterval(() => {
        for (let cookie of requiredCookies) {
            if (!getCookie(cookie) || (cookie == 'login' && getCookie(cookie) != value)) {
                deleteCookies();
                alert("Un problème avec vos cookies a été détecté. Vous serez redirigé vers l'accueil.");
                window.location.href = "https://" + window.location.hostname + ":8443";
                return;
            }
        }
    }, 2000);
}

window.onload = function () {
    protectRoutes();
};

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function updateUser(pseudo, description, image_base64 = null) {
    token = await getAccessToken();
    const body = { pseudo, description };
    if (image_base64 !== null) {
        body.image_base64 = image_base64;
    }

    const updateResponse = await fetch("https://" + window.location.hostname + ":8443/api/current-user/update_user/", {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body)
    });

    if (!updateResponse.ok) {
        throw new Error(`HTTP error! status: ${updateResponse.status}`);
    }

    return await updateResponse.json();
}

async function main_profile() {
    if (!document.querySelector('.data_user')) {
        return;
    }
    var items = document.querySelectorAll("#list_maillot li");
    var currentIndex = 0;
    var coalition = localStorage.getItem("coalition");

    function getIndexShowItem(coalition) {
        switch (coalition) {
            case "THE ORDER":
                return 0;
            case "THE FEDERATION":
                return 1;
            case "THE ALLIANCE":
                return 2;
            case "THE ASSEMBLY":
                return 3;
            default:
                return -1;
        }
    }

    if (items[currentIndex])
        items[currentIndex].classList.add('active');

    function showItem(index) {
        items.forEach(function (item) {
            item.classList.remove('active');
        });
        items[index].classList.add('active');
        const maillot = document.getElementById('maillot');
        switch (index) {
            case 0:
                coalition = "THE ORDER";
                maillot.src = "../images/maillots/Order.png"
                break;
            case 1:
                coalition = "THE FEDERATION";
                maillot.src = "../images/maillots/Federation.png"
                break;
            case 2:
                coalition = "THE ALLIANCE";
                maillot.src = "../images/maillots/Alliance.png"
                break;
            case 3:
                coalition = "THE ASSEMBLY";
                maillot.src = "../images/maillots/Assembly.png"
                break;
            default:
                coalition = "Unknown";
                break;
        }
    }

    var nextButton = document.getElementById('next-btn');
    var prevButton = document.getElementById('prev-btn');

    if (nextButton) {
        nextButton.addEventListener('click', function () {
            currentIndex = (currentIndex + 1) % items.length;
            showItem(currentIndex);
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', function () {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            showItem(currentIndex);
        });
    }

    const actualMaillot = getIndexShowItem(coalition);
    if (actualMaillot != -1) {
        showItem(actualMaillot);
    }

    try {
        var saveButton = document.getElementById('save-btn');
        saveButton.addEventListener('click', async function () {
            token = await getAccessToken();
            console.log(token);
            const change_coalition = await fetch('https://' + window.location.hostname + ':8443/api/current-user/update_coalition/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    coalition: coalition
                })
            })

            if (!change_coalition.ok || !change_coalition)
                throw new Error(`HTTP error! status: ${change_coalition.status}`)

            const json = await change_coalition.json();

            localStorage.setItem('coalition', json.coalition);
            window.location.reload();
        })
    } catch (error) {
        console.error('Error while changing coalition:', error);
    }

    try {
        token = await getAccessToken();

        const response = await fetch("https://" + window.location.hostname + ":8443/api/current-user/", {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!response.ok || !response)
            throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        signCookies(data.username);

        localStorage.setItem('coalition', data.coalition);

        let message;
        switch (data.coalition) {
            case 'THE ORDER':
                message = "Double ball speed";
                break;
            case 'THE FEDERATION':
                message = "Double pad size";
                break;
            case 'THE ALLIANCE':
                message = "Teleport ball";
                break;
            case 'THE ASSEMBLY':
                message = "Freeze opponent";
                break;
            default:
                console.log('L\'utilisateur n\'a pas de coalition.');
        }

        document.querySelector('.data_user').innerHTML = `
        Login : ${data.username || 'N/A'} <br>
        Coalition : ${data.coalition || 'N/A'} <br>
        Power : ${message || 'N/A'} <br>
    	`;

        document.querySelector('.data_form').innerHTML = `
        <form id="user-form">
            <label for="pseudo">Pseudo : </label>
            <input type="text" id="pseudo" name="pseudo" value="${data.pseudo || 'N/A'}" /><br>

            <label for="description">Description : </label> 
            <input type="text" id="description" name="description" value="${data.description || 'N/A'}" /><br>

            <button class="btn btn-success btn-sm" id="save-changes">Save</button>
        </form>
    `;

        document.querySelector('.statistique').innerHTML = `
                Games played : ${data.matches_played || '0'} <br>
                Win : ${data.matches_won || '0'} <br>
                Loose : ${data.matches_lost || '0'} <br>
                Winrate : ${data.winrate || '0'}% <br>
                Points scored : ${data.total_points_scored || '0'} <br>
                Win streak : ${data.current_win_streak || '0'} <br>
                Preferred hit zone : ${data.preferred_hit_zone || 'N/A'} <br>
                Vulnerability zone : ${data.vulnerability_zone || 'N/A'} <br>
            `;

        const profilPic = document.getElementById('profile-pic');

        // Priority for image: image_base64 > image > default
        let initialImage = data.image_base64 || data.image || '../images/friendicon.png';

        if (profilPic) {
            profilPic.src = initialImage;
            window.oldProfilePicURL = initialImage;
        }

        const fetch_games = await fetch("https://" + window.location.hostname + ":8443/api/last-three-matches/", {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!fetch_games.ok || !fetch_games)
            throw new Error(`HTTP error! status: ${fetch_games.status}`);

        const responseData = await fetch_games.json();
        const games = responseData.results;

        if (games.length > 0) {
            const matchDate1 = new Date(games[0].match_date);
            document.querySelector('.match_1').innerHTML = `
            Date: ${matchDate1.toLocaleString('en-EN', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })} <br>
            ${games[0].user_1.username} vs ${games[0].user_2.username} <br>
            Winner: ${games[0].winner.username} <br>
            Score: ${games[0].score_1} - ${games[0].score_2} <br>
			Preferred hit zone : ${games[0].preferred_hit_zone || 'N/A'} <br>
            Vulnerability zone : ${games[0].vulnerability_zone || 'N/A'} <br>
            `;
        } else
            document.querySelector('.match_1').style.display = 'none';

        if (games.length > 1) {
            const matchDate2 = new Date(games[1].match_date);
            document.querySelector('.match_2').innerHTML = `
            Date: ${matchDate2.toLocaleString('en-EN', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })} <br>
            ${games[1].user_1.username} vs ${games[1].user_2.username} <br>
            Winner: ${games[1].winner.username} <br>
            Score: ${games[1].score_1} - ${games[1].score_2} <br>
			Preferred hit zone : ${games[1].preferred_hit_zone || 'N/A'} <br>
            Vulnerability zone : ${games[1].vulnerability_zone || 'N/A'} <br>
            `;
        } else
            document.querySelector('.match_2').style.display = 'none';

        if (games.length > 2) {
            const matchDate3 = new Date(games[2].match_date);
            document.querySelector('.match_3').innerHTML = `
            Date: ${matchDate3.toLocaleString('en-EN', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })} <br>
            ${games[2].user_1.username} vs ${games[2].user_2.username} <br>
            Winner: ${games[2].winner.username} <br>
            Score: ${games[2].score_1} - ${games[2].score_2} <br>
			Preferred hit zone : ${games[2].preferred_hit_zone || 'N/A'} <br>
            Vulnerability zone : ${games[2].vulnerability_zone || 'N/A'} <br>
            `;
        } else
            document.querySelector('.match_3').style.display = 'none';

        if (games.length == 0) {
            console.log("0 matchs played")
        }

        document.getElementById('save-changes').addEventListener('click', async function () {
            const newPseudo = document.getElementById('pseudo').value;
            const newDescription = document.getElementById('description').value;

            try {
                const updatedData = await updateUser(newPseudo, newDescription);
                window.location.reload();
            } catch (error) {
                // console.error('Erreur lors de la mise à jour des informations :', error);
                // alert('Une erreur est survenue lors de la mise à jour.');
            }
        });

        // Handle image upload in base64
        if (profilPic) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.jpg,.jpeg,.png';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            profilPic.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async () => {
                    const base64String = reader.result; // "data:image/xxx;base64,..."
                    try {
                        const updatedData = await updateUser(data.pseudo, data.description, base64String);
                        // Temporarily show new image
                        profilPic.src = updatedData.image_base64 || '../images/friendicon.png';

                        const confirmButton = document.createElement('button');
                        confirmButton.textContent = 'Confirm';
                        confirmButton.type = 'button';

                        const cancelButton = document.createElement('button');
                        cancelButton.textContent = 'Cancel';
                        cancelButton.type = 'button';

                        profilPic.parentNode.appendChild(confirmButton);
                        profilPic.parentNode.appendChild(cancelButton);

                        confirmButton.addEventListener('click', () => {
                            // alert('Profile picture updated successfully!');
                            confirmButton.remove();
                            cancelButton.remove();
                            // Update oldProfilePicURL to the new one
                            window.oldProfilePicURL = updatedData.image_base64;
                            data.image_base64 = updatedData.image_base64;
                        });

                        cancelButton.addEventListener('click', async () => {
                            // Revert to old image
                            profilPic.src = window.oldProfilePicURL || '../images/friendicon.png';
                            confirmButton.remove();
                            cancelButton.remove();
                            // Optionally revert changes on server side if needed,
                            // But typically you'd just not finalize it. Depends on your logic.
                            // For this example, assume the update was immediate and cancel doesn't revert server.
                            // If you need revert on server, call updateUser again with old base64 or null.
                        });

                    } catch (err) {
                        console.error('Error updating image base64:', err);
                    }
                };
                reader.readAsDataURL(file);
            });
        }

    } catch (error) {
		console.error('Erreur lors de la récupération des informations utilisateur :', error);
	}
}

main_profile();
