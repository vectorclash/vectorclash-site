var mainContainer,
    logoHeader,
    legal,
    legalButtonHit,
    legalButton,
    formNumber,
    cta,
    ctaRed,
    textFrame1,
    textFrame2,
    backgroundImage;

function init() {
  mainContainer = document.querySelector('.main-container');
  logoHeader = document.querySelector('.logo-header');
  legal = document.querySelector('.legal');
  legalButtonHit = document.querySelector('.legal-button-hit');
  legalButton = document.querySelector('.legal-button');
  formNumber = document.querySelector('.form-number');
  ctaRed = document.querySelector('.cta-red');
  cta = document.querySelector('.cta');
  textFrame1 = document.querySelector('.text-frame1');
  textFrame2 = document.querySelector('.text-frame2');
  backgroundImage = document.querySelector('.background-image');

  legalButtonHit.addEventListener('mouseover', onLegalOver);

  mainContainer.addEventListener('click', onBannerClick);
  mainContainer.addEventListener('mouseover', onBannerOver);
  mainContainer.addEventListener('mouseout', onBannerOut);

  animate();
}

function animate() {
  TweenMax.delayedCall(0, animateFrame, [textFrame1, false]);

  TweenMax.delayedCall(3, animateFrame, [textFrame1, true]);
  TweenMax.delayedCall(3, animateFrame, [textFrame2, false]);

  TweenMax.from(cta, 0.5,
    {
      y: -10,
      alpha: 0,
      ease: Quad.easeInOut,
      onStart: activateObject,
      onStartParams: [cta],
      delay: 0.5,
      onComplete: activateObject,
      onCompleteParams: [ctaRed]
    }
  );
}

function animateFrame(frame, isAnimnatingOut) {

  if(isAnimnatingOut) {
    TweenMax.to(frame, 0.5,
      {
        y: mainContainer.offsetHeight,
        ease: Quad.easeInOut,
        onComplete: deActivateObject,
        onCompleteParams: [frame]
      }
    );
  } else {
    TweenMax.from(frame, 0.5,
      {
        y: -(mainContainer.offsetHeight),
        ease: Quad.easeInOut,
        onStart: activateObject,
        onStartParams: [frame]
      }
    );
  }
}

function activateObject(object) {
  TweenMax.set(object, {display: 'block'});
}

function deActivateObject(object) {
  TweenMax.set(object, {display: 'none', x: 0, y: 0, alpha: 1});
}

function onLegalOver(event) {
  legalButtonHit.removeEventListener('mouseover', onLegalOver);
  legalButtonHit.addEventListener('mouseout', onLegalOut);
  TweenMax.set(legal, {alpha: 1});
  TweenMax.from(legal, 0.5, {y: 60, ease: Quad.easeInOut});
}

function onLegalOut(event) {
  TweenMax.to(legal, 0.5, {y: 150, ease: Quad.easeInOut, onComplete: resetLegal});
}

function resetLegal() {
  TweenMax.set(legal, {y: 0, alpha: 0});
  legalButtonHit.addEventListener('mouseover', onLegalOver);
}

function onBannerClick(event) {
  window.open(window.clickTag);
}

function onBannerOver(event) {
  TweenMax.to(ctaRed, 0.2, {alpha: 1, ease: Quad.easeOut});
}

function onBannerOut(event) {
  TweenMax.to(ctaRed, 0.1, {alpha: 0, ease: Bounce.easeOut});
}
