(function ()
  {
    var mainContainer, builtForTextContainer, builtText, barLeft, forText, barRight, performanceText, combatText, ramLogo, endTextContainer, logo, endText, cta, ctaOver, productContainer, bootOneA, bootOneB, bootOneTag, bootTwoA, bootTwoB, bootTwoTag, redBar, backgroundOne, backgroundTwo, legalButton, legalOverlay, legalHitArea, vignette

    function init() {
      mainContainer = document.querySelector('.main-container')
      builtForTextContainer = document.querySelector('.built-for-text-container')
      builtText = document.querySelector('.built-text')
      barLeft = document.querySelector('.bar-left')
      forText = document.querySelector('.for-text')
      barRight = document.querySelector('.bar-right')
      performanceText = document.querySelector('.performance-text')
      combatText = document.querySelector('.combat-text')
      ramLogo = document.querySelector('.ram-logo')
      endTextContainer = document.querySelector('.end-text-container')
      logo = document.querySelector('.logo')
      cta = document.querySelector('.cta')
      ctaOver = document.querySelector('.cta-over')
      endText = document.querySelector('.end-text')
      productContainer = document.querySelector('.product-container')
      bootOneA = document.querySelector('.boot-one-a')
      bootOneB = document.querySelector('.boot-one-b')
      bootOneTag = document.querySelector('.boot-one-tag')
      bootTwoA = document.querySelector('.boot-two-a')
      bootTwoB = document.querySelector('.boot-two-b')
      bootTwoTag = document.querySelector('.boot-two-tag')
      redBar = document.querySelector('.red-bar')
      backgroundOne = document.querySelector('.background-one')
      backgroundTwo = document.querySelector('.background-two')
      legalButton = document.querySelector('.legal-button')
      legalOverlay = document.querySelector('.legal-overlay')
      legalHitArea = document.querySelector('.legal-hit-area')
      vignette = document.querySelector('.vignette')

      mainContainer.addEventListener('click', onBannerClick)

      animate()
    }

    function animate() {
      TweenMax.to(backgroundOne, 8, {
        scaleX: 1.3,
        scaleY: 1.3,
        ease: Linear.easeNone
      })

      TweenMax.to(backgroundOne, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 8
      })

      TweenMax.from(builtText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 0.5,
        onStart: activateElement,
        onStartParams: [builtText]
      })

      TweenMax.from(barLeft, 0.5, {
        alpha: 0,
        x: -20,
        ease: Quad.easeOut,
        delay: 1,
        onStart: activateElement,
        onStartParams: [barLeft]
      })

      TweenMax.from(barRight, 0.5, {
        alpha: 0,
        x: 20,
        ease: Quad.easeOut,
        delay: 1,
        onStart: activateElement,
        onStartParams: [barRight]
      })

      TweenMax.from(forText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 1,
        onStart: activateElement,
        onStartParams: [forText]
      })

      TweenMax.from(performanceText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 2,
        onStart: activateElement,
        onStartParams: [performanceText]
      })

      TweenMax.from(ramLogo, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 2,
        onStart: activateElement,
        onStartParams: [ramLogo]
      })

      TweenMax.from(redBar, 1, {
        alpha: 0,
        y: 100,
        ease: Quad.easeOut,
        delay: 1.5,
        onStart: activateElement,
        onStartParams: [redBar]
      })

      TweenMax.to(performanceText, 0.5, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 5
      })

      TweenMax.from(combatText, 0.5, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 5.2,
        onStart: activateElement,
        onStartParams: [combatText]
      })

      TweenMax.to(builtForTextContainer, 1, {
        alpha: 0,
        y: -40,
        ease: Quad.easeOut,
        delay: 9
      })

      TweenMax.to(redBar, 2, {
        scaleX: 2,
        scaleY: 6,
        y: -1300,
        ease: Quad.easeOut,
        delay: 9
      })

      TweenMax.from(bootOneA, 0.7, {
        alpha: 0,
        y: 30,
        ease: Quad.easeOut,
        delay: 9.2,
        onStart: activateElement,
        onStartParams: [bootOneA]
      })

      TweenMax.from(bootOneB, 0.7, {
        alpha: 0,
        x: -20,
        ease: Quad.easeOut,
        delay: 10,
        onStart: activateElement,
        onStartParams: [bootOneB]
      })

      TweenMax.from(bootOneTag, 0.7, {
        alpha: 0,
        x: 20,
        ease: Quad.easeOut,
        delay: 10,
        onStart: activateElement,
        onStartParams: [bootOneTag]
      })

      TweenMax.from(bootTwoA, 0.7, {
        alpha: 0,
        y: 30,
        ease: Quad.easeOut,
        delay: 9.4,
        onStart: activateElement,
        onStartParams: [bootTwoA]
      })

      TweenMax.from(bootTwoB, 0.7, {
        alpha: 0,
        x: -20,
        ease: Quad.easeOut,
        delay: 10.2,
        onStart: activateElement,
        onStartParams: [bootTwoB]
      })

      TweenMax.from(bootTwoTag, 0.7, {
        alpha: 0,
        x: 20,
        ease: Quad.easeOut,
        delay: 10.2,
        onStart: activateElement,
        onStartParams: [bootTwoTag]
      })

      TweenMax.from(logo, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 10.5,
        onStart: activateElement,
        onStartParams: [logo]
      })

      TweenMax.from(endText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 10,
        onStart: activateElement,
        onStartParams: [endText]
      })

      TweenMax.from(vignette, 0.5, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 10,
        onStart: activateElement,
        onStartParams: [vignette]
      })

      TweenMax.from(cta, 1, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 10.5,
        onStart: activateElement,
        onStartParams: [cta],
        onComplete: activateRollOver
      })

      TweenMax.from(legalButton, 1, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 11,
        onStart: activateElement,
        onStartParams: [legalButton]
      })

      TweenMax.from(backgroundTwo, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 5,
        onStart: activateElement,
        onStartParams: [backgroundTwo]
      })

      TweenMax.from(backgroundTwo, 7, {
        scaleX: 1.3,
        scaleY: 1.3,
        ease: Quad.easeOut,
        delay: 5
      })

      TweenMax.to(backgroundTwo, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 10
      })
    }

    function activateElement(element) {
      TweenMax.set(element, {
        display: 'block'
      })
    }

    function activateRollOver() {
      mainContainer.addEventListener('mouseover', onBannerOver)
      mainContainer.addEventListener('mouseout', onBannerOut)

      legalHitArea.addEventListener('mouseover', onLegalOver)
      legalHitArea.addEventListener('mouseout', onLegalOut)
    }

    function onBannerClick(event) {
  		window.open(window.clickTag)
  	}

    function onBannerOver(event) {
      TweenMax.to(ctaOver, 0.3, {
        alpha: 1,
        ease: Quad.easeOut
      })
  	}

    function onBannerOut(event) {
      TweenMax.to(ctaOver, 0.2, {
        alpha: 0,
        ease: Quad.easeOut
      })
  	}

    function onLegalOver(event) {
      TweenMax.to(legalOverlay, 0.3, {
        alpha: 0.9,
        ease: Quad.easeOut
      })

      TweenMax.from(legalOverlay, 0.3, {
        y: 200,
        ease: Quad.easeOut
      })
  	}

    function onLegalOut(event) {
      TweenMax.to(legalOverlay, 0.2, {
        alpha: 0,
        ease: Quad.easeOut
      })
  	}

    window.addEventListener('load', init)
  }
)()
