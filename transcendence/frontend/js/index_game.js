const canvas = document.querySelector('canvas');

let isGameActive = false;

let c;
if (canvas) {
    c = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 576;
}

const gravity = 1.5;
const gameWorldWidth = 5000; // Set the total length of the game world

function createImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            resolve(img);
        };
        img.onerror = () => reject(new Error(`Failed to load image at ${imageSrc}`));
    });
}

// Load custom font
const loadFont = (fontUrl) => {
    return new Promise((resolve, reject) => {
        const font = new FontFace('ARCADECLASSIC', `url(${fontUrl})`);
        font.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            resolve();
        }).catch((error) => {
            reject(error);
        });
    });
};

class Player {
    constructor(images) {
        this.position = {
            x: 500,
            y: 310
        };
        this.speed = 5;
        this.width = 80;
        this.height = 180;
        this.hitboxHeight = 120; // New hitbox height
        this.hitboxOffset = {
            x: 120, // Adjust this value to align the hitbox horizontally
            y: 60  // Adjust this value to align the hitbox vertically (centered within the player's image)
        };
        this.velocity = {
            x: 0,
            y: 1
        };
        this.isJumping = false;
        this.images = images;
        this.currentImage = images.idleRight.image;
        this.frames = 0;
        this.frameDelay = 10; // Adjust this value to control the speed of animation
        this.frameDelayCounter = 0;
        this.currentState = 'idleRight';
        this.currentFrameCount = images.idleRight.frames;
        this.currentCropWidth = images.idleRight.cropWidth;
    }

    draw() {
        const frameWidth = this.currentCropWidth; // Width of each frame
        const frameHeight = this.height; // Height of each frame (same as image height)

        c.drawImage(this.currentImage,
            frameWidth * this.frames,
            0,
            frameWidth,
            frameHeight,
            this.position.x,
            this.position.y,
            frameWidth * 2, // Scaling width for drawing
            frameHeight * 2); // Scaling height for drawing

        // Draw collision box for debugging
        // c.strokeStyle = 'red';
        // c.strokeRect(this.position.x + this.hitboxOffset.x, this.position.y + this.hitboxOffset.y, this.width, this.hitboxHeight);
    }

    update() {
        this.frameDelayCounter++;
        if (this.frameDelayCounter >= this.frameDelay) {
            this.frameDelayCounter = 0;
            this.frames++;
            if (this.frames >= this.currentFrameCount) this.frames = 0;
        }
        this.draw();
        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y <= canvas.height) {
            this.velocity.y += gravity;
        } else {
            this.velocity.y = 0;
            this.isJumping = false;
        }

        // Collision detection with platforms
        platforms.forEach(platform => {
            const hitboxBottom = this.position.y + this.hitboxOffset.y + this.hitboxHeight;
            const hitboxRight = this.position.x + this.hitboxOffset.x + this.width;
            const hitboxLeft = this.position.x + this.hitboxOffset.x;

            if (hitboxBottom <= platform.position.y &&
                hitboxBottom + this.velocity.y >= platform.position.y &&
                hitboxRight >= platform.position.x &&
                hitboxLeft < platform.position.x + platform.width) {
                this.velocity.y = 0;
                this.isJumping = false;
                this.position.y = platform.position.y - this.hitboxHeight - this.hitboxOffset.y; // Ensure the player stands on the platform
            }
        });

        // Collision detection with floating platforms
        floatingPlatforms.forEach(platform => {
            const hitboxBottom = this.position.y + this.hitboxOffset.y + this.hitboxHeight;
            const hitboxRight = this.position.x + this.hitboxOffset.x + this.width;
            const hitboxLeft = this.position.x + this.hitboxOffset.x;

            if (hitboxBottom <= platform.position.y &&
                hitboxBottom + this.velocity.y >= platform.position.y &&
                hitboxRight >= platform.position.x &&
                hitboxLeft < platform.position.x + platform.hitboxWidth) {
                this.velocity.y = 0;
                this.isJumping = false;
                this.position.y = platform.position.y - this.hitboxHeight - this.hitboxOffset.y; // Ensure the player stands on the platform
            }
        });

        // Collision detection with Security
        const adjustedSecurityPositionX1 = security1.position.x - scrollOffset;
        const adjustedSecurityPositionX2 = security2.position.x - scrollOffset;

