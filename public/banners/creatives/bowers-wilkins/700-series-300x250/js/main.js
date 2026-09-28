var mainContainer, logo, cta, frame1Text, frame2Text, frame3Text, background;

function init() {
	logo = document.querySelector('.logo');
	cta = document.querySelector('.cta');
	frame1Text = document.querySelector('.text-frame1');
	frame2Text = document.querySelector('.text-frame2');
	frame3Text = document.querySelector('.text-frame3');
	background = document.querySelector('.background');

	mainContainer = document.querySelector(".main-container");
	mainContainer.addEventListener("click", onBannerClick);
	mainContainer.addEventListener("mouseover", onBannerOver);
	mainContainer.addEventListener("mouseout", onBannerOut);

	animate();
}

function animate() {
	TweenMax.to(background, 10, {x:33, ease:Quad.easeOut});

	TweenMax.from(frame1Text, 0.5, {x:-(mainContainer.clientWidth), ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame1Text]});

	TweenMax.from(frame2Text, 0.5, {x:-(mainContainer.clientWidth), ease:Quad.easeInOut, delay:2, onStart:initObject, onStartParams:[frame2Text]});
	TweenMax.to(frame2Text, 0.5, {x:mainContainer.clientWidth, ease:Quad.easeInOut, delay:6});

	TweenMax.from(frame3Text, 0.5, {x:-(mainContainer.clientWidth), ease:Quad.easeInOut, delay:6, onStart:initObject, onStartParams:[frame3Text]});

	TweenMax.from(cta, 0.5, {y:20, alpha:0, ease:Quad.easeInOut, delay:8, onStart:initObject, onStartParams:[cta]});
}

function initObject(object) {
	object.style.display = "block";
}

function onBannerClick(event) {
	window.open(window.clickTag);
}

function onBannerOver(event) {

}

function onBannerOut(event) {

}
