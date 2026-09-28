(function() {
  var mainContainer, cta, frame1Image, frame1Text, frame2Image, frame2Text, frame3Text;

  function init() {
      mainContainer = document.querySelector('.main-container');

      cta = document.querySelector('.cta');
      frame1Image = document.querySelector('.frame1-image');
      frame1Text = document.querySelector('.frame1-text');
      frame2Image = document.querySelector('.frame2-image');
      frame2Text = document.querySelector('.frame2-text');
      frame3Text = document.querySelector('.frame3-text');

      animate();

      mainContainer.addEventListener('click', onBannerClick);
  }

  function animate() {
    TweenMax.to(frame1Image, 1, {x: -(mainContainer.offsetWidth), ease:Quad.easeInOut, delay: 3});
    TweenMax.to(frame1Text, 1, {x: -(mainContainer.offsetWidth), ease:Quad.easeInOut, delay: 3});

    TweenMax.from(frame2Image, 1, {x: mainContainer.offsetWidth, ease:Quad.easeInOut, delay: 3, onStart: enableElement, onStartParams: [frame2Image]});
    TweenMax.from(frame2Text, 1, {x: mainContainer.offsetWidth, ease:Quad.easeInOut, delay: 3, onStart: enableElement, onStartParams: [frame2Text]});

    TweenMax.to(frame2Text, 1, {x: -(mainContainer.offsetWidth), ease:Quad.easeInOut, delay: 8});
    TweenMax.from(frame3Text, 1, {x: mainContainer.offsetWidth, ease:Quad.easeInOut, delay: 8, onStart: enableElement, onStartParams: [frame3Text]});

    TweenMax.to(cta, 1, {x:-10, ease:Back.easeOut, delay: 10});
    TweenMax.to(cta, 0.5, {x:0, ease:Bounce.easeOut, delay: 11});

    // TweenMax.delayedCall(13, activateRollover);
  }

  function activateRollover() {
    mainContainer.addEventListener('mouseover', onBannerOver);
    mainContainer.addEventListener('mouseout', onBannerOut);
  }

  function enableElement(element) {
    TweenMax.set(element, {display: 'block'});
  }

  function onBannerOver(event) {
    TweenMax.to(cta, 1, {x:-10, ease:Back.easeOut});
  }

  function onBannerOut(event) {
    TweenMax.to(cta, 0.5, {x:0, ease:Bounce.easeOut});
  }

  function onBannerClick(event) {
    window.open(window.clickTag);
  }

  init();
})();