        if (security1.isVisible &&
            this.position.x + this.width > adjustedSecurityPositionX1 &&
            this.position.x < adjustedSecurityPositionX1 + security1.width &&
            this.position.y + this.height > security1.position.y) {
				if (coinCounter >= 10) {
					isGameActive = false;
					cleanupGame();
					window.location.href = 'https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-d036124204edf2a01aa9b0877ebe8414946ec2c996380e7bf885a4e715b6e9c1&redirect_uri=https%3A%2F%2Fbess-f2r5s11.clusters.42paris.fr%3A8443&response_type=code';
				}
            // Prevent player from overlapping with security1
            if (this.position.x < adjustedSecurityPositionX1) {
                this.position.x = adjustedSecurityPositionX1 - this.width;
            } else if (this.position.x + this.width > adjustedSecurityPositionX1) {
                this.position.x = adjustedSecurityPositionX1 + security1.width;
            }
        }

        if (security2.isVisible &&
            this.position.x + this.width > adjustedSecurityPositionX2 &&
            this.position.x < adjustedSecurityPositionX2 + security2.width &&
            this.position.y + this.height > security2.position.y) {
            // Prevent player from overlapping with security2
            if (this.position.x < adjustedSecurityPositionX2) {
                this.position.x = adjustedSecurityPositionX2 - this.width;
            } else if (this.position.x + this.width > adjustedSecurityPositionX2) {
                this.position.x = adjustedSecurityPositionX2 + security2.width;
            }
        }

        // Collision detection with School
        const adjustedSchoolPositionX = school.position.x - scrollOffset;
        if (school.isVisible &&
            this.position.x + this.width > adjustedSchoolPositionX &&
            this.position.x < adjustedSchoolPositionX + school.width &&
            this.position.y + this.height > school.position.y) {
            // Prevent player from overlapping with school
            if (this.position.x < adjustedSchoolPositionX) {
                this.position.x = adjustedSchoolPositionX - this.width;
            } else if (this.position.x + this.width > adjustedSchoolPositionX) {
                this.position.x = adjustedSchoolPositionX + school.width;
            }
        }

        // Prevent player from going out of bounds
        if (this.position.x < 0) {
            this.position.x = 0;
        } else if (this.position.x + this.width > gameWorldWidth) {
            this.position.x = gameWorldWidth - this.width;
        }
    }

    jump() {
        if (!this.isJumping) {
            this.velocity.y -= 25;
            this.isJumping = true;
        }
    }

    moveLeft() {
        if (this.currentState !== 'runLeft') {
            this.setState('runLeft');
        }
        this.position.x -= this.speed;
    }

    moveRight() {
        if (this.currentState !== 'runRight') {
            this.setState('runRight');
        }
        this.position.x += this.speed;
    }

    setState(state) {
        if (this.currentState !== state) {
            this.currentState = state;
            this.currentImage = this.images[state].image;
            this.frames = 0;
            this.frameDelayCounter = 0;
            this.currentFrameCount = this.images[state].frames;
            this.currentCropWidth = this.images[state].cropWidth;
            this.currentframeDelay = this.images[state].frameDelay;
        }
    }
}

class coinIcon {
    constructor({ x, y, image, frames = 5, frameDelay = 7 }) {
        this.position = {
            x: x,
            y: y
        };
        this.image = image;
        this.width = image.width / frames;
        this.height = image.height;
        this.frames = frames;
        this.currentFrame = 0;
        this.frameDelay = frameDelay;
        this.frameCount = 0;
    }

    draw() {
        c.drawImage(
            this.image,
            this.currentFrame * this.width,
            0,
            this.width,
            this.height,
            this.position.x,
            this.position.y,
            this.width / 2,
            this.height / 2
        );
    }

    update() {
        // Handle frame animation
        this.frameCount++;
        if (this.frameCount >= this.frameDelay) {
            this.currentFrame = (this.currentFrame + 1) % this.frames;
            this.frameCount = 0;
        }
        this.draw();
    }
}

class Platform {
    constructor({ x, y, image }) {
        this.position = {
            x: x,
            y: y
        };
        this.image = image;
        this.width = image.width;
        this.height = image.height;
        this.shouldMove = false; // Add flag to control movement
    }

    draw() {
        if (this.image) {
            if (this.position.y == 505)
                c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
            else
                c.drawImage(this.image, this.position.x + (this.position.x / 4 ), this.position.y, this.width, this.height);
        }
    }

