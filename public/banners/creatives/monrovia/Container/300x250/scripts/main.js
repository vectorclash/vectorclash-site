var logo, logoShadow;
var cta;
var main;
var content;

var flower;
var background;
var frame1Text1;

var frame2Text1;
var frame2Line;
var frame2Text2;

function init() {
	buildContent();
}

function buildContent() {
	main = document.querySelector("#main");

	logo = document.querySelector("#logo");
	logoShadow = document.querySelector("#logo_shadow");

	cta = document.querySelector("#cta");
	cta.innerHTML = configOBject.banner.ctaText;

	flower = document.querySelector("#flower");
	background = document.querySelector("#background_texture");
	TweenMax.set(flower, {transformOrigin:"50% 100%"});

	frame1Text1 = document.querySelector("#frame1_text1");
	TweenMax.set(frame1Text1, {lineHeight:(Number(configOBject.banner.frameOneText1FontSize) + 2) + "px"});
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

	TweenMax.to(flower, 3, {scaleX:0.6, scaleY:0.6, y:-70, ease:Quad.easeInOut, delay:4});
	TweenMax.from(frame2Text1, 0.5, {alpha:0, y:20, ease:Quad.easeOut, delay:6});

	TweenMax.to(frame2Line, 0.5, {alpha:1, ease:Quad.easeOut, delay:6.1});
	TweenMax.from(frame2Line, 0.5, {y:20, ease:Quad.easeOut, delay:6.1});

	TweenMax.to(frame2Text1, 0.5, {alpha:0, ease:Quad.easeOut, delay:10});
	TweenMax.to(frame2Line, 0.5, {alpha:0, ease:Quad.easeOut, delay:10.1});

	var frame2Split = new SplitText(frame2Text2, {type:"lines"});
	for(var i = 0; i < frame2Split.lines.length; i++) {
		var block = frame2Split.lines[i];
		TweenMax.from(block, 0.5, {alpha:0, y:20, ease:Quad.easeOut, delay:6.3+i*0.2});

		TweenMax.to(block, 0.5, {alpha:0, ease:Quad.easeOut, delay:10.12+i*0.2});
	}

	TweenMax.to(flower, 2, {y:-50, ease:Quad.easeInOut, delay:11});
	TweenMax.to(background, 2, {y:100, ease:Quad.easeInOut, delay:11});

	TweenMax.from(logo, 1, {y:-20, delay:12});
	TweenMax.to(logo, 1, {alpha:1, delay:12});
	TweenMax.set(logoShadow, {y:-20});
	TweenMax.to(logoShadow, 1, {y:0, alpha:1, delay:12});
}

function onCTAOver(event) {
	TweenMax.to(cta, 0.5, {backgroundColor:0xFFFFFF, borderColor:0x00b0db, color:0x00b0db, ease:Sine.easeOut});
}

function onCTAOut(event) {
	TweenMax.to(cta, 0.3, {backgroundColor:0x00b0db, borderColor:0xFFFFFF, color:0xFFFFFF, ease:Sine.easeOut});
}

function onBannerClick(event) {
	window.open(window.clickTag);
}
