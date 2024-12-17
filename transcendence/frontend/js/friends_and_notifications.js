// import { openChatWithFriend } from './chat.js';
import { connect_tournament } from './tournament.js';

// Show or hide friend search bar when "Add Friend" button is clicked
document.getElementById('add-friend-button').addEventListener('click', toggleFriendSearchBar);
function toggleFriendSearchBar() {
    const searchBar = document.getElementById('friend-search-bar');
    searchBar.style.display = (searchBar.style.display === 'none' || searchBar.style.display === '') ? 'block' : 'none';
}

// Handle friend search form submission
document.getElementById('friend-search-form').addEventListener('submit', handleFriendSearch);
async function handleFriendSearch(event) {
    event.preventDefault();

    if (!window.loggedInUser) await fetchLoggedInUser();

    const friendUsername = document.getElementById('friend-search-input').value.trim();
    if (!friendUsername){
		displayMessage('friend-search-message', 'Please enter a username.');
		setTimeout(() => {
			displayMessage('friend-search-message', '');
		}, 5000);
		return 
	}

    if (friendUsername === window.loggedInUser) {
        displayMessage('friend-search-message', 'You cannot add yourself as a friend.');
		setTimeout(() => {
			displayMessage('friend-search-message', '');
		}, 5000);
		return;
    }

    try {
        const userExists = await checkUserExists(friendUsername);
        if (!userExists) {
			displayMessage('friend-search-message', `User ${friendUsername} does not exist.`);
			setTimeout(() => {
				displayMessage('friend-search-message', '');
			}, 5000);
			return 
		}
		await createFriendRequest(friendUsername);
        displayMessage('friend-search-message', `Friend request sent to ${friendUsername}!`);
        document.getElementById('friend-search-input').value = '';  // Clear input
		setTimeout(() => {
			displayMessage('friend-search-message', '');
		}, 5000);
    } catch (error) {
        displayMessage('friend-search-message', error.message || 'An error occurred. Please try again.');
        console.error('Error sending friend request:', error);
		setTimeout(() => {
			displayMessage('friend-search-message', '');
		}, 5000);
    }
}

// Toggle friend popup visibility
document.getElementById('btn-friends').addEventListener('click', toggleFriendPopup);

async function toggleFriendPopup() {
    const friendPopup = document.getElementById('popup');
    const notificationPopup = document.getElementById('notification-popup');

    // Close the notification popup if it is open
    if (notificationPopup.style.display === 'block') {
        notificationPopup.style.display = 'none';
    }

    // Toggle friend popup visibility
    friendPopup.style.display = (friendPopup.style.display === 'none' || friendPopup.style.display === '') ? 'block' : 'none';
    if (friendPopup.style.display === 'block') {
        await fetchFriends();
    }
}

// Open friend's profile popup
document.getElementById('chatUser').addEventListener('click', () => {
    const friendUsername = document.getElementById('chatUser').textContent.trim();
    if (friendUsername !== "Select a friend to chat") openFriendProfilePopup(friendUsername);
});

// Fetch logged-in user
async function fetchLoggedInUser() {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token)
            return;
        const response = await fetch('https://' + window.location.hostname + ':8443/api/current-user/', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (data && data.id) {
            window.loggedInUserID = parseInt(data.id);
            window.loggedInUser = data.username;
            window.loggedInUserImage = data.image_base64 || data.image || '../images/friendicon.png'; // Store user's image
        }
    } catch (error) {
        console.error('Failed to fetch logged-in user:', error);
    }
}


