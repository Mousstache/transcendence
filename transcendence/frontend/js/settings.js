import { getAccessToken } from "./token.js";

export function initializeSettingsPage() {
    const showBlockedUsersBtn = document.getElementById('show-blocked-users-btn');
    const blockedUsersPopup = document.getElementById('blocked-users-popup');
    const closePopupBtn = document.getElementById('close-blocked-users-popup');

    if (showBlockedUsersBtn) {
        showBlockedUsersBtn.addEventListener('click', async () => {
            await displayBlockedUsers();
        });
    }

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
            blockedUsersPopup.style.display = 'none';
        });
    }
}

async function displayBlockedUsers() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('https://' + window.location.hostname + ':8443/api/current-user/', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        const blockedUsers = userData.blocked_users;
		const blockedUsersPopup = document.getElementById('blocked-users-popup');


        if (!blockedUsers || blockedUsers.length === 0) {
			document.getElementById("block-users-error").innerHTML = "You have not blocked any users !";
			blockedUsersPopup.style.display = 'none';
            return;
        }

		document.getElementById("block-users-error").innerHTML = "";
		const blockedUsersList = document.getElementById('blocked-users-list');
		blockedUsersList.style.display = 'block'; // Show the container
		blockedUsersList.innerHTML = ''; // Clear previous content
		blockedUsersPopup.style.display = 'block';

        // Fetch details of each blocked user
        for (const blockedUserId of blockedUsers) {
            const userDetails = await fetchUserDetailsById(blockedUserId);
            if (userDetails) {
                const userElement = createBlockedUserElement(userDetails);
                blockedUsersList.appendChild(userElement);
            }
        }
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        // alert('An error occurred while fetching blocked users.');
    }
}

async function fetchUserDetailsById(userId) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`https://` + window.location.hostname + `:8443/api/user/${userId}/`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch user details: ${response.status} ${response.statusText}`);
            return null;
        }

        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

// settings.js

function createBlockedUserElement(user) {
    const userElement = document.createElement('div');
    userElement.classList.add('blocked-user');

    const profileImage = document.createElement('img');
    profileImage.src = user.image || '../images/default-profile.png'; // Use a default image if user.image is null
    profileImage.alt = `${user.username}'s profile picture`;
    profileImage.classList.add('profile-image');

    const usernameElement = document.createElement('span');
    usernameElement.textContent = user.username;

    const unblockButton = document.createElement('button');
    unblockButton.textContent = 'Unblock';
    unblockButton.addEventListener('click', async () => {
        const confirmation = confirm(`Are you sure you want to unblock ${user.username}?`);
        if (confirmation) {
            await unblockUser(user.id);
            // Remove the user from the list after unblocking
            userElement.remove();
        }
    });

    userElement.appendChild(profileImage);
    userElement.appendChild(usernameElement);
    userElement.appendChild(unblockButton);

    return userElement;
}

async function update2FA(active_2FA, w_token) {

    const updateResponse = await fetch("https://" + window.location.hostname + ":8443/api/current-user/update_2FA/", {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${w_token}`,
        },
        body: JSON.stringify({
            active_2FA: active_2FA,
        })
    });

    if (updateResponse.status === 401) {
        // Token expiré, signalez une erreur
        throw new Error('Failed to load a new token to update 2FA');
    }

    if (!updateResponse.ok) {
        throw new Error(`HTTP error! status: ${updateResponse.status}`);
    }

    return await updateResponse.json(); // Retourne les données mises à jour
}

export async function activate_2fa() {
	if (!document.querySelector('.settings-container'))
		return ; 

	let token = await getAccessToken();

	const response = await fetch("https://" + window.location.hostname + ":8443/api/current-user/", {
		headers: {
			'Authorization': `Bearer ${token}`,
		}
	});

	if (!response.ok || !response)
		throw new Error(`HTTP error! status: ${response.status}`);

	const data = await response.json();

    console.log(data);
	document.querySelector('.auth-2FA').innerHTML = `
	<form id="2FA-form">
		<p>Would you like to activate the double authentication (2FA)?</p>
		<p>Current status: ${data.active_2FA ? 'Active' : 'Inactive'}</p>
		<label>
			<input type="radio" name="2FA" value="activate" ${data.active_2FA ? 'checked' : ''}>
			Activate
		</label>
		<label>
			<input type="radio" name="2FA" value="desactivate" ${!data.active_2FA ? 'checked' : ''}>
			Desactivate
		</label>
		<button class="btn btn-success btn-sm" type="submit" id="save-2FA">Submit</button>
	</form>
`;

	document.getElementById('save-2FA').addEventListener('click', async function () {
		const selectedValue = document.querySelector('input[name="2FA"]:checked').value;
		let option = null;

		if (selectedValue == "activate")
			option = true;
		else
			option = false;

		try {
			const updatedData = await update2FA(option, token);

			document.querySelector('.auth-2FA').innerHTML = `
				<form id="2FA-form">
					<p>Would you like to activate the double authentication (2FA)?</p>
					<p>Current status: ${updatedData.active_2FA ? 'Active' : 'Inactive'}</p>
					<label>
						<input type="radio" name="2FA" value="activate" ${updatedData.active_2FA ? 'checked' : ''}>
						Activate
					</label>
					<label>
						<input type="radio" name="2FA" value="desactivate" ${!updatedData.active_2FA ? 'checked' : ''}>
						Desactivate
					</label>
					<button type="button" id="save-2FA">Submit</button>
				</form>
			`;
			window.location.reload();
		} catch (error) {
			console.error('Erreur lors de la mise à jour du statut 2FA :', error);
		}
	});
}
