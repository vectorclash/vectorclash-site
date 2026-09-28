(function ()
  {
    var mainContainer, cta, ctaOver, logo, vignette, redBar, bg01, bg02, bg03, bg04, anySeasonText, anywhereText, rockyText, venatorText, venatorLogo, endShadow

    function init() {
      mainContainer = document.querySelector('.main-container')
      cta = document.querySelector('.cta')
      ctaOver = document.querySelector('.cta-over')
      logo = document.querySelector('.logo')
      vignette = document.querySelector('.vignette')
      endShadow = document.querySelector('.end-shadow')
      redBar = document.querySelector('.red-bar')
      anySeasonText = document.querySelector('.any-season')
      anywhereText = document.querySelector('.anywhere')
      rockyText = document.querySelector('.rocky')
      venatorText = document.querySelector('.venator')
      venatorLogo = document.querySelector('.venator-logo')
      bg01 = document.querySelector('.bg-01')
      bg02 = document.querySelector('.bg-02')
      bg03 = document.querySelector('.bg-03')
      bg04 = document.querySelector('.bg-04')

      mainContainer.addEventListener('click', onBannerClick)

      animate()
    }

    function animate() {
      TweenMax.from(redBar, 1, {
        y: 100,
        ease: Quad.easeInOut,
        onStart: activateElement,
        onStartParams: [redBar]
      })

      TweenMax.to(vignette, 2, {
        alpha: 1,
        ease: Quad.easeOut
      })

      TweenMax.from(anySeasonText, 1, {
        y: 100,
        ease: Quad.easeInOut,
        delay: 0.2,
        onStart: activateElement,
        onStartParams: [anySeasonText]
      })

      // background image transitions

      TweenMax.from(bg02, 2, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 3,
        onStart: activateElement,
        onStartParams: [bg02]
      })

      TweenMax.from(bg03, 2, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 6,
        onStart: activateElement,
        onStartParams: [bg03]
      })

      TweenMax.from(bg04, 2, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 9,
        onStart: activateElement,
        onStartParams: [bg04]
      })

      // end background transitions

      TweenMax.to(anySeasonText, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 3
      })

      TweenMax.from(anywhereText, 1, {
        alpha: 0,
        y: 100,
        ease: Quad.easeInOut,
        delay: 3,
        onStart: activateElement,
        onStartParams: [anywhereText]
      })

      TweenMax.to(anywhereText, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 6
      })

      TweenMax.from(rockyText, 1, {
        alpha: 0,
        y: 100,
        ease: Quad.easeInOut,
        delay: 6,
        onStart: activateElement,
        onStartParams: [rockyText]
      })

      TweenMax.to(rockyText, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 9
      })

      TweenMax.from(venatorText, 1, {
        alpha: 0,
        y: 100,
        ease: Quad.easeInOut,
        delay: 9,
        onStart: activateElement,
        onStartParams: [venatorText]
      })

      TweenMax.to(venatorText, 1, {
        alpha: 0,
        y: -10,
        ease: Quad.easeOut,
        delay: 12
      })

      TweenMax.to(redBar, 1, {
        scaleX: 2,
        scaleY: 2,
        alpha: 1,
        y: -80,
        ease: Quad.easeInOut,
        delay: 12
      })

      TweenMax.from(endShadow, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 12,
        onStart: activateElement,
        onStartParams: [endShadow]
      })

      TweenMax.from(venatorLogo, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 12.5,
        onStart: activateElement,
        onStartParams: [venatorLogo]
      })

      TweenMax.from(logo, 1, {
        alpha: 0,
        x: -100,
        ease: Quad.easeOut,
        delay: 12.5,
        onStart: activateElement,
        onStartParams: [logo]
      })

      TweenMax.from(cta, 1, {
        alpha: 0,
        x: 100,
        ease: Quad.easeOut,
        delay: 12.5,
        onStart: activateElement,
        onStartParams: [cta],
        onComplete: activateRollOver
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