// Check if a user exists
async function checkUserExists(username) {
    try {
        const response = await apiFetch(`/api/user/?username=${username}`);
        return response.results && response.results.length > 0;
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
}

// Create a friend request
async function createFriendRequest(friendUsername) {
    const payload = { friend_with: friendUsername };
    try {
        const response = await apiFetch('/api/friend-requests/', 'POST', payload);
        console.log('Friend request sent:', response);
    } catch (error) {
        console.error('Failed to send friend request:', error);
        throw error;
    }
}

function attachRequestActionListeners() {
    // Accept buttons
    const acceptButtons = document.querySelectorAll('.accept-btn');
    acceptButtons.forEach(button => {
        button.addEventListener('click', () => {
            const requestId = button.getAttribute('data-request-id');
            acceptFriendRequest(requestId);
        });
    });

    // Decline buttons
    const declineButtons = document.querySelectorAll('.decline-btn');
    declineButtons.forEach(button => {
        button.addEventListener('click', () => {
            const requestId = button.getAttribute('data-request-id');
            declineFriendRequest(requestId);
        });
    });
}


function displayFriendRequests(requests) {
    const container = document.getElementById('friend-requests-container');
    container.innerHTML = ''; // Clear previous requests

    requests.forEach(request => {
        const requesterUsername = request.friend; // Adjust if necessary
        const requestId = request.id; // Ensure this is the numeric ID

        // Add the console log here to see current user vs. requester
        console.log('Current user:', window.loggedInUser, 'Notification from:', requesterUsername);
		if (window.loggedInUser === requesterUsername)
			return;
        const requestElement = document.createElement('div');
        requestElement.className = 'notification-item';

        // Create the text element
        const textElement = document.createElement('p');
        textElement.textContent = `${requesterUsername} has sent you a friend request.`;

        // Create a container for the icons
        const iconContainer = document.createElement('div');
        iconContainer.className = 'icon-container';

        // Create the accept icon
        const acceptIcon = document.createElement('img');
        acceptIcon.src = '../images/validate-icon.png'; // Ensure the path is correct
        acceptIcon.alt = 'Accept Friend Request';
        acceptIcon.className = 'icon accept-icon';
        acceptIcon.addEventListener('click', () => acceptFriendRequest(requestId));

        // Create the decline icon
        const declineIcon = document.createElement('img');
        declineIcon.src = '../images/deny-icon.png'; // Ensure the path is correct
        declineIcon.alt = 'Decline Friend Request';
        declineIcon.className = 'icon decline-icon';
        declineIcon.addEventListener('click', () => declineFriendRequest(requestId));

        // Append icons to the icon container
        iconContainer.appendChild(acceptIcon);
        iconContainer.appendChild(declineIcon);

        // Append elements to the request element
        requestElement.appendChild(textElement);
        requestElement.appendChild(iconContainer);

        container.appendChild(requestElement);
    });
}


function displayTournamentRequests(requests) {
    const container = document.getElementById('friend-requests-container');
    // container.innerHTML = ''; // Clear previous requests

    requests.forEach(request => {

        const requesterUsername = request.user; // Adjust if necessary
        const requestId = request.id; // Ensure this is the numeric ID
        const tournament_id = request.tournament_id; // Ensure this is the numeric ID

        const requestElement = document.createElement('div');
        requestElement.className = 'notification-item';

        // Create the text element
        const textElement = document.createElement('p');
        textElement.textContent = `${requesterUsername} has sent you a match invitation.`;

        // Create a container for the icons
        const iconContainer = document.createElement('div');
        iconContainer.className = 'icon-container';

        // Create the accept icon
        const acceptIcon = document.createElement('img');
        acceptIcon.src = '../images/validate-icon.png'; // Ensure the path is correct
        acceptIcon.alt = 'Accept Tournament Request';
        acceptIcon.className = 'icon accept-icon';
        acceptIcon.addEventListener('click', () => acceptTournamentInvitation(requestId, tournament_id));

        // Create the decline icon
        const declineIcon = document.createElement('img');
        declineIcon.src = '../images/deny-icon.png'; // Ensure the path is correct
        declineIcon.alt = 'Decline Tournament Request';
        declineIcon.className = 'icon decline-icon';
        declineIcon.addEventListener('click', () => declineTournamentInvitation(requestId));

        // Append icons to the icon container
        iconContainer.appendChild(acceptIcon);
        iconContainer.appendChild(declineIcon);

        // Append elements to the request element
        requestElement.appendChild(textElement);
        requestElement.appendChild(iconContainer);

        container.appendChild(requestElement);
    });
}


async function acceptTournamentInvitation(requestId, tournamentId) {
    try {
        await apiFetch(`/api/tournament-requests/${requestId}/`, 'PUT', { is_accepted: true });

        console.log("TOURNAMENT ID " + tournamentId);

        var tournament = {
            have_power_up : false,
            max_player : 0,
            name : undefined,
        }

        tournament.name = tournamentId;
        const response = await fetch("https://" + window.location.hostname + ":8443/api/tournoi/" + tournamentId + "/");
        if (!response.ok) {
            return ;
        }
        const json = await response.json();
        tournament.have_power_up = json.have_power_up;
        tournament.max_player = json.max_player;
        connect_tournament(tournament);
        window.location.hash = `${tournamentId}`;

        await fetchNotifications();
    } catch (error) {
        console.error('Failed to accept friend request:', error);
    }
}

// Decline friend request
async function declineTournamentInvitation(requestId) {
    try {
        await apiFetch(`/api/tournament-requests/${requestId}/`, 'DELETE');
        // Refresh the notifications display
        await fetchNotifications();
    } catch (error) {
        console.error('Failed to decline friend request:', error);
    }
}

// // Fetch and display pending friend requests
// async function fetchFriendRequests() {
//     try {
//         const data = await apiFetch('/api/friend-requests/');
//         if (data.results) {
//             displayFriendRequests(data.results);
//         } else {
//             console.log('No friend requests found');
//         }
//     } catch (error) {
//         console.error('Error fetching friend requests:', error);
//     }
// }

// Accept friend request
async function acceptFriendRequest(requestId) {
    try {
        await apiFetch(`/api/friend-requests/${requestId}/`, 'PUT', { is_accepted: true });
        // alert('Friend request accepted.');
        // Refresh the friend list and notifications
        await fetchFriends();
        await fetchNotifications();
		window.location.reload();
    } catch (error) {
        console.error('Failed to accept friend request:', error);
    }
}

// Decline friend request
async function declineFriendRequest(requestId) {
    try {
        await apiFetch(`/api/friend-requests/${requestId}/`, 'DELETE');
        // alert('Friend request declined.');
        // Refresh the notifications display
        await fetchNotifications();
		window.location.reload();
    } catch (error) {
        console.error('Failed to decline friend request:', error);
    }
}




// // Fetch and display friends
async function fetchFriends() {
    try {
        const data = await apiFetch('/api/friend/');
        if (data.results) {
            displayFriends(data.results);
        } else {
            console.log('No friends found');
        }
    } catch (error) {
        console.error('Error fetching friends:', error);
    }
}

// async function fetchFriends() {
//     try {
//         const data = await apiFetch('/api/friend/');
//         if (data && data.results) {
//             displayFriends(data.results);
//         } else {
//             console.log('No friends found');
//             const friendList = document.getElementById('friend-list');
//             if (friendList) {
//                 friendList.innerHTML = '<p>You have no friends.</p>';
//             }
//         }
//     } catch (error) {
//         console.error('Error fetching friends:', error);
//     }
// }

function updateFriendListWithUnreadCounts() {
    const friendListIds = ['online-friend-list', 'offline-friend-list'];
    friendListIds.forEach(listId => {
        const friendList = document.getElementById(listId);
        if (!friendList) return;

        const friends = friendList.getElementsByClassName('friend');
        for (let i = 0; i < friends.length; i++) {
            const friendElement = friends[i];
            const friendUsername = friendElement.dataset.username;

            // Remove existing unread count indicators
            const existingBadge = friendElement.querySelector('.unread-count');
            if (existingBadge) {
                existingBadge.remove();
            }

            // Display the unread count if it exists
            if (window.unreadMessages && window.unreadMessages[friendUsername]) {
                const count = window.unreadMessages[friendUsername];
                const badge = document.createElement('span');
                badge.className = 'unread-count';
                badge.textContent = count;
                friendElement.appendChild(badge);
            }
        }
    });
}


async function displayFriends(friends) {
    const onlineFriendList = document.getElementById('online-friend-list');
    const offlineFriendList = document.getElementById('offline-friend-list');

    onlineFriendList.innerHTML = '';
    offlineFriendList.innerHTML = '';

    const uniqueFriends = new Set();

    for (const friend of friends) {
        const friendUsername = friend.friend === window.loggedInUser ? friend.friend_with : friend.friend;
        if (friendUsername === window.loggedInUser || uniqueFriends.has(friendUsername)) {
            continue;
        }
        uniqueFriends.add(friendUsername);

        const friendData = await fetchUserDetails(friendUsername);
        if (!friendData) continue; // Skip if user details couldn't be fetched

        // Create friend list item
        const li = document.createElement('li');
        li.className = 'friend d-flex align-items-center';
        li.dataset.username = friendUsername;

        // Create profile image
        const img = document.createElement('img');
        img.className = 'profile-image';
        img.width = 40;
        img.height = 40;
        img.style.objectFit = 'cover';
        img.alt = `${friendUsername}'s Profile Picture`;

        // Assign image source
        if (friendData.image_base64) {
            img.src = friendData.image_base64;
        } else if (friendData.image) {
            img.src = friendData.image;
        } else {
            img.src = '../images/friendicon.png'; // Fallback image
        }

        // Create username span
        const span = document.createElement('span');
        span.textContent = friendUsername;

        // Append image and username to the list item
        li.appendChild(img);
        li.appendChild(span);

        // Add click listener to open chat
        li.onclick = () => openChatWithFriend(friendUsername);

        // Append to the appropriate list based on online status
        if (friendData.is_online) {
            onlineFriendList.appendChild(li);
        } else {
            offlineFriendList.appendChild(li);
        }
    }

    updateFriendListWithUnreadCounts();
}



// Fetch and display a friend's profile in a popup
async function openFriendProfilePopup(friendUsername) {
    try {
        const response = await apiFetch(`/api/user/?username=${friendUsername}`);
        const user = response.results[0];
        if (user) displayFriendProfilePopup(user);
    } catch (error) {
        console.error('Error opening friend profile:', error);
    }
}

// Display friend profile in a popup
function displayFriendProfilePopup(user) {
    if (document.getElementById('consult_profil')) return;

    // Determine the image source
    let profileImageSrc = user.image_base64 || user.image || '../images/friendicon.png';

    // Ensure image_base64 has the correct Data URL prefix
    if (profileImageSrc && !profileImageSrc.startsWith('data:image')) {
        // Adjust the MIME type based on your image format (e.g., image/jpeg, image/png)
        profileImageSrc = `data:image/png;base64,${profileImageSrc}`;
    }

    const popupContent = `
        <div class="profile_popup" id="consult_profil">
            <div class="presentation">
                <div class="bandeau">
                    <img src="${profileImageSrc}" alt="${user.username}" class="profile-image">
                    <p>${user.username}</p>
                </div>
                <p>Coalition: ${user.coalition || 'N/A'}</p>
                <p>Pseudo: ${user.pseudo || 'N/A'}</p>
                <p>Description: ${user.description || 'N/A'}</p>
            </div>
            <div class="data-player">
                <p>Win: ${user.matches_won}</p>
                <p>Loose: ${user.matches_lost}</p>
                <p>Winrate: ${user.winrate}%</p>
                <p>Win streak: ${user.current_win_streak || '0'}</p>
                <p>Games played: ${user.matches_played}</p>
                <p>Points scored: ${user.total_points_scored}</p>
                <p>Preferred hit zone: ${user.preferred_hit_zone || 'N/A'}</p>
                <p>Vulnerability zone: ${user.vulnerability_zone || 'N/A'}</p>
            </div>
            <button id="close-profile-popup" class="btn btn-secondary">Close</button>
        </div>
    `;

    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';
    popupContainer.innerHTML = popupContent;
    document.body.appendChild(popupContainer);

    document.getElementById('close-profile-popup').addEventListener('click', () => popupContainer.remove());
}


// Utility: Display messages in specified element
function displayMessage(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

// Utility: API fetch wrapper with token handling
async function apiFetch(url, method = 'GET', body = null) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.error('Access token is missing.');
        return null; // Exit if token is missing
    }

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`https://` + window.location.hostname + `:8443${url}`, options);
    let responseData;
    try {
        responseData = await response.json();
    } catch (e) {
        responseData = null;
    }
    if (!response.ok) {
        const errorDetail = responseData && (responseData.detail || JSON.stringify(responseData)) || `HTTP error! status: ${response.status}`;
        const error = new Error(errorDetail);
        error.status = response.status;
        error.responseData = responseData;
        throw error;
    }
    return responseData;
}

