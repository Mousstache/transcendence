import { refreshAccessToken } from './token.js';
import { isTokenExpired } from './token.js';
import { getCookie } from './token.js';

window.unreadMessages = window.unreadMessages || {};

if (getCookie('login') && getCookie('email')) {
document.addEventListener('DOMContentLoaded', async function() {
    let token = localStorage.getItem('accessToken');

    // Check if token is missing or expired, then refresh
    if (!token || isTokenExpired(token)) {
        await refreshAccessToken();
        token = localStorage.getItem('accessToken');
    }

    if (!token)
        return;

    // Initialize the WebSocket connection for notifications
    initializeNotificationWebSocket(token);

    // Fetch the logged-in user's information
    await fetchLoggedInUser();

    // Fetch the initial friend list
    await fetchFriends();

    // Function to initialize WebSocket with valid token
    function initializeNotificationWebSocket(token) {
        if (!token) {
            console.error("Access token is missing, cannot initialize WebSocket.");
            return;
        }

        const notificationSocket = new WebSocket(`wss://`+ window.location.hostname +`:8443/ws/notify/?token=${token}`);

        notificationSocket.onopen = function() {
            console.log("Notification WebSocket connection opened.");
        };

        notificationSocket.onmessage = function(event) {
			const data = JSON.parse(event.data);
			console.log("Notification WebSocket message received: ", data);
			
			if (data.type === 'FRIEND_REQUEST') {
				console.log("Friend request notification received");
				highlightNotificationButton();
				// Optionally fetch notifications or update UI immediately
			} else if (data.type === 'MATCH_INVITE') {
				console.log("Match invite notification received");
				highlightNotificationButton();
			} else if (data.type === 'NEW_MESSAGE') {
				handleNewMessageNotification(data);
			} else if (data.type === 'friend_request_accepted') {
				console.log("Friend request accepted notification received");
				window.location.reload();
			} else {
				console.log("Unknown notification type:", data.type);
			}
		};
		

        notificationSocket.onerror = function(error) {
            console.error("Notification WebSocket encountered an error:", error);
        };

        notificationSocket.onclose = function(event) {
            console.warn("Notification WebSocket closed:", event);
            setTimeout(() => initializeNotificationWebSocket(localStorage.getItem('accessToken')), 5000);
        };
    }

    // Fetch logged-in user
    async function fetchLoggedInUser() {
        try {
            const response = await apiFetch('/api/current-user/');
            window.loggedInUser = response.username;
            window.loggedInUserID = response.id;
        } catch (error) {
            console.error('Failed to fetch logged-in user:', error);
        }
    }


    // Fetch and display friends
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

    async function fetchFriends() {
		console.log("fetch friend");
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
    
	function highlightNotificationButton() {
		const notificationButton = document.getElementById('btn-notifications');
		if (!notificationButton) {
			console.warn('highlightNotificationButton: notification button not found.');
			return;
		}
	
		// Add the glow effect class
		notificationButton.classList.add('new-message');
	
		// Change the icon to indicate new notifications
		const icon = notificationButton.querySelector('img.nav-icon');
		if (icon) {
			icon.src = '../images/new_notif_icon.png';
		} else {
			console.warn('highlightNotificationButton: nav-icon image not found inside notification button.');
		}
	}
	

	function handleNewMessageNotification(data) {
		const fromUser = data.from_user;
	
		// Check if the chat window with this sender is open
		if (window.chatPartnerUsername !== fromUser) {
			// Chat window is not open, increment message count
			if (!window.unreadMessages) {
				window.unreadMessages = {};
			}
			window.unreadMessages[fromUser] = (window.unreadMessages[fromUser] || 0) + 1;
	
			// Illuminate the friend button
			const friendButton = document.getElementById('btn-friends');
			friendButton.classList.add('new-message');
	
			// Update the friend list UI if it's open
			if (document.getElementById('popup').style.display === 'block') {
				updateFriendListWithUnreadCounts();
			}
		}
	}

    // Fetch notifications
    async function fetchNotifications() {
        try {
            // Fetch friend requests
            const friendRequestsData = await apiFetch('/api/friend-requests/');
            console.log('Friend Requests Data:', friendRequestsData);
            if (friendRequestsData && friendRequestsData.results) {
                displayFriendRequests(friendRequestsData.results);
            }

            // If you have other types of notifications, fetch them as well
            // const otherNotificationsData = await apiFetch('/api/other-notifications/');
            // displayOtherNotifications(otherNotificationsData);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }

    // Display friend requests in the notification popup
    function displayFriendRequests(requests) {
        const container = document.getElementById('friend-requests-container');
        if (!container) {
            console.error('Friend requests container not found.');
            return;
        }

        container.innerHTML = ''; // Clear previous requests

        requests.forEach(request => {
            console.log('Friend Request Object:', request); // Inspect the request object

            const requesterUsername = request.friend; // Adjust if necessary
            const requestId = request.id; // Ensure this is the numeric ID

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

    // Accept friend request
    async function acceptFriendRequest(requestId) {
        try {
            await apiFetch(`/api/friend-requests/${requestId}/`, 'PUT', { is_accepted: true });
            // alert('Friend request accepted.');
            // Refresh the friend list and notifications
            await fetchFriends(); // Update your own friend list
            await fetchNotifications();
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
        } catch (error) {
            console.error('Failed to decline friend request:', error);
        }
    }

    // Utility: API fetch wrapper with token handling
    async function apiFetch(url, method = 'GET', body = null) {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.error('Access token is missing.');
            // alert('You must be logged in to access this feature.');
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
        img.src = friendData.image_base64 ? friendData.image_base64 : (friendData.image || '../images/friendicon.png');

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