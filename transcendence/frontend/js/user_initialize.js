async function initializeUser() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            // Fetch current user from the API
            const response = await fetch('https://' + window.location.hostname + ':8443/api/current-user/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                window.loggedInUser = data.username;  // Set the logged-in username globally
                console.log(`Logged-in user set as: ${window.loggedInUser}`);
            } else {
                console.error('Failed to fetch current user:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    } else {
        console.error('No access token found.');
    }
}
function updateNotificationIcon() {
    const notificationIcon = document.querySelector('#btn-notifications img');
    if (notificationIcon) {
        notificationIcon.src = "../images/new_notif_icon.png";
        console.log("Notification icon updated.");
    } else {
        console.error("Notification icon not found.");
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize the logged-in user after the auth process
    await initializeUser();

    // Now that we have the logged-in user, we can proceed with the rest of the app functionality
    if (window.loggedInUser) {
		const token = localStorage.getItem('accessToken');
        // Initialize WebSocket and handle friend requests, notifications, etc.
        const notificationSocket = new WebSocket(`wss://` + window.location.hostname + `:8443/ws/notify/?token=${token}`);

        notificationSocket.onopen = function() {
            console.log("WebSocket connection opened.");
        };

        notificationSocket.onmessage = function(event) {
			const data = JSON.parse(event.data);
			console.log("WebSocket message received: ", data);
		
			if (data.type === 'FRIEND_REQUEST') {
				const sender = data.sender;
				console.log('Friend request received from: ' + sender);
		
				updateNotificationIcon();  // Ensure this function is defined
			}
		};

        // Other WebSocket logic...
    } else {
        console.error('Logged-in user not available.');
    }
});