    update(dx) {
        if (this.shouldMove) {
            this.position.x += dx;
        }
    }
}

class GenericObject {
    constructor({ x, y, image, speed }) {
        this.position = {
            x: x,
            y: y
        };
        this.image = image;
        this.width = canvas.width;
        this.height = canvas.height;
        this.speed = speed;
    }

    draw() {
        if (this.image) {
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
            c.drawImage(this.image, this.position.x + this.width, this.position.y, this.width, this.height);
        }
    }

    update(dx) {
        this.position.x += dx * this.speed;
        if (this.position.x <= -this.width) {
            this.position.x = 0;
        } else if (this.position.x >= this.width) {
            this.position.x = 0;
        }
    }
}

class Security {
    constructor(frames, x, frameDelay = 10) {
        this.frames = frames; // Array of frame images
        this.frameDelay = frameDelay; // Delay in switching frames
        this.currentFrameIndex = 0; // Current frame index
        this.frameCounter = 0; // Counter for frame delay
        this.width = 300;
        this.height = 200;
        this.position = {
            x: x,
            y: 325
        };
        this.isVisible = false; // Visibility flag
    }

    draw() {
        const offsetX = this.position.x - scrollOffset;
        const currentFrame = this.frames[this.currentFrameIndex];
        c.drawImage(currentFrame, offsetX, this.position.y, this.width, this.height);

        // Update visibility flag
        this.isVisible = offsetX + this.width > 0 && offsetX < canvas.width;

        // Handle frame animation
        this.frameCounter++;
        if (this.frameCounter >= this.frameDelay) {
            this.frameCounter = 0;
            this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
        }
    }

    update() {
        this.draw();
    }
}

// Updated School class remains the same
class School {
    constructor(frames, frameDelay = 10) {
        this.frames = frames; // Array of frame images
        this.frameDelay = frameDelay; // Delay in switching frames
        this.currentFrameIndex = 0; // Current frame index
        this.frameCounter = 0; // Counter for frame delay
        this.width = 300;
        this.height = 200;
        this.position = {
            x: 0,
            y: 300
        };
        this.isVisible = true; // Visibility flag
    }

    draw() {
        const offsetX = this.position.x - scrollOffset;
        const currentFrame = this.frames[this.currentFrameIndex];
        c.drawImage(currentFrame, offsetX, this.position.y, this.width, this.height);

        // Update visibility flag
        this.isVisible = offsetX + this.width > 0 && offsetX < canvas.width;

        // Handle frame animation
        this.frameCounter++;
        if (this.frameCounter >= this.frameDelay) {
            this.frameCounter = 0;
            this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
        }
    }

    update() {
        this.draw();
    }
}

// Function to load frames
function loadFrames(framePaths) {
    return Promise.all(framePaths.map(createImage));
}

// Paths to the GIF frames for the School and Security objects
const schoolFramePaths = [
    "../images/bh/bh1.png",
    "../images/bh/bh2.png",
    "../images/bh/bh3.png",
    "../images/bh/bh4.png",
    "../images/bh/bh5.png",
    "../images/bh/bh6.png",
    "../images/bh/bh7.png",
    "../images/bh/bh8.png",
    "../images/bh/bh9.png",
];

class FloatingPlatform {
    constructor({ x, y, image, hitboxWidth = null, hitboxHeight = null }) {
        this.position = {
            x: x,
            y: y
        };
        this.image = image;
        this.width = image.width / 2;
        this.height = image.height;
        this.hitboxWidth = hitboxWidth !== null ? hitboxWidth : this.width * 2;
        this.hitboxHeight = hitboxHeight !== null ? hitboxHeight : this.height;
        this.speed = 1; // Speed multiplier for the floating platform
    }

    draw() {
        c.drawImage(
            this.image,
            this.position.x,
            this.position.y,
            this.image.width + (this.image.width / 2),
            this.height
        );

        // Draw hitbox for debugging
        // c.strokeStyle = 'green';
        // c.strokeRect(this.position.x, this.position.y, this.hitboxWidth, this.hitboxHeight);
    }

    update(dx, platformSpeed) {
        this.position.x += (dx * platformSpeed) * this.speed; // Update position with platform speed and floating platform's speed
    }
}




