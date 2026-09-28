(function() {
	var frame1Background, frame1BackgroundImage, frame2Background, frame2BackgroundImage, frame3Background, frame3BackgroundImage;
	var frame1Text, frame2Text, frame3Text;
	var logo, buildmoreText, ctaContainer, cta, ctaOver;;
	var mainContainer;

	function init() {
		logo = document.querySelector("#logo");

		ctaContainer = document.querySelector("#ctaContainer");
		cta = document.querySelector(".cta");
		ctaOver = document.querySelector(".cta-over");

		buildmoreText = document.querySelector(".buildmore-text");

		frame1Background = document.querySelector('.frame1-background');
		frame1BackgroundImage = document.querySelector('.frame1-background-image');

		frame1Text = document.querySelector('.frame1-text');

		frame2Background = document.querySelector('.frame2-background');
		frame2BackgroundImage = document.querySelector('.frame2-background-image');

		frame2Text = document.querySelector('.frame2-text');

		frame3Background = document.querySelector('.frame3-background');
		frame3BackgroundImage = document.querySelector('.frame3-background-image');

		frame3Text = document.querySelector('.frame3-text');

		mainContainer = document.querySelector(".main-container");
		mainContainer.addEventListener("click", onBannerClick);
		mainContainer.addEventListener("mouseover", onBannerOver);
		mainContainer.addEventListener("mouseout", onBannerOut);

		animate();
	}

	function animate() {
		TweenMax.from(frame1BackgroundImage, 5, {scaleX:1.3, scaleY:1.3, ease:Linear.easeNone});

		TweenMax.to(frame1Text, 1, {x:-mainContainer.offsetWidth, delay:4, ease:Quad.easeInOut});
		TweenMax.from(frame2Text, 1, {x:mainContainer.offsetWidth, delay:4, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame2Text]});
		TweenMax.from(frame2Background, 1, {alpha:0, delay:4, ease:Quad.easeOut, onStart:initObject, onStartParams:[frame2Background]});
		TweenMax.to(frame2BackgroundImage, 6, {scaleX:1.1, scaleY:1.1, delay:4, ease:Linear.easeNone});

		TweenMax.to(frame2Text, 1, {x:-mainContainer.offsetWidth, delay:8, ease:Quad.easeInOut});
		TweenMax.from(frame3Text, 1, {x:mainContainer.offsetWidth, delay:8, ease:Quad.easeInOut, onStart:initObject, onStartParams:[frame3Text]});
		TweenMax.from(frame3Background, 1, {alpha:0, delay:8, ease:Quad.easeOut, onStart:initObject, onStartParams:[frame3Background]});
		TweenMax.from(frame3BackgroundImage, 6, {x:-20, scaleX:1.2, scaleY:1.2, delay:8, ease:Quad.easeOut});
	}

	function initObject(object) {
		object.style.display = "block";
	}

	function onBannerClick(event) {
		window.open(window.clickTag);
	}

	function onBannerOver(event) {
		TweenMax.to(cta, 0.3, {y:-26, ease:Quad.easeInOut});
		TweenMax.to(ctaOver, 0.3, {y:-26, ease:Quad.easeInOut});
	}

	function onBannerOut(event) {
		TweenMax.to(cta, 0.3, {y:0, ease:Quad.easeInOut});
		TweenMax.to(ctaOver, 0.3, {y:0, ease:Quad.easeInOut});
	}

	window.addEventListener('load', init);
})();