// Fetch and set the logged-in user globally
async function fetchLoggedInUserID() {
    try {
        const response = await apiFetch('/api/current-user/');
        if (response && response.id) {
            window.loggedInUserID = response.id;
            window.loggedInUser = response.username;
            console.log(`Logged-in user ID: ${window.loggedInUserID}, Username: ${window.loggedInUser}`);
        }
    } catch (error) {
        console.error('Failed to fetch logged-in user ID:', error);
    }
}



// Toggle notification popup visibility and fetch notifications
document.getElementById('btn-notifications').addEventListener('click', toggleNotificationPopup);

async function toggleNotificationPopup() {
    const notificationPopup = document.getElementById('notification-popup');
    const friendPopup = document.getElementById('popup');

    // Close the friend popup if it is open
    if (friendPopup.style.display === 'block') {
        friendPopup.style.display = 'none';
    }

    // Toggle notification popup visibility
    notificationPopup.style.display = (notificationPopup.style.display === 'none' || notificationPopup.style.display === '') ? 'block' : 'none';

    if (notificationPopup.style.display === 'block') {
        await fetchNotifications();  // Fetch notifications
        await markNotificationsAsSeen();  // Mark notifications as seen
    }
}

async function fetchNotifications() {
    try {
        // Fetch friend requests
        const friendRequestsData = await apiFetch('/api/friend-requests/');
        console.log('Friend Requests Data:', friendRequestsData);
        displayFriendRequests(friendRequestsData.results);

        // If you have other types of notifications, fetch them as well
        const tournamentData = await apiFetch('/api/tournament-requests/');
        console.log('Tournament Requests Data:', tournamentData);
        displayTournamentRequests(tournamentData.results);

    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

// Mark notifications as seen
async function markNotificationsAsSeen() {
    try {
        await apiFetch('/api/mark-notifications-as-seen/', 'POST');
    } catch (error) {
        console.error('Error marking notifications as seen:', error);
    }
}

// Close notification popup
document.getElementById('close-notification-popup').addEventListener('click', () => {
    document.getElementById('notification-popup').style.display = 'none'});
