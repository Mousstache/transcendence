// chat.js
window.chatSocketManuallyClosed = false;
// Function to initialize chat
async function initializeChat(loggedInUserID, chatPartnerID) {
    const threadName = [loggedInUserID, chatPartnerID].sort().join('-');

    // Close any existing WebSocket connection if it's open
    if (window.currentChatSocket) {
        console.log('[WebSocket Close] Closing existing WebSocket connection');
        window.currentChatSocket.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	const token = localStorage.getItem('accessToken');
	const socket = new WebSocket(`${protocol}//` + window.location.hostname + `:8443/ws/chat/${threadName}/?token=${token}`);

    window.currentChatSocket = socket;

    // WebSocket events
    socket.onopen = function() {
        console.log(`[WebSocket Open] WebSocket connection established for thread: ${threadName}`);
    };

    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
            const message = data.message;
            const senderID = parseInt(data.sender_id);
            const chatBody = document.querySelector('#chat-body');
    
            appendMessageToChatBody(message, senderID, chatBody);
        };
    socket.onerror = function(error) {
        console.error(`[WebSocket Error] Error occurred: ${error}`);
    };

    socket.onclose = function(event) {
		console.warn(`[WebSocket Close] WebSocket connection closed: ${event}`);
		if (!window.chatSocketManuallyClosed) {
			// Only attempt to reconnect if closure was unexpected
			setTimeout(() => initializeChat(loggedInUserID, chatPartnerID), 5000); // Retry after 5 seconds
		} else {
			console.log('[WebSocket Close] Chat socket closed manually, not reconnecting.');
			window.chatSocketManuallyClosed = false; // Reset the flag
		}
	};
	

    // Fetch and display past messages
    await fetchAndDisplayPastMessages(threadName);
	if (document.getElementById('chat-area').style.display === 'block') {
		document.getElementById('chat-message-submit').onclick = () => {
			sendMessageToWs();
		};
		document.getElementById('chat-area').onkeyup = function (e) {
			if (e.key === 'Enter') {
				sendMessageToWs();
			}
		};
	}
}

