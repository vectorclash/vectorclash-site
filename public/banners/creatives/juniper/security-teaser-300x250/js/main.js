var mainContainer;
var frameOne, frameOneImage, frameTwo, frameTwoImage;
var colors = [0x3e5c29, 0x6fc053, 0x141e0d, 0x4b6a2f, 0x235f2c, 0x5aa549, 0x370069];

function init() {
	frameOne = document.querySelector('.frame-one');
	frameOneImage = document.querySelector('.frame-one-image');

	frameTwo = document.querySelector('.frame-two');
	frameTwoImage = document.querySelector('.frame-two-image');

	mainContainer = document.querySelector("main");
	mainContainer.addEventListener("click", onBannerClick);

	animate();
}

function animate() {
	TweenMax.to(frameOneImage, 0.5, {alpha:1, ease:Quad.easeInOut, delay:2.2});
	TweenMax.delayedCall(2, glitch, [frameTwoImage, 3, 0.07, 30]);
	TweenMax.delayedCall(2.2, glitch, [frameOneImage, 3, 0.07, 30]);
	TweenMax.delayedCall(7, glitch, [frameOneImage, 4, 0.2, 30]);
	TweenMax.delayedCall(11, glitch, [frameOneImage, 5, 0.07, 30]);
}

function glitch(element, intensity, duration, pixelDensity) {
	var glitchAmount = Math.ceil(duration / 0.1);
	for (var g = 0; g < glitchAmount; g++) {
		TweenMax.delayedCall(0.1+(0.1*g), glitchOverlay, [pixelDensity]);
	}

	for (var i = 0; i < intensity; i++) {
		for (var j = 0; j < intensity; j++) {
			var newElement = element.cloneNode(true);
			element.parentNode.appendChild(newElement);
			var ranXOffset = getRandomArbitrary(-20, 20);
			var ranYOffset = getRandomArbitrary(-20, 20);
			var ranSkew = getRandomArbitrary(-5, 5);
			var ranOpacity = 0.1 + Math.random() * 0.8;
			var ranDelay = Math.random() * 0.2;
			TweenMax.set(newElement, {alpha:0, filter:'hue-rotate(' + Math.round(getRandomArbitrary(-180, 180)) + 'deg)'});
			TweenMax.to(newElement, duration, {x:ranXOffset, y:ranYOffset, skewY:ranSkew, alpha:ranOpacity, ease:Quad.easeInOut, delay:(j*0.05)+ranDelay, onComplete:destroyClone, onCompleteParams:[newElement]});
		}
	}
}

function glitchOverlay(density) {
	var glitchContainer = document.createElement('div');
	glitchContainer.classList.add('glitch-container');
	mainContainer.appendChild(glitchContainer);

	var colNum = density;
	var pixelWidth = mainContainer.clientWidth / colNum;
	var rowNum = mainContainer.clientHeight / pixelWidth;

	for (var i = 0; i < colNum; i++) {
		for (var j = 0; j < rowNum; j++) {
			var chanceOfUse = Math.random();
			if(chanceOfUse > 0.8) {
				var pixel = document.createElement('div');
				pixel.classList.add('pixel');
				glitchContainer.appendChild(pixel);
				var color = getRandomArrayItem(colors);
				// if(color == colors[colors.length-1]) {
				// 	color = Math.random() * 0xFFFFFF;
				// }
				var ranOpacity = Math.random();
				TweenMax.set(pixel, {alpha:0, width:pixelWidth, height:pixelWidth, x:pixelWidth*i, y:pixelWidth*j, backgroundColor:color});
				TweenMax.to(pixel, 0.1, {alpha:ranOpacity, delay:Math.random()*0.02});
				TweenMax.to(pixel, 0.1, {alpha:0, delay:0.1+Math.random()*0.05});
			}
		}
	}

	TweenMax.delayedCall(0.4, function(){mainContainer.removeChild(glitchContainer);});
}

// UTILITIES

function getRandomArrayItem(array) {
	var ranItem = array[Math.floor(Math.random() * array.length)];
	if(ranItem) {
		return ranItem;
	}
}

function destroyClone(object) {
	object.parentNode.removeChild(object);
}

function getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
}

function initObject(object) {
	object.style.display = "block";
}

// EVENT HANDLERS

function onBannerClick(event) {
	window.open(window.clickTag);
}