class Coin {
    constructor({ x, y, image, frames = 5, frameDelay = 7 }) {
        this.position = {
            x: x,
            y: y
        };
        this.image = image;
        this.width = image.width / frames;
        this.height = image.height;
        this.frames = frames;
        this.currentFrame = 0;
        this.frameDelay = frameDelay;
        this.frameCount = 0;
        this.collected = false;
    }

    draw() {
        if (!this.collected) {
            c.drawImage(
                this.image,
                this.currentFrame * this.width,
                0,
                this.width,
                this.height,
                this.position.x,
                this.position.y,
                this.width,
                this.height
            );

            // Draw collision box for debugging
            // c.strokeStyle = 'blue';
            // c.strokeRect(this.position.x, this.position.y, this.width, this.height);
        }
    }

    update(dx, platformSpeed) {
        this.position.x += (dx * platformSpeed); // Update position with platform speed and coin's speed

        // Handle frame animation
        this.frameCount++;
        if (this.frameCount >= this.frameDelay) {
            this.currentFrame = (this.currentFrame + 1) % this.frames;
            this.frameCount = 0;
        }

        // Check if the player collects the coin
        const playerLeft = player.position.x + player.hitboxOffset.x;
        const playerRight = player.position.x + player.hitboxOffset.x + player.width;
        const playerTop = player.position.y + player.hitboxOffset.y;
        const playerBottom = player.position.y + player.hitboxOffset.y + player.hitboxHeight;

        const coinLeft = this.position.x;
        const coinRight = this.position.x + this.width;
        const coinTop = this.position.y;
        const coinBottom = this.position.y + this.height;

        // Precise collision detection using AABB (Axis-Aligned Bounding Box)
        if (!this.collected &&
            playerRight > coinLeft &&
            playerLeft < coinRight &&
            playerBottom > coinTop &&
            playerTop < coinBottom &&
            playerTop <= coinBottom - (this.height / 2)) { // Player's top must reach the middle of the coin
            this.collected = true;
            coinCounter++; // Increment the coin counter
            updateCoinCounter(); // Update the displayed coin counter
        }
    }
}





class Bubble {
    constructor({ imageYes, imageNo }) {
        this.imageYes = imageYes;
        this.imageNo = imageNo;
    }

    draw(coinCounter, security) {
        const image = coinCounter >= 10 ? this.imageYes : this.imageNo; // Use the appropriate image
        const offsetX = security.position.x - 50 - scrollOffset; // Adjust the position as needed
        const offsetY = security.position.y - 30; // Adjust the position as needed
		if (security.position.x > 1000)
        	c.drawImage(image, offsetX, offsetY, image.width / 2, image.height / 2);
    }
}

const keys = {
    right: {
        pressed: false
    },
    left: {
        pressed: false
    }
};

let coinCounter = 0;

let platforms = [];
let genericObjects = [];
let player;
let school;
let security1; // Change from const to let
let security2; // Change from const to let
let coins = [];
let coinIcons = [];
let bubble;

function initCoinIcons(coinImage) {
    coinIcons.push(new coinIcon({ x: 895, y: 15, image: coinImage, frames: 5, frameDelay: 5 }));
    // Add more coin icons as needed
}

