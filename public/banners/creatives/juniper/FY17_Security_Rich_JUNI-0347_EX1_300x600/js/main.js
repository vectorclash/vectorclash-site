var mainContainer;
var frameOne, frameTwo, frameOneImage, cta, frameTwoText1, frameTwoText2, frameTwoText3, frameTwoLogo;
var colors = [0x3e5c29, 0x6fc053, 0x141e0d, 0x4b6a2f, 0x235f2c, 0x5aa549, 0x370069];

function init() {
	frameOne = document.querySelector('.frame-one');
	frameOneImage = document.querySelector('.frame-one-image');
	frameTwo = document.querySelector('.frame-two');
	frameTwoText1 = document.querySelector('.frame-two-text1');
	frameTwoText2 = document.querySelector('.frame-two-text2');
	frameTwoText3 = document.querySelector('.frame-two-text3');
	frameTwoLogo = document.querySelector('.frame-two-logo');
	
	cta = document.querySelector('.cta');
	cta.innerHTML = "<span class='cta-text'>" + configOBject.banner.ctaText + "</span>";
	var ctaBack = document.createElement('div');
	ctaBack.classList.add('cta-back');
	TweenMax.set(ctaBack, {transformOrigin:"50% 100%"});
	cta.appendChild(ctaBack);

	mainContainer = document.querySelector("main");
	mainContainer.addEventListener("click", onBannerClick);
	mainContainer.addEventListener("mouseover", onBannerOver);
	mainContainer.addEventListener("mouseout", onBannerOut);

	animate();
}

function animate() {
	// fade in back elements after frame 1 starts animating
	TweenMax.to(frameTwo, 0.2, {alpha:1, delay:3});
	TweenMax.to(cta, 0.2, {alpha:1, delay:3});

	TweenMax.delayedCall(1, glitch, [frameOneImage, 3, 0.07, 30]);
	TweenMax.delayedCall(4, glitch, [frameOneImage, 4, 0.2, 30]);
	TweenMax.delayedCall(8, glitch, [frameOneImage, 2, 0.07, 30]);
	TweenMax.delayedCall(8.3, glitch, [frameTwo, 3, 0.07, 30]);
	TweenMax.to(frameOneImage, 0.2, {alpha:0, delay:8.2, ease:Quad.easeOut});

	TweenMax.from(frameTwoText1, 1, {y:77, ease:Quad.easeInOut, delay:10});
	TweenMax.from(frameTwoText2, 1, {x:mainContainer.clientWidth, ease:Quad.easeOut, delay:10.5});
	TweenMax.from(frameTwoText3, 1, {x:mainContainer.clientWidth, ease:Quad.easeOut, delay:11});
	//TweenMax.from(frameTwoLogo, 1, {y:100, ease:Quad.easeInOut, delay:12});
	TweenMax.from(cta, 1, {y:100, ease:Back.easeOut, delay:11.5});
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

function onBannerOver(event) {
	var ctaText = cta.getElementsByClassName('cta-text');
	var ctaBack = cta.getElementsByClassName('cta-back');
	TweenMax.to(ctaText, 0.3, {color:0xFFFFFF});
	TweenMax.to(ctaBack, 0.3, {height:"100%", ease:Expo.easeOut});
}

function onBannerOut(event) {
	var ctaText = cta.getElementsByClassName('cta-text');
	var ctaBack = cta.getElementsByClassName('cta-back');
	TweenMax.to(ctaText, 0.2, {color:0x70bf52, ease:Expo.easeOut});
	TweenMax.to(ctaBack, 0.3, {height:"0%", ease:Expo.easeOut});
}
