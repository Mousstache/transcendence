document.addEventListener('DOMContentLoaded', function() {
	const image = document.getElementById('rotating-image');
	setTimeout(() => {
		image.classList.add('rotate');
	}, 100); // Start the animation shortly after the page loads
});
