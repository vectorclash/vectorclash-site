(function ()
  {
    var mainContainer, builtForTextContainer, builtText, barLeft, forText, barRight, performanceText, comfortText, endTextContainer, logo, endText, cta, ctaOver, productContainer, bootOne, bootTwo, redBar, backgroundOne, backgroundTwo

    function init() {
      mainContainer = document.querySelector('.main-container')
      builtForTextContainer = document.querySelector('.built-for-text-container')
      builtText = document.querySelector('.built-text')
      barLeft = document.querySelector('.bar-left')
      forText = document.querySelector('.for-text')
      barRight = document.querySelector('.bar-right')
      performanceText = document.querySelector('.performance-text')
      comfortText = document.querySelector('.comfort-text')
      endTextContainer = document.querySelector('.end-text-container')
      logo = document.querySelector('.logo')
      cta = document.querySelector('.cta')
      ctaOver = document.querySelector('.cta-over')
      endText = document.querySelector('.end-text')
      productContainer = document.querySelector('.product-container')
      bootOne = document.querySelector('.boot-one')
      bootTwo = document.querySelector('.boot-two')
      redBar = document.querySelector('.red-bar')
      backgroundOne = document.querySelector('.background-one')
      backgroundTwo = document.querySelector('.background-two')

      mainContainer.addEventListener('click', onBannerClick)

      animate()
    }

    function animate() {
      TweenMax.to(backgroundOne, 10, {
        scaleX: 1.5,
        scaleY: 1.5,
        ease: Linear.easeNone
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

      TweenMax.from(redBar, 1, {
        alpha: 0,
        y: 100,
        ease: Quad.easeOut,
        delay: 1.7,
        onStart: activateElement,
        onStartParams: [redBar]
      })

      TweenMax.to(performanceText, 0.5, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 5
      })

      TweenMax.from(comfortText, 0.5, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 5.2,
        onStart: activateElement,
        onStartParams: [comfortText]
      })

      TweenMax.to(builtForTextContainer, 1, {
        alpha: 0,
        y: -40,
        ease: Quad.easeOut,
        delay: 8
      })

      TweenMax.to(redBar, 1, {
        scaleX: 2,
        scaleY: 1.5,
        ease: Quad.easeOut,
        delay: 8
      })

      TweenMax.from(bootOne, 0.7, {
        alpha: 0,
        y: 30,
        ease: Quad.easeOut,
        delay: 8.2,
        onStart: activateElement,
        onStartParams: [bootOne]
      })

      TweenMax.from(bootTwo, 0.7, {
        alpha: 0,
        x: -20,
        ease: Quad.easeOut,
        delay: 9,
        onStart: activateElement,
        onStartParams: [bootTwo]
      })

      TweenMax.from(logo, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 9.7,
        onStart: activateElement,
        onStartParams: [logo]
      })

      TweenMax.from(endText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 9.5,
        onStart: activateElement,
        onStartParams: [endText]
      })

      TweenMax.from(cta, 1, {
        alpha: 0,
        y: 50,
        ease: Quad.easeOut,
        delay: 10,
        onStart: activateElement,
        onStartParams: [cta],
        onComplete: activateRollOver
      })

      TweenMax.from(backgroundTwo, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 8,
        onStart: activateElement,
        onStartParams: [backgroundTwo]
      })

      TweenMax.from(backgroundTwo, 7, {
        scaleX: 1.5,
        scaleY: 1.5,
        ease: Quad.easeOut,
        delay: 8
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

    window.addEventListener('load', init)
  }
)()
