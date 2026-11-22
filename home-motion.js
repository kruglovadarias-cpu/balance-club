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
  const heroActions = [...offer.querySelectorAll('.button, .slider-controls button')];
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
      let introTrigger, disposed = false, textWidth = innerWidth;
      const pageObservers = [], pageWatches = [], pageTargets = [];
      let observePage = () => {};
      const revealLines = (elements, animation, at, span, duration = .4, lineStep = null) => {
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
          duration, stagger: lineStep === null ? {amount: span} : {each: lineStep}, ease: 'power1.out'}, at);
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
        pageObservers.forEach(observer => observer.disconnect());
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
            .fromTo(heroActions, {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: .35, stagger: .12, ease: 'power1.out'}, 1.4);
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
            text.fromTo(intro.querySelectorAll('.dot'), {autoAlpha: 0, y: 8}, {autoAlpha: 1, y: 0, duration: .35, stagger: .05, ease: 'power1.out'}, .65)
              .fromTo(intro.querySelectorAll('.button'), {autoAlpha: 0, y: 8}, {autoAlpha: 1, y: 0, duration: .35, stagger: .12, ease: 'power1.out'}, 1.05);
            animations.push(text);
            text.play(0);
          };
          introTrigger = ScrollTrigger.create({id: 'home-intro-reveal', trigger: intro,
            start: 'top 78%', once: true, onEnter: playIntro});
        }
        // Observe actual visibility in both axes: horizontal slider captions must not
        // finish revealing while their card is still outside the clipped track.
        const watchGroup = (trigger, elements, start = .78, actions = []) => {
          const first = elements[0] || trigger;
          if ((!elements.length && !actions.length) || trigger.getBoundingClientRect().bottom < 0 || first.getBoundingClientRect().top < 0) return;
          const actionOpacity = new Map(actions.map(action => [action, +getComputedStyle(action).opacity]));
          pageTargets.push(...elements, ...actions);
          gsap.set([...elements, ...actions], {autoAlpha: 0});
          const watch = {trigger, first, start, played: false, play: null};
          watch.play = () => {
            if (watch.played) return;
            watch.played = true;
            let split;
            const text = gsap.timeline({paused: true, onComplete: () => {
              revertSplit(split);
              if (actions.length) gsap.set(actions, {clearProps: 'opacity,visibility,transform'});
            }});
            if (elements.length) {
              gsap.set(elements, {autoAlpha: 1});
              split = revealLines(elements, text, 0, 0, .5, .1);
            }
            const textEnd = split ? .5 + Math.max(0, split.lines.length - 1) * .1 : 0;
            if (actions.length) text.to(actions, {autoAlpha: (index, action) => actionOpacity.get(action), y: 0, duration: .3, stagger: .12, ease: 'power1.out'}, textEnd + .1);
            animations.push(text);
            text.play(0);
          };
          pageWatches.push(watch);
        };
        const targets = [...document.querySelectorAll('main h2, main h3, main p, main .gift-price')]
          .filter(element => !element.closest('.intro, .interior-story, .principle, .review-card, .team-track article, .section-heading, .gift-action, .consultation-copy > div') && element.textContent.trim());
        targets.forEach(element => watchGroup(element, [element]));
        document.querySelectorAll('main .section-heading').forEach(block => {
          const heading = block.querySelector('h2');
          if (heading) watchGroup(heading, [heading], .78, [...block.querySelectorAll('.button, .text-button, .map-link')]);
        });
        // Each argument card has one sequence: heading, then all paragraph lines.
        // Trigger it when the copy is in view, not while only the card's top is visible.
        document.querySelectorAll('.principle').forEach(card => {
          const heading = card.querySelector('h3');
          const body = [...card.children].find(element => element.tagName === 'DIV' && element.querySelector('p'));
          if (body) watchGroup(body, [heading, ...body.querySelectorAll('p')].filter(Boolean), .7, [...body.querySelectorAll('.text-button')]);
        });
        // Names, roles, review copy and the entire footer stay static.
        document.querySelectorAll('.gift-action, .consultation-copy > div').forEach(block => {
          const elements = [...block.querySelectorAll('p')];
          if (elements.length) watchGroup(block, elements, .78, [...block.querySelectorAll('.button')]);
        });
        document.querySelectorAll('main .carousel-controls').forEach(controls => {
          if (!controls.closest('.interior-story')) watchGroup(controls, [], .85, [...controls.querySelectorAll('input, .carousel-buttons button')]);
        });
        observePage = () => {
          pageObservers.forEach(observer => observer.disconnect());
          pageObservers.length = 0;
          for (const start of [...new Set(pageWatches.map(watch => watch.start))]) {
            const watches = pageWatches.filter(watch => !watch.played && watch.start === start);
            const byElement = new Map();
            watches.forEach(watch => {byElement.set(watch.trigger, watch); byElement.set(watch.first, watch);});
            const observer = new IntersectionObserver(entries => {
              entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const watch = byElement.get(entry.target);
                if (!watch || watch.first.getBoundingClientRect().top < -1 || watch.trigger.getBoundingClientRect().top > innerHeight * start + 1) return;
                watch.play();
                observer.unobserve(watch.trigger);
                observer.unobserve(watch.first);
              });
            }, {rootMargin: `0px 0px -${Math.round(innerHeight * (1 - start))}px 0px`, threshold: start === .7 ? [0, 1] : [.35, 1]});
            watches.forEach(watch => {observer.observe(watch.trigger); observer.observe(watch.first);});
            pageObservers.push(observer);
          }
        };
        observePage();
        root.classList.remove('home-motion-pending');
      } catch (error) {
        clearEntry();
        console.warn('Entry animation returned to the static layout.', error);
      }
      const settleResize = () => {
        // Revert split lines before responsive line breaks change; never replay on resize.
        // A mobile address-bar height change must not finish a text reveal mid-line.
        if (Math.abs(innerWidth - textWidth) > 1) {
          textWidth = innerWidth;
          animations.forEach(animation => animation.progress(1));
        }
        observePage();
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
