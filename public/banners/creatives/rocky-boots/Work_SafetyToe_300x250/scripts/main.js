(function ()
  {
    var mainContainer, background, cta, ctaOver, introducingText, barLeft, barRight, theText, worldsMostText, comfortableText, safetyToeText, ramIcon, bootOne, bootTwo, xoToeText, xtremeComfortText, xtremeSafetyText, logo, vignette, redBar, frame1, frame2, frame1Elements, frame2Elements

    function init() {
      mainContainer = document.querySelector('.main-container')
      background = document.querySelector('.background')
      cta = document.querySelector('.cta')
      ctaOver = document.querySelector('.cta-over')
      introducingText = document.querySelector('.introducing')
      barLeft = document.querySelector('.bar-left')
      barRight = document.querySelector('.bar-right')
      theText = document.querySelector('.the')
      worldsMostText = document.querySelector('.worlds-most')
      comfortableText = document.querySelector('.comfortable')
      safetyToeText = document.querySelector('.safety-toe')
      ramIcon = document.querySelector('.ram')
      bootOne = document.querySelector('.boot-one')
      bootTwo = document.querySelector('.boot-two')
      xoToeText = document.querySelector('.xo-toe')
      xtremeComfortText = document.querySelector('.xtreme-comfort')
      xtremeSafetyText = document.querySelector('.xtreme-safety')
      logo = document.querySelector('.logo')
      vignette = document.querySelector('.vignette')
      redBar = document.querySelector('.red-bar')

      frame1 = document.querySelector('.frame1')
      frame2 = document.querySelector('.frame2')

      mainContainer.addEventListener('click', onBannerClick)

      animate()
    }

    function animate() {
      TweenMax.to(background, 12, {
        scaleX: 1,
        scaleY: 1,
        top: 0,
        left: 0,
        ease: Linear.easeNone
      })

      TweenMax.to(comfortableText, 10, {
        alpha: 0.5,
        ease: Quad.easeInOut
      })

      TweenMax.from(redBar, 1, {
        y: -100,
        ease: Quad.easeOut,
        onStart: activateElement,
        onStartParams: [redBar]
      })

      TweenMax.from(introducingText, 1, {
        y: -100,
        ease: Quad.easeOut,
        delay: 0.1,
        onStart: activateElement,
        onStartParams: [introducingText]
      })

      TweenMax.from(barLeft, 0.5, {
        alpha: 0,
        x: -20,
        ease: Quad.easeOut,
        delay: 1.2,
        onStart: activateElement,
        onStartParams: [barLeft]
      })

      TweenMax.from(barRight, 0.5, {
        alpha: 0,
        x: 20,
        ease: Quad.easeOut,
        delay: 1.2,
        onStart: activateElement,
        onStartParams: [barRight]
      })

      TweenMax.from(theText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 1.1,
        onStart: activateElement,
        onStartParams: [theText]
      })

      TweenMax.from(worldsMostText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 1.8,
        onStart: activateElement,
        onStartParams: [worldsMostText]
      })

      TweenMax.from(comfortableText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 2.5,
        onStart: activateElement,
        onStartParams: [comfortableText]
      })

      TweenMax.from(safetyToeText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 3.2,
        onStart: activateElement,
        onStartParams: [safetyToeText]
      })

      TweenMax.from(ramIcon, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 4,
        onStart: activateElement,
        onStartParams: [ramIcon]
      })

      TweenMax.staggerTo(frame1.children, 0.5, {
        y: 70,
        alpha: 0,
        ease: Quad.easeInOut,
        delay: 8.5
      }, -0.05)

      TweenMax.to(redBar, 1.5, {
        scaleX: 3,
        scaleY: 10,
        y: 800,
        ease: Quad.easeOut,
        delay: 9
      })

      TweenMax.to(background, 2, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 9
      })

      TweenMax.to(vignette, 2, {
        alpha: 1,
        ease: Quad.easeOut,
        delay: 9
      })

      TweenMax.from(bootOne, 1.5, {
        alpha: 0,
        y: -100,
        ease: Quad.easeOut,
        delay: 9,
        onStart: activateElement,
        onStartParams: [bootOne]
      })

      TweenMax.from(bootTwo, 1.5, {
        alpha: 0,
        y: -100,
        ease: Quad.easeOut,
        delay: 9.2,
        onStart: activateElement,
        onStartParams: [bootTwo]
      })

      TweenMax.from(logo, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 10,
        onStart: activateElement,
        onStartParams: [logo]
      })

      TweenMax.from(xoToeText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 10.2,
        onStart: activateElement,
        onStartParams: [xoToeText]
      })

      TweenMax.from(xtremeComfortText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 10.4,
        onStart: activateElement,
        onStartParams: [xtremeComfortText]
      })

      TweenMax.from(xtremeSafetyText, 0.5, {
        alpha: 0,
        y: 20,
        ease: Quad.easeOut,
        delay: 10.5,
        onStart: activateElement,
        onStartParams: [xtremeSafetyText]
      })

      TweenMax.from(cta, 0.5, {
        alpha: 0,
        x: -100,
        ease: Quad.easeOut,
        delay: 11,
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
