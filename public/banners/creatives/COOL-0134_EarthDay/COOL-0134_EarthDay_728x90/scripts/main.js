var container, logo, logoWhite, colorBar, frame1, frame2, frame3, frame4, frame5, frames;

function init() {
  container = document.querySelector('.main-container');

  frame1 = document.querySelector('#frame-1');
  frame2 = document.querySelector('#frame-2');
  frame3 = document.querySelector('#frame-3');
  frame4 = document.querySelector('#frame-4');
  frame5 = document.querySelector('#frame-5');

  frames = new Array(frame1, frame2, frame3, frame4, frame5);
  TweenMax.delayedCall(0, animateFrame, [frame1, 0, frames]);
  TweenMax.delayedCall(3.5, animateFrame, [frame2, 1, frames]);
  TweenMax.delayedCall(7, animateFrame, [frame3, 2, frames]);
  TweenMax.delayedCall(10.5, animateFrame, [frame4, 3, frames]);
  TweenMax.delayedCall(14, animateFrame, [frame5, 4, frames]);

  colorBar = document.querySelector('.color-bar');
  // TweenMax.to(colorBar, 1, {alpha:1, ease:Quad.easeInOut, delay:3.5});

  logoWhite = document.querySelector('.logo-white');
  TweenMax.to(logoWhite, 0.5, {alpha:1, delay:3.5});
  TweenMax.to(logoWhite, 0.5, {alpha:0, delay:14});

  container.addEventListener('mouseover', onBannerOver);
  container.addEventListener('mouseout', onBannerOut);
  container.addEventListener('click', onBannerClick);
}

function animateFrame(frame, index, array) {
  TweenMax.set(frame, {display:"block"});
  var frameElements = frame.querySelectorAll('.frame-text');

  if(index == 0) {
    // animate first frame
    animateElementsInSequence(frameElements, false, true);
  } else if(index == array.length-1) {
    // animate last frame
    animateElementsInSequence(frameElements, true, false);
  } else {
    // animate intermediate frames
    animateElementsInSequence(frameElements, true, true);
    animateBG(frame.querySelectorAll('.frame-bg'));
  }
}

function animateElementsInSequence(elements, delayStart, out) {
  var delay = 0;
  if(delayStart) {
    delay = 0.5;
  }
  // aniamte in
  TweenMax.staggerFrom(elements, 0.5, {y:20, alpha:0, delay:delay, ease:Back.easeOut}, 0.1);
  if(out) {
    // animate out
    TweenMax.staggerTo(elements, 0.5, {y:-container.offsetHeight, ease:Quad.easeIn, delay:3.2}, 0.1);
  }
}

function animateBG(bg) {
  // animate in
  TweenMax.from(bg, 0.5, {y:container.offsetHeight, ease:Quad.easeInOut});
  // animate out
  TweenMax.to(bg, 0.5, {y:-container.offsetHeight, ease:Quad.easeInOut, delay:3.5});
}

function onBannerOver(event) {
  TweenMax.to('.frame-5-arrow', 0.5, {x:10, ease:Back.easeOut});
  TweenMax.to('.frame-5-text-1', 0.5, {x:-10, ease:Back.easeOut});
}

function onBannerOut(event) {
  TweenMax.to('.frame-5-arrow', 0.3, {x:0, ease:Bounce.easeOut});
  TweenMax.to('.frame-5-text-1', 0.3, {x:0, ease:Bounce.easeOut});
}

function onBannerClick(event) {
  window.open(window.clickTag);
}
