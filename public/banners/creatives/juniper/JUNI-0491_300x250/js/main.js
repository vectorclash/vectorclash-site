var frame1Background, frame1BackgroundImage, frame2Background, frame2BackgroundImage;
var frame1Text, frame2Text;
var logo, buildmoreText, ctaContainer, ctaStandard, ctaOver;
var mainContainer;

function init() {
	logo = document.querySelector("#logo");

	ctaStandard = document.querySelector(".cta-standard");
	ctaOver = document.querySelector(".cta-over");

	buildmoreText = document.querySelector(".buildmore-text");


	frame1BackgroundImage = document.querySelector('.frame1-background-image');
	frame1Text = document.querySelector('.frame1-text');

	frame2BackgroundImage = document.querySelector('.frame2-background-image');
	frame2Text = document.querySelector('.frame2-text');

	mainContainer = document.querySelector(".main-container");
	mainContainer.addEventListener("click", onBannerClick);
	mainContainer.addEventListener("mouseover", onBannerOver);
	mainContainer.addEventListener("mouseout", onBannerOut);

	animate();
}

function animate() {
	TweenMax.to(frame1BackgroundImage, 6, {scaleX:1.1, scaleY:1.1, ease:Linear.easeNone});
	TweenMax.to(frame1BackgroundImage, 1, {alpha:0, delay:4, ease:Quad.easeOut});
	TweenMax.from(frame2BackgroundImage, 9, {scaleX:1.2, scaleY:1.2, delay:4, ease:Quad.easeOut});

	TweenMax.to(frame1Text, 1, {x:-mainContainer.offsetWidth, delay:4, ease:Quad.easeInOut});
	TweenMax.from(frame2Text, 1, {x:mainContainer.offsetWidth, delay:4, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame2Text]});
}

function initObject(object) {
	object.style.display = "block";
}

function onBannerClick(event) {
	window.open(window.clickTag);
}

function onBannerOver(event) {
	TweenMax.to(ctaOver, 0.3, {alpha:1, ease:Quad.easeInOut});
}

function onBannerOut(event) {
	TweenMax.to(ctaOver, 0.3, {alpha:0, ease:Quad.easeInOut});
}