function sendMessageToWs() {
	if (window.currentChatSocket && window.currentChatSocket.readyState === WebSocket.OPEN) {
		const messageInput = document.getElementById('message_input');
		const message = messageInput.value.trim();
		if (message) {
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
}

// Function to fetch and display past messages
async function fetchAndDisplayPastMessages(threadName) {
    try {
        const API_BASE_URL = 'https://' + window.location.hostname +':8443';
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/api/message/?thread_name=${encodeURIComponent(threadName)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch past messages:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        const messages = data.results || data;

        const chatBody = document.querySelector('#chat-body');
        chatBody.innerHTML = ''; // Clear existing messages

        if (Array.isArray(messages)) {
            messages.forEach(msg => {
                const message = msg.message;
                const senderID = parseInt(msg.sender);

                appendMessageToChatBody(message, senderID, chatBody);
            });
        } else {
            console.warn('No past messages found.');
        }

        scrollToBottom();  // Scroll to the bottom after loading messages
    } catch (error) {
        console.error('Error fetching past messages:', error);
    }
}

function appendMessageToChatBody(message, senderID, chatBody) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    const parsedSenderID = parseInt(senderID);
    const parsedLoggedInUserID = parseInt(window.loggedInUserID);

    // Check if the message is sent by the logged-in user
    if (parsedSenderID === parsedLoggedInUserID) {
        messageElement.classList.add('sent');
    } else {
        messageElement.classList.add('received');
    }

    const messageContent = document.createElement('p');
    messageContent.textContent = message;

    messageElement.appendChild(messageContent);
    chatBody.appendChild(messageElement);

    // Scroll to the bottom of the chat
    scrollToBottom();
}

// Helper function to scroll to the bottom of the chat messages
function scrollToBottom() {
    const chatMessages = document.querySelector('.message-table-scroll');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Function to open chat with a friend
async function openChatWithFriend(friendUsername) {
    const loggedInUserID = window.loggedInUserID;

    if (!loggedInUserID) {
        console.error('Logged-in user ID is missing');
        return;
    }

    const friendData = await fetchUserDetails(friendUsername);
    if (!friendData) {
        console.error('Failed to fetch friend\'s details');
        return;
    }

    const friendID = friendData.id;
    console.log(friendID + " asdsadas");
    const friendImage = friendData.image_base64 || friendData.image || '../images/default_profile.png';

    window.chatPartnerID = friendID;
    window.chatPartnerUsername = friendUsername;
    window.chatPartnerData = friendData; // Store friend data globally

    const chatArea = document.getElementById('chat-area');
    chatArea.style.display = 'block';

    const chatUserElement = document.getElementById('chatUser');
    chatUserElement.textContent = friendUsername;

    const profileImageElement = document.getElementById('chat-partner-profile-picture');
    profileImageElement.src = friendImage;
    profileImageElement.classList.remove('online', 'offline');
    profileImageElement.classList.add(friendData.is_online ? 'online' : 'offline');

    // **Reset unread message count for this friend**
    if (window.unreadMessages && window.unreadMessages[friendUsername]) {
        delete window.unreadMessages[friendUsername];

        // Update the friend list UI
        updateFriendListWithUnreadCounts();

        // If there are no more unread messages, remove the glow from the friend button
        if (Object.keys(window.unreadMessages).length === 0) {
            const friendButton = document.getElementById('btn-friends');
            friendButton.classList.remove('new-message');
        }
    }

    // Initialize the chat
    initializeChat(loggedInUserID, friendID);

    // Fetch and display past messages
    await fetchAndDisplayPastMessages([loggedInUserID, friendID].sort().join('-'));
    initializeBlockUserButton();

    // **Add Click Listener to Profile Picture**
    profileImageElement.style.cursor = 'pointer'; // Indicate it's clickable
    profileImageElement.addEventListener('click', () => openFriendProfilePopup(friendUsername));
}




async function initializeBlockUserButton() {
    const blockUserButton = document.getElementById('block-user');
    if (blockUserButton) {
        blockUserButton.addEventListener('click', async function() {
            console.log("Block User clicked!");

            // Get the ID of the user to be blocked
            const userId = window.chatPartnerID;
            if (!userId) {
                console.error('No chat partner selected to block.');
                alert('No chat partner selected to block.');
                return;
            }

            // Confirm the action with the user
            const confirmation = confirm(`Are you sure you want to block ${window.chatPartnerUsername}? This will remove them from your friend list and prevent future friend requests.`);
            if (!confirmation) return;

            // Call the blockUser function
            await blockUser(userId);
        });
    } else {
        console.error('Block User button not found in the DOM.');
    }
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



// Fetch user details including online status
async function fetchUserDetails(username) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`https://` + window.location.hostname + `:8443/api/user/?username=${encodeURIComponent(username)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch user details: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        const res = data.results;
        const use = Array.isArray(res) && res.length > 0 ? res[0] : res;

        let imageBase64 = use.image_base64 || null;

        // Ensure image_base64 has the correct Data URL prefix
        if (imageBase64 && !imageBase64.startsWith('data:image')) {
            // Adjust the MIME type based on your image format (e.g., image/jpeg, image/png)
            imageBase64 = `data:image/png;base64,${imageBase64}`;
        }

        return {
            id: use.id,
            image: use.image || '../images/friendicon.png',
            image_base64: imageBase64, // Valid Data URL or null
            is_online: use.is_online || false,
        };
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}



// Initialize user information on page load
document.addEventListener('DOMContentLoaded', async function () {
    await fetchLoggedInUser();
    initializeCloseChatButton();
});

// Fetch the logged-in user info and set it to window.loggedInUser and window.loggedInUserID
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
        }
    } catch (error) {
        console.error('Failed to fetch logged-in user:', error);
    }
}

// Close chat button functionality
function initializeCloseChatButton() {
    const chatArea = document.getElementById('chat-area');
    const closeChatButton = document.getElementById('close-chat');
    if (closeChatButton) {
        closeChatButton.addEventListener('click', () => {
            chatArea.style.display = 'none';
            if (window.currentChatSocket) {
                window.chatSocketManuallyClosed = true; // Set flag before closing
                window.chatPartnerUsername = undefined
            }
        });
    }
}

// Fonction pour refuser l'invitation (peut juste retirer l'invitation de la liste)
function declineInvitation(tournamentId) {
    const invitationList = document.getElementById('invit-notification-list');
    const invitationItem = document.querySelector(`.invitation-item[data-id='${tournamentId}']`);
    if (invitationItem) {
        invitationList.removeChild(invitationItem);
    }
}
            
            
document.getElementById('block-user').addEventListener('click', function() {
    console.log("Block User clicked!");
    // Add functionality to block the user
});

document.getElementById('invite-play').addEventListener('mouseup', async function() {
    const invitedUserId = chatPartnerID;
    if (!invitedUserId) {
        console.error("No user selected for invitation.");
        return;
    }
    if (invitedUserId && window.currentChatSocket && window.currentChatSocket.readyState === WebSocket.OPEN) {
        // console.log("Sending invitation to:", invitedUserId);
        // window.currentChatSocket.send(JSON.stringify({
        //     type: 'tournament_invitation',
        //     invited_user_id: invitedUserId,
        //     tournament_id: window.location.hash.split('#')[1]
        // }));
        const token = localStorage.getItem('accessToken');
            const response = await fetch("https://" + window.location.hostname + ":8443/api/tournament-requests/", {
                method : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_to_invite: invitedUserId,
                    tournament_id: window.location.hash.split('#')[1]
                }),
            });

            if (!response.ok) {
                return null;
            }
    
            const data = await response.json();
            console.log(data);
    } else {
        console.error("WebSocket is not connected or invitedUserId is missing.");
    }
});

// Add event listener to the Block User button in the chat window
document.getElementById('block-user').addEventListener('click', async function() {
    console.log("Block User clicked!");

    // Get the ID of the user to be blocked
    const userId = window.chatPartnerID;
    if (!userId) {
        console.error('No chat partner selected to block.');
        alert('No chat partner selected to block.');
        return;
    }

    // Confirm the action with the user
    const confirmation = confirm('Are you sure you want to block this user? This will remove them from your friend list and prevent future friend requests.');
    if (!confirmation) return;

    // Call the blockUser function
    await blockUser(userId);
});

async function blockUser(userId) {

	const token = localStorage.getItem('accessToken');
	if (!token) {
		throw new Error('You must be logged in to block a user.');
	}
	const response = await fetch(`https://`+ window.location.hostname + `:8443/api/user/${userId}/block/`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.detail || 'Failed to block user.');
	}

	const data = await response.json();
	console.log('User blocked successfully:', data);

	// Update UI elements as needed
	updateChatUIAfterBlocking();
}
			

async function unblockUser(userId) {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            throw new Error('You must be logged in to unblock a user.');
        }
        const response = await fetch(`https://`  + window.location.hostname + `:8443/api/user/${userId}/unblock/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to unblock user.');
        }

        const data = await response.json();
        console.log('User unblocked successfully:', data);

    } catch (error) {
        console.error('Error in unblockUser:', error);
        // alert(error.message || 'Failed to unblock user.');
    }
}

function updateChatUIAfterBlocking() {
	console.log('je suos dansupdateChatUIAfterBlocking  ')
    // Close the chat window
    // initializeCloseChatButton;
    // Remove the user from the friend list
    // removeUserFromFriendList(window.chatPartnerUsername);
	window.location.reload();

}

function removeUserFromFriendList(username) {
    const friendItem = document.querySelector(`.friend-item[data-username="${username}"]`);
    if (friendItem) {
        friendItem.remove();
    }
}