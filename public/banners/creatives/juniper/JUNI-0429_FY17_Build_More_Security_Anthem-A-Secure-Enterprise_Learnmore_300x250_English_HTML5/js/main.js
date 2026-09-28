var frame1Background, frame1BackgroundImage, frame1ForegroundImage, frame2Background, frame2BackgroundImage, frame2ForegroundImage, bokehContainer, frame3Background, frame3BackgroundImage, frame3ForegroundImage1, frame3ForegroundImage2;
var frame1Text, frame2Text, frame3Text, frame4Text;
var logo, buildmoreText, ctaContainer, cta, ctaOver;;
var bokehImages = ['images/bokeh-one.png', 'images/bokeh-two.png', 'images/bokeh-three.png', 'images/bokeh-four.png'];
var bokehNum = 100;
var mainContainer;

function init() {
	logo = document.querySelector("#logo");

	ctaContainer = document.querySelector("#ctaContainer");
	cta = document.querySelector("#cta");
	ctaOver = document.querySelector("#cta-over");

	buildmoreText = document.querySelector(".buildmore-text");

	frame1Background = document.querySelector('.frame1-background');
	frame1BackgroundImage = document.querySelector('.frame1-background-image');
	frame1ForegroundImage = document.querySelector('.frame1-foreground-image');

	frame1Text = document.querySelector('.frame1-text');

	frame2Background = document.querySelector('.frame2-background');
	frame2BackgroundImage = document.querySelector('.frame2-background-image');
	frame2ForegroundImage = document.querySelector('.frame2-foreground-image');
	bokehContainer = document.querySelector('.bokeh-container');

	frame2Text = document.querySelector('.frame2-text');

	frame3Background = document.querySelector('.frame3-background');
	frame3BackgroundImage = document.querySelector('.frame3-background-image');
	frame3ForegroundImage1 = document.querySelector('.frame3-foreground-image1');
	frame3ForegroundImage2 = document.querySelector('.frame3-foreground-image2');

	frame3Text = document.querySelector('.frame3-text');

	frame4Text = document.querySelector('.frame4-text');

	mainContainer = document.querySelector(".main-container");
	mainContainer.addEventListener("click", onBannerClick);
	mainContainer.addEventListener("mouseover", onBannerOver);
	mainContainer.addEventListener("mouseout", onBannerOut);

	animate();
}

function animate() {
	TweenMax.from(frame1ForegroundImage, 5, {x:-50, ease:Linear.easeNone});
	TweenMax.from(frame1BackgroundImage, 5, {scaleX:1.3, scaleY:1.3, skewY:-10, rotation:20, ease:Linear.easeNone});

	TweenMax.to(frame1Text, 1, {x:-mainContainer.offsetWidth, delay:3, ease:Quad.easeInOut});
	TweenMax.from(frame2Text, 1, {x:mainContainer.offsetWidth, delay:3, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame2Text]});
	TweenMax.from(frame2Background, 1, {alpha:0, delay:3, ease:Quad.easeOut, onStart:initObject, onStartParams:[frame2Background]});
	TweenMax.to(frame2BackgroundImage, 6, {scaleX:1.1, scaleY:1.1, delay:3, ease:Linear.easeNone});
	TweenMax.to(frame2ForegroundImage, 6, {y:20, scaleX:1.5, scaleY:1.5, delay:3, ease:Linear.easeNone});
	TweenMax.to(bokehContainer, 6, {scaleX:1.5, scaleY:1.5, delay:3, ease:Linear.easeNone, onStart:animateBokeh, onStartParams:[bokehContainer]});

	TweenMax.to(frame2Text, 1, {x:-mainContainer.offsetWidth, delay:6, ease:Quad.easeInOut});
	TweenMax.from(frame3Text, 1, {x:mainContainer.offsetWidth, delay:6, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame3Text]});
	TweenMax.from(frame3Background, 1, {alpha:0, delay:6, ease:Quad.easeOut, onStart:initObject, onStartParams:[frame3Background]});
	TweenMax.from(frame3BackgroundImage, 6, {x:-20, scaleX:1.2, scaleY:1.2, delay:6, ease:Quad.easeOut});
	TweenMax.from(frame3ForegroundImage1, 6, {x:50, scaleX:0.7, scaleY:0.7, delay:6, ease:Quad.easeOut});
	TweenMax.from(frame3ForegroundImage2, 6, {alpha:0.5, x:10, y:40, skewY:10, scaleX:0.8, scaleY:0.6, delay:6, ease:Quad.easeOut});

	TweenMax.to(frame3Text, 1, {x:-mainContainer.offsetWidth, delay:9, ease:Quad.easeInOut});
	TweenMax.from(frame4Text, 1, {x:mainContainer.offsetWidth, delay:9, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame4Text]});
}

function initObject(object) {
	object.style.display = "block";
}

function animateBokeh(container) {
	for (var i = 0; i < bokehNum; i++) {
		var newBokeh = document.createElement('div');
		newBokeh.classList.add('bokeh');
		var ranBokeh = Math.round(Math.random() * 3);
		var ranX = Math.random() * mainContainer.offsetWidth;
		var ranY = Math.random() * mainContainer.offsetHeight;
		TweenMax.set(newBokeh, {backgroundImage: 'url(' + bokehImages[ranBokeh] + ')', x:ranX, y:ranY, alpha: getRandomArbitrary(0.2, 0.7)});
		container.appendChild(newBokeh);

		// animate bokeh particle
		TweenMax.to(newBokeh, 6, {x:getRandomArbitrary(ranX-10, ranX+10), y:getRandomArbitrary(ranY-10, ranY+10), ease:Quad.easeInOut});
		TweenMax.to(newBokeh, 2, {alpha:0, delay: Math.random() * 4, ease:Quad.easeInOut});
		TweenMax.from(newBokeh, 2, {alpha:0, delay: Math.random() * 2, ease:Quad.easeInOut});
	}
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function onBannerClick(event) {
	window.open(window.clickTag);
}

function onBannerOver(event) {
	TweenMax.to(cta, 0.3, {y:-28, ease:Quad.easeInOut});
	TweenMax.to(ctaOver, 0.3, {y:-28, ease:Quad.easeInOut});
}

function onBannerOut(event) {
	TweenMax.to(cta, 0.3, {y:-1, ease:Quad.easeInOut});
	TweenMax.to(ctaOver, 0.3, {y:-1, ease:Quad.easeInOut});
}
