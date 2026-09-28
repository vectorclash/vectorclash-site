var main;
var step1, step2, step3;
var text1, text2, text3;
var logo;
var left_building, middle_building, right_building;
var icon;
var sun;
var sun_icon;
var end_footer;
var end_text;
var cta;
var cta_arrow;
var cta_text;

function init() {

	// set objects here

	main = document.getElementById("main");
	step1 = document.getElementById("step1");
	step2 = document.getElementById("step2");
	step3 = document.getElementById("step3");
	text1 = document.getElementById("text1");
	text2 = document.getElementById("text2");
	text3 = document.getElementById("text3");
	logo = document.getElementById("logo");
	left_building = document.getElementById("left_building");
	TweenLite.set(left_building, {transformOrigin:"35% 95%"});
	middle_building = document.getElementById("middle_building");
	TweenLite.set(middle_building, {transformOrigin:"65% 95%"});
	right_building = document.getElementById("right_building");
	TweenLite.set(right_building, {transformOrigin:"85% 95%"});
	icon = document.getElementById("icon");
	TweenLite.set(icon, {transformOrigin:"55% 100%"});
	sun = document.getElementById("sun");
	TweenLite.set(sun, {transformOrigin:"60% 70%"});
	sun_icon = document.getElementById("sun_icon");
	TweenLite.set(sun_icon, {transformOrigin:"60% 75%"});
	end_footer = document.getElementById("end_footer");
	end_text = document.getElementById("end_text");
	cta = document.getElementById("cta");
	cta_arrow = document.getElementById("cta_arrow");
	cta_text = document.getElementById("cta_text");

	// set event listeners

	main.addEventListener('click', onBannerClick);
	main.addEventListener('mouseover', onBannerOver);
	main.addEventListener('mouseout', onBannerOut);

	animate();
}

function animate() {
	TweenLite.to(text1, 0.5, {alpha:1});
	TweenLite.to(right_building, 0.5, {alpha:1});
	TweenLite.to(icon, 0.5, {alpha:1, delay:0.5});
	TweenLite.from(icon, 0.5, {scaleY:0, delay:0.5, ease:Back.easeOut});
	TweenLite.from(icon, 0.5, {scaleX:0.8, delay:0.6, ease:Quad.easeOut});

	TweenLite.to(icon, 0.5, {rotationY:90, delay:2, ease:Back.easeIn});
	TweenLite.to(square, 0.5, {rotationY:90, delay:2, ease:Back.easeIn});

	TweenLite.to(middle_building, 1, {alpha:1, delay:2.5, ease:Back.easeOut});
	TweenLite.from(middle_building, 1, {rotationY:90, delay:2.5, ease:Back.easeOut});
	TweenLite.from(middle_building, 1, {x:-10, scaleX:1.6, scaleY:1.6, delay:3, ease:Back.easeOut});

	TweenLite.from(right_building, 1, {x:10, scaleX:0.8, scaleY:0.8, delay:3, ease:Back.easeOut});

	TweenLite.to(left_building, 1, {alpha:1, delay:3, ease:Back.easeOut});
	TweenLite.from(left_building, 1, {scaleX:0.8, scaleY:0.8, x:-50, delay:3, ease:Back.easeOut});

	TweenLite.to(step1, 0.5, {alpha:0, delay:3});
	TweenLite.to(text1, 0.5, {alpha:0, delay:3});

	TweenLite.to(step2, 0.5, {alpha:1, delay:3.5});
	TweenLite.to(text2, 0.5, {alpha:1, delay:3.5});

	TweenLite.to(sun, 1, {alpha:1, delay:3.5});
	TweenLite.from(sun, 1, {rotation:-120, scaleX:0.4, scaleY:0.4, x:-10, y:30, ease:Quad.easeInOut, delay:3.5});

	TweenLite.to(sun, 1, {y:-60, x:30, scaleX:0.6, scaleY:0.6, ease:Quad.easeInOut, delay:3.55});
	TweenLite.to(sun_icon, 0.5, {alpha:1, ease:Quad.easeOut, delay:4.5});
	TweenLite.from(sun_icon, 0.5, {scaleY:0.2, ease:Back.easeOut, delay:4.5});

	TweenLite.to(logo, 0.5, {alpha:0, delay:6});

	TweenLite.to(left_building, 1, {y:150, scaleX:0.6, scaleY:0.6, x:-60, ease:Quad.easeIn, delay:6});
	TweenLite.to(middle_building, 1, {y:150, scaleX:0.6, scaleY:0.6, x:-60, ease:Quad.easeIn, delay:6});
	TweenLite.to(right_building, 1, {y:150, scaleX:0.6, scaleY:1.2, x:-60, ease:Quad.easeIn, delay:6});

	TweenLite.to(sun, 1, {y:-90, x:250, scaleX:1, scaleY:1, rotation:50, ease:Quad.easeIn, delay:6, onComplete:resetSun});
	TweenLite.to(sun_icon, 0.5, {alpha:0, ease:Quad.easeOut, delay:6});

	TweenLite.to(step2, 0.5, {alpha:0, delay:7});
	TweenLite.to(text2, 0.5, {alpha:0, delay:7});

	TweenLite.to(step3, 0.5, {alpha:1, delay:7.5});
	TweenLite.to(text3, 0.5, {alpha:1, delay:7.5});

	TweenLite.to(sun_icon, 0.5, {alpha:1, ease:Quad.easeOut, delay:8});
	TweenLite.to(sun_icon, 0.5, {scaleY:1, ease:Back.easeOut, delay:8});

	TweenLite.to(sun, 1, {scaleX:0.8, scaleY:0.8, x:54, y:-45, ease:Quad.easeInOut, delay:10});

	TweenLite.to(step3, 0.5, {alpha:0, delay:10});
	TweenLite.to(text3, 0.5, {alpha:0, delay:10});

	TweenLite.to(end_text, 0.5, {alpha:1, delay:10.5});
	TweenLite.to(logo, 0.5, {alpha:1, delay:10.5});

	TweenLite.to(end_footer, 0.5, {alpha:1, delay:11});
	TweenLite.to(cta, 0.5, {alpha:1, delay:11});
}

function resetSun() {
	TweenLite.set(sun, {scaleX:1, scaleY:1, x:0, y:0, rotation:0});
	TweenLite.set(sun_icon, {scaleX:1, scaleY:0.2, x:0, y:0, rotation:0});
	TweenLite.from(sun, 1, {x:-200, y:200, scaleX:0.8, scaleY:0.8, rotation:-120, ease:Quad.easeOut});
}

function onBannerOver(e) {
	TweenLite.to(cta_arrow, 0.3, {x:3, ease:Quad.easeOut});
	TweenLite.to(cta_arrow, 0.2, {x:0, ease:Quad.easeOut, delay:0.35});
}

function onBannerOut(e) {

}

function onBannerClick(e) {
	window.open(window.clickTag);
}
