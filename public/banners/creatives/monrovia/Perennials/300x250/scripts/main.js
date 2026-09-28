var logo;
var cta;
var main;
var content;

var flower;
var background;
var frame1Text1;

var frame2Text1;
var frame2Line;
var frame2Text2;

var time = 0.0;
var interval = 0.05;

function init() {
	buildContent();
}

function buildContent() {
	main = document.querySelector("#main");

	cta = document.querySelector("#cta");
	cta.innerHTML = configOBject.banner.ctaText;

	flower = document.querySelector("#flower");
	background = document.querySelector("#background_texture");
	TweenMax.set(flower, {transformOrigin:"50% 100%"});

	frame1Text1 = document.querySelector("#frame1_text1");
	frame1_text1.innerHTML = configOBject.banner.frameOneText;

	frame2Text1 = document.querySelector("#frame2_text1");
	frame2Text1.innerHTML = configOBject.banner.frameTwoText1;
	frame2Line = document.querySelector("#frame2_line");
	frame2Text2 = document.querySelector("#frame2_text2");
	frame2Text2.innerHTML = configOBject.banner.frameTwoText2;

	// set click tags and listeners

	main.addEventListener('click', onBannerClick);
	main.addEventListener("mouseover", onCTAOver);
	main.addEventListener("mouseout", onCTAOut);
	TweenMax.ticker.addEventListener('tick', loop);

	animate();
}

function animate() {
	TweenMax.to(flower, 1, {alpha:1, ease:Quad.easeOut});

	var frame1Split = new SplitText(frame1Text1, {type:"lines"});
	for(var i = 0; i < frame1Split.lines.length; i++) {
		var block = frame1Split.lines[i];
		if(i == 0) {
			TweenMax.set(block, {fontSize:configOBject.banner.frameOneText1FontSize});
		} else {
			TweenMax.set(block, {fontSize:configOBject.banner.frameOneText2FontSize});
		}

		TweenMax.from(block, 0.5, {alpha:0, y:20, ease:Quad.easeOut, delay:1+i*0.5});

		TweenMax.to(block, 0.5, {alpha:0, ease:Quad.easeOut, delay:4+i*0.2});
	}

	TweenMax.from(background, 4, {y:30, ease:Quad.easeOut});

	TweenMax.to(flower, 3, {y:125, ease:Quad.easeInOut, delay:4});
	TweenMax.to(background, 3, {y:80, ease:Quad.easeInOut, delay:4});

	TweenMax.from(frame2Text1, 0.5, {alpha:0, y:20, ease:Quad.easeOut, delay:5.5});

	TweenMax.to(frame2Line, 0.5, {alpha:1, ease:Quad.easeOut, delay:5.7});
	TweenMax.from(frame2Line, 0.5, {y:20, ease:Quad.easeOut, delay:5.7});

	var frame2Split = new SplitText(frame2Text2, {type:"lines"});
	for(var i = 0; i < frame2Split.lines.length; i++) {
		var block = frame2Split.lines[i];
		TweenMax.from(block, 0.5, {alpha:0, y:20, ease:Quad.easeOut, delay:6.1+i*0.2});
	}

	TweenMax.to(flower, 0.9, {rotationZ:0, skewY:0, ease:Quad.easeInOut, delay:14.1});

	TweenMax.delayedCall(14, function(){TweenMax.ticker.removeEventListener('tick', loop);});
}

function loop() {
	TweenMax.set(flower, {rotationZ:noise.perlin2(time, 100)*(noise.perlin2(time, 100)*10), skewY:noise.perlin2(time, 100)*(noise.perlin2(time, 100)*6)});
	time += noise.perlin2(interval, 100)*(noise.perlin2(interval, 100)*interval*50);
}

function onCTAOver(event) {
	TweenMax.to(cta, 0.5, {backgroundColor:0xFFFFFF, borderColor:0x364528, color:0x364528, ease:Sine.easeOut});
}

function onCTAOut(event) {
	TweenMax.to(cta, 0.3, {backgroundColor:0x364528, borderColor:0xFFFFFF, color:0xFFFFFF, ease:Sine.easeOut});
}

function onBannerClick(event) {
	window.open(window.clickTag);
}
