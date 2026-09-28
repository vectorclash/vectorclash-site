var main, frame1, frame2, frame3, frame4, black, endFrame, headline;
var frame1_image, frame2_image, frame3_image, frame4_image, endFrame_image;

function init() {

	// set objects here

	main = document.querySelector("#main");

	logo = document.querySelector("#logo");

	frame1 = document.querySelector("#frame1");
	frame2 = document.querySelector("#frame2");
	frame3 = document.querySelector("#frame3");
	frame4 = document.querySelector("#frame4");
	black = document.querySelector("#black");
	endFrame = document.querySelector("#endFrame");

	headline = document.querySelector("#headline");

	frame1_image = document.querySelector("#frame1_image");
	frame2_image = document.querySelector("#frame2_image");
	frame3_image = document.querySelector("#frame3_image");
	frame4_image = document.querySelector("#frame4_image");
	endFrame_image = document.querySelector("#endFrame_image");

	// set animations here

	// frame 1
	TweenLite.set(frame1, {visibility:"visible"});
	TweenLite.set(headline, {visibility:"visible"});

	TweenLite.from(headline, 1, {alpha:0, ease:Quad.easeInOut});
	TweenLite.from(frame1_image, 1, {alpha:0, ease:Quad.easeInOut, delay:0.35});

	//  frame 2
	TweenLite.set(frame2, {visibility:"visible", delay:2});
	TweenLite.to(frame1_image, 1, {alpha:0, ease:Quad.easeInOut, delay:2});
	TweenLite.from(frame2_image, 1, {alpha:0, ease:Quad.easeInOut, delay:2});

	//  frame 3
	TweenLite.set(frame3, {visibility:"visible", delay:4.35});
	TweenLite.to(frame2_image, 1, {alpha:0, ease:Quad.easeInOut, delay:4.35});
	TweenLite.from(frame3_image, 1, {alpha:0, ease:Quad.easeInOut, delay:4.35});

	// frame 4
	TweenLite.set(frame4, {visibility:"visible", delay:6.7});
	TweenLite.to(frame3_image, 1, {alpha:0, ease:Quad.easeInOut, delay:6.7});
	TweenLite.from(frame4_image, 1, {alpha:0, ease:Quad.easeInOut, delay:6.7});


	TweenLite.set(endFrame, {visibility:"visible", delay:10});
	TweenLite.set(black, {visibility:"visible", delay:10});

	TweenLite.from(black, 1, {alpha:0, ease:Quad.easeInOut, delay:10});
	TweenLite.from(endFrame_image, 1, {y:-main.offsetHeight, ease:Quad.easeOut, delay:10});

	// set event listeners

	main.addEventListener("click", onBannerClick);
}

function onBannerClick(e) {
	window.open(window.clickTag);
}
