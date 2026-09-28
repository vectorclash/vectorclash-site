var frame1Background, frame1ForegroundImage, frame1BackgroundImage, frame2Background, frame2BackgroundImage, frame2ForegroundImage, frame3Background, frame3ForegroundImage, frame3BackgroundImage;
var frame1Text, frame2Text, frame3Text, frame4Text;
var logo, buildmoreText, ctaContainer, cta, ctaOver;
var mainContainer;

function init() {
	logo = document.querySelector("#logo");

	ctaContainer = document.querySelector("#ctaContainer");
	cta = document.querySelector("#cta");
	ctaOver = document.querySelector("#cta-over");

	buildmoreText = document.querySelector(".buildmore-text");

	frame1Background = document.querySelector('.frame1-background');
	frame1ForegroundImage = document.querySelector('.frame1-foreground-image');
	frame1BackgroundImage = document.querySelector('.frame1-background-image');
	frame1Text = document.querySelector('.frame1-text');

	frame2Background = document.querySelector('.frame2-background');
	frame2ForegroundImage = document.querySelector('.frame2-foreground-image');
	frame2BackgroundImage = document.querySelector('.frame2-background-image');
	frame2Text = document.querySelector('.frame2-text');

	frame3Background = document.querySelector('.frame3-background');
	frame3ForegroundImage = document.querySelector('.frame3-foreground-image');
	frame3BackgroundImage = document.querySelector('.frame3-background-image');
	frame3Text = document.querySelector('.frame3-text');

	frame4Text = document.querySelector('.frame4-text');

	mainContainer = document.querySelector(".main-container");
	mainContainer.addEventListener("click", onBannerClick);
	mainContainer.addEventListener("mouseover", onBannerOver);
	mainContainer.addEventListener("mouseout", onBannerOut);

	animate();
}

function animate() {
	TweenMax.to(frame1BackgroundImage, 5, {x:-20, scaleX:1.2, scaleY:1.2, ease:Linear.easeNone});
	TweenMax.to(frame1ForegroundImage, 5, {x:40, scaleX:1.2, scaleY:1.2, alpha:0.8, ease:Linear.easeNone});

	TweenMax.to(frame1Text, 1, {x:-mainContainer.offsetWidth, delay:3, ease:Quad.easeInOut});
	TweenMax.from(frame2Text, 1, {x:mainContainer.offsetWidth, delay:3, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame2Text]});
	TweenMax.from(frame2Background, 1, {alpha:0, delay:3, ease:Quad.easeOut, onStart:initObject, onStartParams:[frame2Background]});
	TweenMax.from(frame2BackgroundImage, 6, {scaleX:1.1, scaleY:1.1, delay:3, ease:Linear.easeNone});
	TweenMax.to(frame2ForegroundImage, 6, {x:30, y:50, scaleX:1.3, scaleY:1.3, delay:3, ease:Linear.easeNone});

	TweenMax.to(frame2Text, 1, {x:-mainContainer.offsetWidth, delay:6, ease:Quad.easeInOut});
	TweenMax.from(frame3Text, 1, {x:mainContainer.offsetWidth, delay:6, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame3Text]});
	TweenMax.from(frame3Background, 1, {alpha:0, delay:6, ease:Quad.easeOut, onStart:initObject, onStartParams:[frame3Background]});
	TweenMax.to(frame3BackgroundImage, 6, {x:-10, scaleX:1.1, scaleY:1.1, delay:6, ease:Quad.easeOut});
	TweenMax.from(frame3ForegroundImage, 6, {x:-10, y:3, scaleX:0.8, scaleY:0.8, delay:6, ease:Quad.easeOut});

	TweenMax.to(frame3Text, 1, {x:-mainContainer.offsetWidth, delay:9, ease:Quad.easeInOut});
	TweenMax.from(frame4Text, 1, {x:mainContainer.offsetWidth, delay:9, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame4Text]});
}

function initObject(object) {
	object.style.display = "block";
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