function initCoins(coinImage) {
    // Original coins
    coins.push(new Coin({ x: 580+ (580/ 2), y: 280, image: coinImage, frames: 5, frameDelay: 5 }));
    coins.push(new Coin({ x: 640+ (640/ 2), y: 280, image: coinImage, frames: 5, frameDelay: 5 }));
    coins.push(new Coin({ x: 800 + (800 /2), y: 325, image: coinImage, frames: 5, frameDelay: 5 }));
    coins.push(new Coin({ x: 980 + (980 /2), y: 230, image: coinImage, frames: 5, frameDelay: 5 }));
    coins.push(new Coin({ x: 1040 + (1040 /2), y: 230, image: coinImage, frames: 5, frameDelay: 5 }));
    // coin pour matheo
    coins.push(new Coin({ x: 2000, y: 500, image: coinImage, frames: 5, frameDelay: 5 }));
    //
    // coins.push(new Coin({ x: 1230 + (1230 /2), y:115, image: coinImage, frames: 5, frameDelay: 5 }));
    // coins.push(new Coin({ x: 1280 + (1280 /2), y:115, image: coinImage, frames: 5, frameDelay: 5 })); 
    // coins.push(new Coin({ x: 1330 + (1330 /2), y:115, image: coinImage, frames: 5, frameDelay: 5 }));
    // coins.push(new Coin({ x: 1600 + (1600 /2), y: 290, image: coinImage, frames: 5, frameDelay: 5 }));
    // coins.push(new Coin({ x: 1700 + (1700 /2), y: 290, image: coinImage, frames: 5, frameDelay: 5 }));
    // coins.push(new Coin({ x: 1800 + (1800 /2), y: 290, image: coinImage, frames: 5, frameDelay: 5 }));
    // coins.push(new Coin({ x: 1900 + (1900 /2), y: 290, image: coinImage, frames: 5, frameDelay: 5 }));

    // Now adding "STADIUM" spelled out smaller at x=2100
    const baseX = 2100;
    const baseY = 200;
    const dx = 20; // smaller horizontal spacing
    const dy = 20; // smaller vertical spacing

    // Define letter patterns (5 wide x 7 tall)
    const patterns = {
        'S': [
            "# # #",
            "     ",
            "#    ",
            "     ",
            "# # #",
            "     ",
            "    #",
            "     ",
            "# # #"
        ],
        'T': [
            "#####",
            "  #  ",
            "     ",
            "  #  ",
            "     ",
            "  #  ",
            "     ",
            "  #  ",


        ],
        'A': [
            "  #  ",
            " # # ",
            "     ",
            "#   #",
            "     ",
            "#   #",
            "     ",
			"#   #"
        ],
        'D': [
            "# #  ",
            "#   #",
            "     ",
            "#   #",
            "     ",
            "#   #",
            "# #  "
        ],
        'I': [
            "# # #",
            "  #  ",
            "     ",
            "  #  ",
            "     ",
            "  #  ",
            "# # #"
        ],
        'U': [
            "#   #",
            "     ",
            "#   #",
            "     ",
            "#   #",
            "     ",
            "# # #"
        ],
        'M': [
            "#   #",
            "## ##",
            "# # #",
            "     ",
            "#   #",
            "     ",
            "#   #"
        ],
        // Define the arrow pattern (5 wide x 7 tall)
        // This creates a right-pointing arrow shape
        '>': [
            "     ",
            "   # ",
            "     #",
            "# # # # #",
            "    #",
            "   # ",
            "     "
        ]
    };

    // Letter offsets in columns (each letter is 5 columns + 1 space = 6 columns apart)
    const offsets = { S:0, T:8, A:16, D:24, I:32, U:40, M:48, '>':56 };
    const letters = "STADIUM>".split('');

    // Add the coins for the letters
    for (let l = 0; l < letters.length; l++) {
        const letter = letters[l];
        const pattern = patterns[letter];
        const letterOffset = offsets[letter];

        for (let r = 0; r < pattern.length; r++) {
            const row = pattern[r];
            for (let c = 0; c < 5; c++) {
                if (row[c] === '#') {
                    const x = baseX + (letterOffset + c) * dx;
                    const y = baseY + r * dy;
                    coins.push(new Coin({ x: x, y: y, image: coinImage, frames: 5, frameDelay: 5 }));
                }
            }
        }
    }

    // Additional coins can be added here if needed
}


let floatingPlatforms = [];

function initFloatingPlatforms(floatingPlatformImage) {
    floatingPlatforms.push(new FloatingPlatform({ x: 800, y: 350, image: floatingPlatformImage, hitboxWidth: 300, hitboxHeight: 50 }));
    floatingPlatforms.push(new FloatingPlatform({ x: 1200, y: 100, image: floatingPlatformImage, hitboxWidth: 300, hitboxHeight: 50 }));
    floatingPlatforms.push(new FloatingPlatform({ x: 1400, y: 290, image: floatingPlatformImage, hitboxWidth: 300, hitboxHeight: 50 }));
    floatingPlatforms.push(new FloatingPlatform({ x: 1800, y:170, image: floatingPlatformImage, hitboxWidth: 300, hitboxHeight: 50 }));

}



let scrollOffset = 0;

function initPlatforms(platformImage) {
    let x = -1000;
    while (x < 6000) {
        const platform = new Platform({ x, y: 505, image: platformImage });
        platforms.push(platform);
        x += platform.width;
    }
}

