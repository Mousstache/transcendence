export function parseJwt(token) {
	if (!token) return null;
	const base64Url = token.split('.')[1];
	const base64 = decodeURIComponent(atob(base64Url)
		.split('')
		.map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
		.join(''));
	return JSON.parse(base64);
}

// Fonction pour vérifier si un token est expiré
export function isTokenExpired(token) {
	const decoded = parseJwt(token);
	if (!decoded || !decoded.exp) return true; // Token non décodable ou sans date d'expiration
	const now = Math.floor(Date.now() / 1000); // Temps actuel en secondes
	return decoded.exp < now;
}

export async function refreshAccessToken(refreshToken) {
	if (!refreshToken) { 
		return;
	}
	try {
		const response = await fetch('https://' + window.location.hostname + ':8443/api/token/refresh/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refresh: refreshToken })
		});

		if (response.ok) {
			const data = await response.json();
			localStorage.setItem('accessToken', data.access);
			return data.access;  // Stockez le nouveau token d'accès
		} else {
			return
			// throw new Error('Failed to refresh token');
		}
	} catch (error) {
		return
		// console.error('Error refreshing token:', error);
		// throw error;
	}
}

export async function obtainNewToken(username, email) {
	try {
		const response = await fetch('https://' + window.location.hostname + ':8443/api/token/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username: username,
				email: email,
			})
		});

		if (response.status === 401) {
			console.log('Token expired or invalid');
			const refreshToken = getRefreshToken();
			if (refreshToken)
				return refreshAccessToken(refreshToken);
			else
				throw new Error('No refresh token available');
		}
		else if (response.ok) {
			console.log("setItem")
			const data = await response.json();
			localStorage.setItem('accessToken', data.access);
			localStorage.setItem('refreshToken', data.refresh);
			return data.access;
		}
		else
			throw new Error('Failed to obtain token');
	}
	catch (error) {
		console.error('Error obtaining token:', error);
		throw error;
	}
}

export function getCookie(name) {
	let cookieValue = null;
	const cookies = document.cookie.split(';');

	for (let i = 0; i < cookies.length; i++) {
		let cookie = cookies[i].trim();
		if (cookie.substring(0, name.length + 1) === (name + '=')) {
			cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
			// Nettoyer les guillemets doubles autour de la valeur
			cookieValue = cookieValue.replace(/^"|"$/g, '');
			break;
		}
	}
	return cookieValue;
}

export function getRefreshToken() {
	return localStorage.getItem('refreshToken');
}

export async function getAccessToken() {
	let accessToken = localStorage.getItem('accessToken');
	const refreshToken = localStorage.getItem('refreshToken');

	if (accessToken && !isTokenExpired(accessToken))
		return accessToken; // Token valide
	else if (refreshToken && !isTokenExpired(refreshToken))
		return await refreshAccessToken(refreshToken); // Access token expiré, rafraîchissez-le
	else {
		console.log("assdsa\n");
		// Aucun token disponible, obtenez un nouveau token
		const login = getCookie('login');
		const email = getCookie('email'); // Remplacez par la méthode pour obtenir le nom d'utilisateur
		return await obtainNewToken(login, email);
	}
}
