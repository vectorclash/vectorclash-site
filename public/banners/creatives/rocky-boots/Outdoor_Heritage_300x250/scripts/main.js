(function ()
  {
    var mainContainer, thisIsOurText, heritageText, thisIsText, barLeft, barRight, rockyText, logo, cta, ctaOver, redBar, backgroundOne, backgroundTwo

    function init() {
      mainContainer = document.querySelector('.main-container')
      thisIsOurText = document.querySelector('.this-is-our-text')
      heritageText = document.querySelector('.heritage-text')
      thisIsText = document.querySelector('.this-is-text')
      barLeft = document.querySelector('.bar-left')
      barRight = document.querySelector('.bar-right')
      rockyText = document.querySelector('.rocky-text')
      logo = document.querySelector('.logo')
      cta = document.querySelector('.cta')
      ctaOver = document.querySelector('.cta-over')
      redBar = document.querySelector('.red-bar')
      backgroundOne = document.querySelector('.background-one')
      backgroundTwo = document.querySelector('.background-two')

      mainContainer.addEventListener('click', onBannerClick)

      animate()
    }

    function animate() {

      // frame 1 in

      TweenMax.to(backgroundOne, 10, {
        x: -180,
        ease: Linear.easeNone
      })

      TweenMax.from(thisIsOurText, 0.5, {
        y: 20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 1,
        onStart: activateElement,
        onStartParams: [thisIsOurText]
      })

      TweenMax.from(redBar, 0.5, {
        y: 100,
        ease: Quad.easeOut,
        delay: 1.5,
        onStart: activateElement,
        onStartParams: [redBar]
      })

      TweenMax.from(heritageText, 0.5, {
        y: 20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 1.6,
        onStart: activateElement,
        onStartParams: [heritageText]
      })

      // frame 1 out

      TweenMax.to(thisIsOurText, 0.5, {
        y: -20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 5.1
      })

      TweenMax.to(heritageText, 0.5, {
        y: -20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 5.2
      })

      TweenMax.to(redBar, 1, {
        scaleX: 2,
        scaleY: 1.4,
        alpha: 1,
        ease: Quad.easeInOut,
        delay: 5
      })

      TweenMax.to(backgroundOne, 1, {
        alpha: 0,
        ease: Quad.easeInOut,
        delay: 6
      })

      // frame 2 in

      TweenMax.from(backgroundTwo, 1, {
        alpha: 0,
        ease: Quad.easeOut,
        delay: 6,
        onStart: activateElement,
        onStartParams: [backgroundTwo]
      })

      TweenMax.from(backgroundTwo, 8, {
        y: 50,
        scaleX: 1.5,
        scaleY: 1.5,
        ease: Quad.easeOut,
        delay: 6,
      })

      TweenMax.from(thisIsText, 0.5, {
        y: 20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 6,
        onStart: activateElement,
        onStartParams: [thisIsText]
      })

      TweenMax.from(barLeft, 0.5, {
        x: -20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 6.1,
        onStart: activateElement,
        onStartParams: [barLeft]
      })

      TweenMax.from(barRight, 0.5, {
        x: 20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 6.1,
        onStart: activateElement,
        onStartParams: [barRight]
      })

      TweenMax.from(rockyText, 0.5, {
        y: 20,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 6.5,
        onStart: activateElement,
        onStartParams: [rockyText]
      })

      TweenMax.from(logo, 0.5, {
        x: 50,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 7,
        onStart: activateElement,
        onStartParams: [logo]
      })

      TweenMax.from(cta, 0.5, {
        x: -50,
        alpha: 0,
        ease: Quad.easeOut,
        delay: 7,
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