function updateCoinCounter() {
    const textX = 930;
    const textY = 45;
    const textWidth = 0; // Adjust the width to cover the area where the text will be drawn
    const textHeight = 0; // Adjust the height to cover the area where the text will be drawn

    // Clear the specific area where the text will be drawn to make it transparent
    c.clearRect(textX, textY - textHeight + 20, textWidth, textHeight);

    // Draw new text on the canvas
    c.font = '24px ARCADECLASSIC';
    c.fillStyle = '#10115e';
    c.strokeStyle = 'white'; // Outline color
    c.lineWidth = 1; // Outline width
    c.fillText(`x`, textX, textY); // Adjust position as needed
    c.strokeText(`x`, textX, textY); // Outline text

    c.font = '36px ARCADECLASSIC';
    c.fillStyle = '#10115e';
    c.strokeStyle = 'white'; // Outline color
    c.lineWidth = 1; // Outline width
    c.fillText(`${coinCounter}`, textX + 25, textY); // Adjust position as needed
    c.strokeText(`${coinCounter}`, textX + 25, textY); // Outline text
}

function animate() {
    requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);

    // Draw and update backgrounds
    genericObjects.forEach((genericObject) => {
        genericObject.draw();
    });

    // Update and draw the school
    school.update();

    // Update and draw the security characters
    security1.update();
    security2.update();

    // Draw and update player
	
    // Draw and update bubble
    bubble.draw(coinCounter, security1); // Draw bubble for security1
    bubble.draw(coinCounter, security2); // Draw bubble for security2
    if (keys.right.pressed && player.position.x < 400) {
		player.moveRight();
    } else if (keys.left.pressed && player.position.x > 100) {
		player.moveLeft();
    } else {
		if (keys.right.pressed && scrollOffset + canvas.width < gameWorldWidth && player.position.x + player.width < gameWorldWidth) {
			scrollOffset += player.speed;
            platforms.forEach((platform) => {
				platform.update(-player.speed);
            });
            genericObjects.forEach((genericObject) => {
				genericObject.update(-player.speed);
            });
            coins.forEach((coin) => {
				coin.position.x -= player.speed; // Update coin position with scrolling
            });
            floatingPlatforms.forEach((floatingPlatform) => {
				floatingPlatform.position.x -= player.speed; // Update floating platform position with scrolling
            });
        } else if (keys.left.pressed && scrollOffset > 0 && player.position.x > 0) {
			scrollOffset -= player.speed;
            platforms.forEach((platform) => {
				platform.update(player.speed);
            });
            genericObjects.forEach((genericObject) => {
				genericObject.update(player.speed);
            });
            coins.forEach((coin) => {
				coin.position.x += player.speed; // Update coin position with scrolling
            });
            floatingPlatforms.forEach((floatingPlatform) => {
				floatingPlatform.position.x += player.speed; // Update floating platform position with scrolling
            });
        }
    }
	
    // Update platforms
    platforms.forEach((platform) => {
		platform.shouldMove = !security1.isVisible && !security2.isVisible; // Control platform movement
        platform.draw();
        if (school.isVisible || (!security1.isVisible && !security2.isVisible) || (keys.left.pressed && scrollOffset > 0)) {
			platform.update(keys.left.pressed ? 5 : keys.right.pressed ? -5 : 0);
        }
    });
	
    // Update and draw coins
    coins.forEach((coin) => {
		coin.update(0, keys.left.pressed ? 10 : keys.right.pressed ? -10 : 0); // Update the coins with no horizontal movement and platform speed
        coin.draw(); // Draw the coin
    });
	
    // Update and draw floating platforms
    floatingPlatforms.forEach((floatingPlatform) => {
		floatingPlatform.update(0, keys.left.pressed ? 10 : keys.right.pressed ? -10 : 0); // Update the floating platforms with no horizontal movement and platform speed
        floatingPlatform.draw(); // Draw the floating platform
    });
	
    // Update and draw coin icons
    coinIcons.forEach((icon) => {
		icon.update();
    });
	
	player.update();
    updateCoinCounter();
}

document.addEventListener('visibilitychange', () => {
    console.log("llaaaaaa");
    isGameActive = !document.hidden;
});


function handleKeydown({ keyCode }) {
    if (!isGameActive) return; // Empêche les actions si le jeu n'est pas actif

    switch (keyCode) {
        case 87: // Touche W
            player.jump();
            break;
        case 65: // Touche A
            keys.left.pressed = true;
            player.setState('runLeft');
            break;
        case 68: // Touche D
            keys.right.pressed = true;
            player.setState('runRight');
            break;
    }
}

