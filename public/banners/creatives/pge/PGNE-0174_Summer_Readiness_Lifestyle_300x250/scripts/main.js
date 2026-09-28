var mainContainer, backgroundImage, blueBox, textOne, textTwo, textThree, cta;

function init() {
  // set elements
  mainContainer = document.querySelector('.main-container');
  backgroundImage = document.querySelector('.background-image');
  blueBox = document.querySelector('.blue-box');
  textOne = document.querySelector('.text-one');
  textTwo = document.querySelector('.text-two');
  textThree = document.querySelector('.text-three');
  cta = document.querySelector('.cta');

  // set listeners
  mainContainer.addEventListener('mouseover', onBannerOver);
  mainContainer.addEventListener('mouseout', onBannerOut);
  mainContainer.addEventListener('click', onBannerClick);

  // begin animation
  animate();
}

function animate() {
  TweenMax.from(backgroundImage, 15, {x:-20, y:10, scaleX:0.75, scaleY:0.75, ease:Quad.easeOut});

  TweenMax.from(blueBox, 2, {scaleY:0, ease:Quad.easeOut, delay:1, onStart:activateElement, onStartParams:[blueBox]});

  TweenMax.from(textOne, 1, {y:20, alpha:0, ease:Quad.easeOut, delay:2, onStart:activateElement, onStartParams:[textOne]});
  TweenMax.to(textOne, 1, {x:-mainContainer.offsetWidth, ease:Quad.easeInOut, delay:6});

  TweenMax.from(textTwo, 1, {x:mainContainer.offsetWidth, ease:Quad.easeInOut, delay:6, onStart:activateElement, onStartParams:[textTwo]});
  TweenMax.to(textTwo, 1, {x:-mainContainer.offsetWidth, ease:Quad.easeInOut, delay:10});

  TweenMax.from(textThree, 1, {x:mainContainer.offsetWidth, ease:Quad.easeInOut, delay:10, onStart:activateElement, onStartParams:[textThree]});
  TweenMax.from(cta, 1, {scaleX:0, scaleY:0, ease:Back.easeOut, delay:12, onStart:activateElement, onStartParams:[cta]});
}

function activateElement(element) {
  TweenMax.set(element, {display:'block'});
}

function onBannerClick(event) {
  window.open(window.clickTag);
}

function onBannerOver(event) {
  TweenMax.to(cta, 1, {x:-10, ease:Back.easeOut});
}

function onBannerOut(event) {
  TweenMax.to(cta, 0.5, {x:0, ease:Bounce.easeOut});
}
