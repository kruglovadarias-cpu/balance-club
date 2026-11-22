/* Automatic entry reveals reuse the interior's line treatment, without pinning or scrubbing. */
(() => {
  const hero = document.querySelector('#home .hero-picture');
  const intro = document.querySelector('.intro');
  if (!hero || !intro || !window.gsap || !window.ScrollTrigger || !window.SplitText) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const root = document.documentElement;
  const header = document.querySelector('#home .header');
  const copy = document.querySelector('#home .hero-copy');
  const offer = document.querySelector('#home .hero-offer');
  const offerGrid = offer.querySelector('.offer-grid');
  const description = offer.querySelector('.offer-description');
  const heroActions = [...offer.querySelectorAll('.button, .slider-controls')];
  const photo = hero.querySelector('img');
  const veil = hero.querySelector('.hero-entry-blur');
  const introLayout = intro.querySelector('.intro-layout');
  const introActions = [...intro.querySelectorAll('.button, .dot')];
  let heroPlayed = false, introPlayed = false;
  const media = gsap.matchMedia();

  const imageReady = photo.decode ? photo.decode().catch(() => {}) : Promise.resolve();
  document.fonts.ready.then(() => {
    if (window.__balanceEntranceExpired) return;
    clearTimeout(window.__balanceEntranceTimer);
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const animations = [], splits = new Set(), originalContent = new Map();
      let introTrigger, disposed = false;
      const pageTriggers = [], pageTargets = [];
      const revealLines = (elements, animation, at, span, duration = .4) => {
        // SplitText treats every <br> as a break, including responsive breaks hidden by CSS.
        const originals = new Map([...elements].map(element => [element, element.innerHTML]));
        elements.forEach(element => element.querySelectorAll('br').forEach(br => {
          if (getComputedStyle(br).display === 'none') br.remove();
        }));
        const split = SplitText.create(elements, {type: 'lines', linesClass: 'home-reveal-line', aria: 'auto'});
        splits.add(split);
        originalContent.set(split, originals);
        gsap.set(split.lines, {opacity: 0, yPercent: 40, filter: 'blur(4px)'});
        animation.to(split.lines, {opacity: 1, yPercent: 0, filter: 'blur(0px)',
          duration, stagger: {amount: span}, ease: 'power1.out'}, at);
        return split;
      };
      const revertSplit = split => {
        if (!splits.delete(split)) return;
        split.revert();
        originalContent.get(split).forEach((html, element) => { element.innerHTML = html; });
        originalContent.delete(split);
      };
      const clearEntry = () => {
        disposed = true;
        animations.forEach(animation => animation.kill());
        introTrigger?.kill();
        pageTriggers.forEach(trigger => trigger.kill());
        [...splits].forEach(revertSplit);
        gsap.set([header, copy, offer, description, introLayout, ...heroActions, ...introActions, ...pageTargets], {clearProps: 'opacity,visibility,transform,filter'});
        gsap.set(veil, {autoAlpha: 0});
        offerGrid.inert = false;
        root.classList.remove('home-motion-pending');
      };
      try {
        const heroRect = document.querySelector('#home').getBoundingClientRect();
        const showHero = !heroPlayed && heroRect.bottom > 0 && heroRect.top < window.innerHeight;
        if (showHero) {
          gsap.set(veil, {autoAlpha: 1});
          gsap.set(header, {autoAlpha: 0});
          gsap.set([copy, offer], {autoAlpha: 1});
          gsap.set([description, ...heroActions], {autoAlpha: 0});
          offerGrid.inert = true;
          let heroSplit;
          const text = gsap.timeline({paused: true, onComplete: () => {
            // Return the exact markup before enabling the offer carousel's dynamic text.
            revertSplit(heroSplit);
            offerGrid.inert = false;
            heroPlayed = true;
          }});
          heroSplit = revealLines(document.querySelectorAll('#home .hero-copy .eyebrow, #home h1, #home .offer-grid > h2, #home .offer-description p'), text, .2, .6, .5);
          text.to(description, {autoAlpha: 1, duration: .4}, .2)
            .fromTo(heroActions, {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: .35, stagger: .06, ease: 'power1.out'}, .8);
          animations.push(text,
            gsap.to(header, {autoAlpha: 1, duration: .7, delay: .1, ease: 'power1.inOut'}));
          // Menu/text never wait for the photograph; its veil stays until the pixels are decoded.
          imageReady.then(() => {
            if (!disposed) animations.push(gsap.to(veil, {autoAlpha: 0, duration: 1.8, delay: .05, ease: 'power1.inOut'}));
          });
          text.play(0);
        } else {
          heroPlayed = true;
          gsap.set(veil, {autoAlpha: 0});
        }

        if (!introPlayed) {
          gsap.set(introLayout, {autoAlpha: 0});
          const playIntro = () => {
            if (introPlayed) return;
            introPlayed = true;
            let introSplit;
            const text = gsap.timeline({paused: true, onComplete: () => revertSplit(introSplit)});
            gsap.set(introLayout, {autoAlpha: 1});
            gsap.set(introActions, {autoAlpha: 0});
            introSplit = revealLines(intro.querySelectorAll('.intro-facts strong, .intro-facts p, .intro-text h2, .intro-text > div > p'), text, .05, .5);
            text.fromTo(introActions, {autoAlpha: 0, y: 8}, {autoAlpha: 1, y: 0, duration: .35, stagger: .05, ease: 'power1.out'}, .65);
            animations.push(text);
            text.play(0);
          };
          introTrigger = ScrollTrigger.create({id: 'home-intro-reveal', trigger: intro,
            start: 'top 78%', once: true, onEnter: playIntro});
        }
        // Reveal the remaining headings and editorial copy once they enter the viewport.
        // The intro and pinned interior already have their own coordinated animations.
        const targets = [...document.querySelectorAll('main h2, main h3, main p, main .gift-price, .footer h2, .footer-address p, .footer-social p, .newsletter > p, .footer-line p')]
          .filter(element => !element.closest('.intro, .interior-story') && element.textContent.trim());
        targets.forEach(element => {
          // Deep links must not hide content the reader has already scrolled past.
          if (element.getBoundingClientRect().bottom < 0) return;
          pageTargets.push(element);
          gsap.set(element, {autoAlpha: 0});
          let played = false;
          const play = () => {
            if (played) return;
            played = true;
            let split;
            const text = gsap.timeline({paused: true, onComplete: () => revertSplit(split)});
            gsap.set(element, {autoAlpha: 1});
            split = revealLines([element], text, 0, .35);
            animations.push(text);
            text.play(0);
          };
          pageTriggers.push(ScrollTrigger.create({trigger: element, start: 'top 92%', once: true, onEnter: play}));
        });
        root.classList.remove('home-motion-pending');
      } catch (error) {
        clearEntry();
        console.warn('Entry animation returned to the static layout.', error);
      }
      const settleResize = () => {
        // Revert split lines before responsive line breaks change; never replay on resize.
        animations.forEach(animation => animation.progress(1));
      };
      window.addEventListener('resize', settleResize, {passive: true});
      return () => {
        window.removeEventListener('resize', settleResize);
        clearEntry();
        heroPlayed = introPlayed = true;
      };
    });
    root.classList.remove('home-motion-pending');
  }).catch(() => {
    clearTimeout(window.__balanceEntranceTimer);
    root.classList.remove('home-motion-pending');
  });
})();