function handleKeyup({ keyCode }) {
    if (!isGameActive) return; // Empêche les actions si le jeu n'est pas actif

    switch (keyCode) {
        case 65: // Touche A
            keys.left.pressed = false;
            player.setState('idleLeft');
            break;
        case 68: // Touche D
            keys.right.pressed = false;
            player.setState('idleRight');
            break;
    }
}

window.addEventListener('keydown', handleKeydown);
window.addEventListener('keyup', handleKeyup);


// window.addEventListener('keydown', ({ keyCode }) => {
//     console.log("valeur ==", isGameActive);
//     if (!isGameActive) return; // Empêche les actions si le jeu n'est pas actif

//     switch (keyCode) {
//         case 87: // Touche W
//             player.jump();
//             break;
//         case 65: // Touche A
//             keys.left.pressed = true;
//             player.setState('runLeft');
//             break;
//         case 68: // Touche D
//             keys.right.pressed = true;
//             player.setState('runRight');
//             break;
//     }
// });

// window.addEventListener('keyup', ({ keyCode }) => {
//     console.log("valeur =>", isGameActive);
//     if (!isGameActive) return; // Empêche les actions si le jeu n'est pas actif

//     switch (keyCode) {
//         case 65: // Touche A
//             keys.left.pressed = false;
//             player.setState('idleLeft');
//             break;
//         case 68: // Touche D
//             keys.right.pressed = false;
//             player.setState('idleRight');
//             break;
//     }
// });


// window.addEventListener('keydown', ({ keyCode }) => {
//     switch (keyCode) {
//         case 87:
//             player.jump();
//             break;
//         case 65:
//             keys.left.pressed = true;
//             player.setState('runLeft');
//             break;
//         case 68:
//             keys.right.pressed = true;
//             player.setState('runRight');
//             break;
//     }
// });

// window.addEventListener('keyup', ({ keyCode }) => {
//     switch (keyCode ) {
//         case 65:
//             keys.left.pressed = false;
//             player.setState('idleLeft');
//             break;
//         case 68:
//             keys.right.pressed = false;
//             player.setState('idleRight');
//             break;
//     }
// });

