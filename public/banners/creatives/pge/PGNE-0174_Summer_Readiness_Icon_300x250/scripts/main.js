var mainContainer, blueBox, textOne, textTwo, building, sun, sunContainer, cta;

function init() {
  // set elements
  mainContainer = document.querySelector('.main-container');
  blueBox = document.querySelector('.blue-box');
  building = document.querySelector('.building');
  sun = document.querySelector('.sun');
  sunContainer = document.querySelector('.sun-container');
  textOne = document.querySelector('.text-one');
  textTwo = document.querySelector('.text-two');
  cta = document.querySelector('.cta');

  // set listeners
  mainContainer.addEventListener('mouseover', onBannerOver);
  mainContainer.addEventListener('mouseout', onBannerOut);
  mainContainer.addEventListener('click', onBannerClick);

  // begin animation
  animate();
}

function animate() {
  TweenMax.to(sun, 4, {rotation:90, ease:Power1.easeOut});
  TweenMax.to(sunContainer, 4, {rotation:0, ease:Power1.easeOut});

  TweenMax.to(sun, 1, {x:mainContainer.offsetWidth, ease:Quad.easeInOut, delay:3});
  TweenMax.to(building, 1, {x:mainContainer.offsetWidth, ease:Quad.easeInOut, delay:3});

  TweenMax.from(textOne, 1, {x:-mainContainer.offsetWidth, ease:Quad.easeInOut, delay:3, onStart:activateElement, onStartParams:[textOne]});

  TweenMax.to(textOne, 1, {x:mainContainer.offsetWidth, ease:Quad.easeInOut, delay:7});
  TweenMax.from(textTwo, 1, {x:-mainContainer.offsetWidth, ease:Quad.easeInOut, delay:7, onStart:activateElement, onStartParams:[textTwo]});
  TweenMax.from(cta, 1, {scaleX:0, scaleY:0, ease:Back.easeOut, delay:9, onStart:activateElement, onStartParams:[cta]});
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
