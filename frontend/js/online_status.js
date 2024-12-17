import { refreshAccessToken } from './token.js';
import { isTokenExpired } from './token.js';
import { getCookie } from './token.js';

// Ensure that window.loggedInUser and window.loggedInUserID are set
if (getCookie('login') && getCookie('email')) {
    if (!window.loggedInUser || !window.loggedInUserID) {
        async function fetchLoggedInUser() {
            try {
                let token = localStorage.getItem('accessToken');
                console.log('[online_status.js] Current Access Token:', token);

                // Check if token is missing or expired, then refresh
                if (!token || isTokenExpired(token)) {
                    console.log("[online_status.js] Token missing or expired, refreshing...");
                    await refreshAccessToken();
                    token = localStorage.getItem('accessToken');
                }

                if (!token) {
                    console.error('[online_status.js] No token found after refresh.');
                    return;
                }

                const response = await fetch('https://' + window.location.hostname + ':8443/api/current-user/', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);

                const data = await response.json();
                if (data && data.id) {
                    window.loggedInUserID = data.id;
                    window.loggedInUser = data.username;
                    console.log('[online_status.js] Fetched loggedInUser:', window.loggedInUser, 'ID:', window.loggedInUserID);
                }
            } catch (error) {
                console.error('Failed to fetch logged-in user:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', async function () {
            await fetchLoggedInUser();
            initializeOnlineStatusWebSocket();
            renderFriendList();
        });
    } else {
        // loggedInUser and loggedInUserID already set
        document.addEventListener('DOMContentLoaded', () => {
            initializeOnlineStatusWebSocket();
            renderFriendList();
        });
    }
}

function initializeOnlineStatusWebSocket() {
    if (!window.loggedInUser) {
        console.log("[online_status.js] No loggedInUser defined, cannot init online socket.");
        return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.error("Access token is missing, cannot initialize WebSocket.");
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    console.log("[online_status.js] Initializing WS with protocol:", protocol);

    const onlineSocket = new WebSocket(`${protocol}//${window.location.hostname}:8443/ws/online/?token=${token}`);

    onlineSocket.onopen = function() {
        console.log("[online_status.js] OnlineStatus WebSocket opened.");
        onlineSocket.send(JSON.stringify({
            'username': window.loggedInUser,
            'type': 'open'
        }));
    };

    onlineSocket.onclose = function(event) {
        console.warn("[OnlineStatus] WebSocket closed:", event);
        setTimeout(initializeOnlineStatusWebSocket, 5000);
    };

    onlineSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log("[online_status.js] Message received:", data);

        if (data.type === 'USER_ONLINE') {
            updateUserOnlineStatus(data.user, true);
        } else if (data.type === 'USER_OFFLINE') {
            updateUserOnlineStatus(data.user, false);
        }
    };

    onlineSocket.onerror = function(error) {
        console.error("[OnlineStatus] WebSocket error:", error);
    };

    window.addEventListener("beforeunload", () => {
        console.log("[online_status.js] Sending close event before unload.");
        onlineSocket.send(JSON.stringify({
            'username': window.loggedInUser,
            'type': 'close'
        }));
        onlineSocket.close();
    });
}

// Update a user's online status in the lists
function updateUserOnlineStatus(username, isOnline) {
    console.log('[online_status.js] updateUserOnlineStatus:', username, 'isOnline:', isOnline);
    updateFriendListUserStatus(username, isOnline);
    if (window.chatPartnerUsername === username) {
        updateChatPartnerStatus(isOnline);
    }
}

function updateFriendListUserStatus(username, isOnline, isBlocked = false) {
    console.log('[online_status.js] updateFriendListUserStatus:', username, 'isOnline:', isOnline, 'isBlocked:', isBlocked);
    const friendElement = document.querySelector(`li.friend[data-username="${username}"]`);
    const onlineFriendListContainer = document.getElementById('online-friend-list');
    const offlineFriendListContainer = document.getElementById('offline-friend-list');
    const blockedFriendListContainer = document.getElementById('blocked-friend-list');

    console.log('[online_status.js] friendElement found?', friendElement);
    if (!friendElement) {
        console.log('[online_status.js] No friendElement found for username:', username);
        return; // Can't move user if we don't find their element
    }

    if (isBlocked) {
        if (blockedFriendListContainer && friendElement.parentNode !== blockedFriendListContainer) {
            friendElement.remove();
            blockedFriendListContainer.appendChild(friendElement);
            console.log('[online_status.js] Moved', username, 'to blocked list.');
        }
    } else {
        if (isOnline) {
            if (onlineFriendListContainer && friendElement.parentNode !== onlineFriendListContainer) {
                console.log('[online_status.js] Moving', username, 'to online list.');
                friendElement.remove();
                onlineFriendListContainer.appendChild(friendElement);
            }
        } else {
            if (offlineFriendListContainer && friendElement.parentNode !== offlineFriendListContainer) {
                console.log('[online_status.js] Moving', username, 'to offline list.');
                friendElement.remove();
                offlineFriendListContainer.appendChild(friendElement);
            }
        }
    }
}

// Toggle friend section function to collapse or expand sections
function toggleFriendSection(section) {
    const sectionDiv = document.getElementById(`${section}-friends-section`);
    const toggleIcon = document.getElementById(`${section}-section-toggle`);

    if (!sectionDiv) {
        console.warn('[online_status.js] No section div found for', section);
        return;
    }

    if (sectionDiv.classList.contains('collapsed')) {
        sectionDiv.classList.remove('collapsed');
        toggleIcon.textContent = '-';
    } else {
        sectionDiv.classList.add('collapsed');
        toggleIcon.textContent = '+';
    }
}

// document.addEventListener('DOMContentLoaded', () => {
//     const offlineSection = document.getElementById('offline-friends-section');
//     if (offlineSection) offlineSection.classList.add('collapsed');
// });

// Update the chat partner's online status halo
function updateChatPartnerStatus(isOnline) {
    const profileImageElement = document.getElementById('chat-partner-profile-picture');
    if (profileImageElement) {
        profileImageElement.classList.remove('online', 'offline');
        if (isOnline) {
            profileImageElement.classList.add('online');
        } else {
            profileImageElement.classList.add('offline');
        }
    }
}

// Function to render the friend list
async function renderFriendList() {
    console.log('[online_status.js] renderFriendList called.');
    const onlineFriendListContainer = document.getElementById('online-friend-list');
    const offlineFriendListContainer = document.getElementById('offline-friend-list');

    if (!onlineFriendListContainer || !offlineFriendListContainer) {
        console.error('[online_status.js] Missing online/offline friend list containers.');
        return;
    }

    try {
        let token = localStorage.getItem('accessToken');
        if(!token) {
            console.warn("[online_status.js] No token found, cannot fetch friend list");
            return;
        }
        if (isTokenExpired(token)) {
            console.log("[online_status.js] Token expired, refreshing...");
            await refreshAccessToken();
            token = localStorage.getItem('accessToken');
        }

        console.log("[online_status.js] Using token for friend fetch:", token);
        const response = await fetch('https://' + window.location.hostname + ':8443/api/friend/', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Failed to fetch friends: ${response.status}`);

        const data = await response.json();
        onlineFriendListContainer.innerHTML = '';
        offlineFriendListContainer.innerHTML = '';

        if (data && data.results) {
            const uniqueFriends = new Set();
            for (const friend of data.results) {
                let friendUsername = '';
                if (friend.friend === window.loggedInUser) {
                    friendUsername = friend.friend_with;
                } else if (friend.friend_with === window.loggedInUser) {
                    friendUsername = friend.friend;
                } else {
                    continue;
                }

                if (!uniqueFriends.has(friendUsername)) {
                    uniqueFriends.add(friendUsername);
                    const friendData = await fetchUserDetails(friendUsername);

                    if (friendData) {
                        const friendElement = document.createElement('li');
                        friendElement.classList.add('friend');
                        friendElement.setAttribute('data-username', friendUsername);
                        friendElement.innerHTML = `
                            <img src="${friendData.image}" alt="${friendUsername}" class="profile-image">
                            <span>${friendUsername}</span>
                            <span class="status-indicator" id="${friendUsername}-status"></span>
                        `;

                        friendElement.onclick = () => openChatWithFriend(friendUsername);

                        if (friendData.is_online) {
                            console.log('[online_status.js] Adding', friendUsername, 'to online list.');
                            onlineFriendListContainer.appendChild(friendElement);
                        } else {
                            console.log('[online_status.js] Adding', friendUsername, 'to offline list.');
                            offlineFriendListContainer.appendChild(friendElement);
                        }

                        // Ensure correct status
                        updateFriendListUserStatus(friendUsername, friendData.is_online);
                    } else {
                        console.warn('[online_status.js] No friendData for', friendUsername);
                    }
                }
            }
        } else {
            console.log('[online_status.js] No friend results found.');
        }
    } catch (error) {
        console.error('Error rendering friend list:', error);
    }
}

// Function to fetch user details
async function fetchUserDetails(username) {
    console.log('[online_status.js] fetchUserDetails for', username);
    try {
        let token = localStorage.getItem('accessToken');
        if (!token || isTokenExpired(token)) {
            console.log("[online_status.js] Need to refresh token in fetchUserDetails");
            await refreshAccessToken();
            token = localStorage.getItem('accessToken');
        }

        const response = await fetch(`https://${window.location.hostname}:8443/api/user/?username=${encodeURIComponent(username)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Failed to fetch user details: ${response.status}`);
        const data = await response.json();

        const user = data.results?.[0] || data[0] || data;

        console.log('[online_status.js] User details fetched for', username, ':', user);

        return {
            id: user.id,
            image: user.image || '../images/friendicon.png',
            is_online: user.is_online || false,
        };
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

// Initial collapsed state for offline and blocked users sections
// document.addEventListener('DOMContentLoaded', () => {
//     const offlineSection = document.getElementById('offline-friends-section');
//     if (offlineSection) offlineSection.classList.add('collapsed');
// });