function startGame() {
    if (!document.getElementById("platformImagePath") || !document.getElementById("backgroundImagePath") || !document.getElementById("backgroundImage2Path") || !document.getElementById("backgroundImage3Path") || !document.getElementById("backgroundImage4Path") || !document.getElementById("backgroundImage5Path") || !document.getElementById("vigilImagePath") || !document.getElementById("schoolImagePath") || !document.getElementById("characterImageidlerightPath") || !document.getElementById("characterImageidleleftPath") || !document.getElementById("characterImagejumpleftPath") || !document.getElementById("characterImagejumprightPath") || !document.getElementById("characterImagerunrightPath") || !document.getElementById("characterImagerunleftPath") || !document.getElementById("coinImagePath") || !document.getElementById("floatingPlatformImagePath") || !document.getElementById("coinIconImagePath") || !document.getElementById("priceBubbleImagePath") || !document.getElementById("thumbsupBubbleImagePath"))
        return;
	isGameActive = true; // Par défaut, actif
    
    const platformImagePath = document.getElementById("platformImagePath").value;
    const backgroundImagePath = document.getElementById("backgroundImagePath").value;
    const backgroundImage2Path = document.getElementById("backgroundImage2Path").value;
    const backgroundImage3Path = document.getElementById("backgroundImage3Path").value;
    const backgroundImage4Path = document.getElementById("backgroundImage4Path").value;
    const backgroundImage5Path = document.getElementById("backgroundImage5Path").value;
    const vigilImagePath = document.getElementById("vigilImagePath").value;
    const schoolImagePath = document.getElementById("schoolImagePath").value;
    const characterImageidlerightPath = document.getElementById("characterImageidlerightPath").value;
    const characterImageidleleftPath = document.getElementById("characterImageidleleftPath").value;
    const characterImagejumpleftPath = document.getElementById("characterImagejumpleftPath").value;
    const characterImagejumprightPath = document.getElementById("characterImagejumprightPath").value;
    const characterImagerunrightPath = document.getElementById("characterImagerunrightPath").value;
    const characterImagerunleftPath = document.getElementById("characterImagerunleftPath").value;
    const coinImagePath = document.getElementById("coinImagePath").value;
    const floatingPlatformImagePath = document.getElementById("floatingPlatformImagePath").value;
    const coinIconImagePath = document.getElementById("coinIconImagePath").value;
    const noBubbleImagePath = document.getElementById("priceBubbleImagePath").value;
    const yesBubbleImagePath = document.getElementById("thumbsupBubbleImagePath").value;

    Promise.all([
        createImage(platformImagePath),
        createImage(backgroundImagePath),
        createImage(backgroundImage2Path),
        createImage(backgroundImage3Path),
        createImage(backgroundImage4Path),
        createImage(backgroundImage5Path),
        createImage(vigilImagePath),
        createImage(schoolImagePath), // We can remove this if not needed elsewhere
        createImage(characterImageidlerightPath),
        createImage(characterImageidleleftPath),
        createImage(characterImagejumpleftPath),
        createImage(characterImagejumprightPath),
        createImage(characterImagerunrightPath),
        createImage(characterImagerunleftPath),
        createImage(coinImagePath),
        createImage(floatingPlatformImagePath),
        createImage(coinIconImagePath),
        createImage(noBubbleImagePath),
        createImage(yesBubbleImagePath),
        loadFrames(schoolFramePaths) // Load the frames of the school animation
    ]).then((images) => {
        const [
            platformImage, backgroundImage, backgroundImage2, backgroundImage3, backgroundImage4, backgroundImage5,
            vigilImage, schoolImage, // We can remove this if not needed elsewhere
            characterImageidleright, characterImageidleleft, characterImagejumpleft, characterImagejumpright,
            characterImagerunright, characterImagerunleft, coinImage, floatingPlatformImage, coinIconImage, noBubbleImage, yesBubbleImage,
            schoolFrames // The frames loaded from loadFrames
        ] = images;

        player = new Player({
            idleRight: { image: characterImageidleright, frames: 7, cropWidth: 160, frameDelay:10},
            idleLeft: { image: characterImageidleleft, frames: 7, cropWidth: 160, frameDelay:10},
            jumpLeft: { image: characterImagejumpleft, frames: 6, cropWidth: 159, frameDelay: 0 },
            jumpRight: { image: characterImagejumpright, frames: 6, cropWidth: 159, frameDelay: 0 },
            runLeft: { image: characterImagerunleft, frames: 6, cropWidth: 159, frameDelay: 0 },
            runRight: { image: characterImagerunright, frames: 6, cropWidth: 159, frameDelay: 0 }
        });

        initPlatforms(platformImage);
        initFloatingPlatforms(floatingPlatformImage);
        initCoins(coinImage); // Initialize coins
        initCoinIcons(coinImage); // Initialize coin icons
        bubble = new Bubble({ imageYes: yesBubbleImage, imageNo: noBubbleImage }); // Initialize bubble with images
        
        security1 = new Security([vigilImage], 3500); // security1 uses single image
        security2 = new Security(schoolFrames, 0); // security2 uses the new GIF frames
        school = new School(schoolFrames); // Initialize school with frames

        genericObjects.push(new GenericObject({ x: 0, y: 0, image: backgroundImage, speed: 0.2 }));
        genericObjects.push(new GenericObject({ x: 0, y: 0, image: backgroundImage2, speed: 0.4 }));
        genericObjects.push(new GenericObject({ x: 0, y: 0, image: backgroundImage3, speed: 0.6 }));
        genericObjects.push(new GenericObject({ x: 0, y: 0, image: backgroundImage4, speed: 0.8 }));
        genericObjects.push(new GenericObject({ x: 0, y: 0, image: backgroundImage5, speed: 1.0 }));
        
        document.getElementById("Skip").addEventListener('click', () => {
            isGameActive = false;
            cleanupGame();
            window.location.href = 'https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-d036124204edf2a01aa9b0877ebe8414946ec2c996380e7bf885a4e715b6e9c1&redirect_uri=https%3A%2F%2Fbess-f2r5s11.clusters.42paris.fr%3A8443&response_type=code';
        });
        
        animate();
    }).catch(error => {
        console.error("Error loading images:", error);
    });
}

const fontPath = '../font/ARCADE_N.TTF';

loadFont(fontPath).then(() => {
    startGame();
});

// Fonction pour nettoyer le jeu
function cleanupGame() {
    isGameActive = false;
    // Supprimer les gestionnaires d'événements
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    console.log("Le jeu a été interrompu avec succès.");
}