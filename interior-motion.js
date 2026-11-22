/* Scrolling selects a scene; each scene's text then reveals on its own clock. */
(() => {
  const story = document.querySelector('.interior-story');
  if (!story || !window.gsap || !window.ScrollTrigger || !window.SplitText) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const stage = story.querySelector('.interior-stage');
  const visit = story.querySelector('.interior-visit');
  const about = story.querySelector('.about-layout');
  const photo = story.querySelector('.interior-photo');
  const overlay = story.querySelector('.about-overlay');
  const title = story.querySelector('.display-title');
  const gallery = story.querySelector('.interior-gallery');
  const firstSlide = gallery.querySelector('.gallery-track img');
  const layers = [visit, about];
  const media = gsap.matchMedia();
  const phaseAt = progress => progress < .14 ? 'clear' : progress < .47 ? 'visit' : progress < .77 ? 'about' : 'exit';
  const setLayer = (layer, visible) => {
    layer.inert = !visible;
    layer.setAttribute('aria-hidden', String(!visible));
  };

  document.fonts.ready.then(() => {
    media.add('(prefers-reduced-motion: no-preference)', () => {
      story.classList.add('is-animated');
      let timeline, textTransition, splits = [], resizeTimer, phase, building = false;
      let lastWidth = stage.clientWidth;
      const lines = new Map();
      const splitLines = layer => {
        const split = SplitText.create(layer.querySelectorAll('p, h2, h3, .interior-contract'), {
          type: 'lines', linesClass: 'interior-line', aria: 'auto'
        });
        splits.push(split);
        lines.set(layer, split.lines);
      };
      const changeText = (nextPhase, immediate = false) => {
        if (phase === nextPhase) return;
        phase = nextPhase;
        story.dataset.textPhase = nextPhase;
        textTransition?.kill();
        const incoming = nextPhase === 'visit' ? visit : nextPhase === 'about' ? about : null;
        const outgoingVisible = layers.some(layer => parseFloat(gsap.getProperty(layer, 'opacity')) > .01);
        layers.forEach(layer => setLayer(layer, false));
        if (immediate) {
          gsap.set(layers, {autoAlpha: 0, y: 0});
          if (incoming) {
            gsap.set(incoming, {autoAlpha: 1});
            gsap.set(lines.get(incoming), {opacity: 1, yPercent: 0, filter: 'blur(0px)'});
            gsap.set(incoming.querySelector('.button'), {autoAlpha: 1, y: 0});
            setLayer(incoming, true);
          }
          return;
        }
        const fade = outgoingVisible ? .32 : 0;
        textTransition = gsap.timeline();
        if (fade) textTransition.to(layers, {autoAlpha: 0, y: -18, duration: fade, ease: 'power1.inOut'});
        else gsap.set(layers, {autoAlpha: 0});
        if (!incoming) return;
        // Reset only after the outgoing state has gone, including on fast reverse scroll.
        textTransition
          .set(incoming, {autoAlpha: 1, y: 0}, fade)
          .set(lines.get(incoming), {opacity: 0, yPercent: 65, filter: 'blur(8px)'}, fade)
          .set(incoming.querySelector('.button'), {autoAlpha: 0, y: 16}, fade)
          .call(() => setLayer(incoming, true), null, fade)
          .to(lines.get(incoming), {opacity: 1, yPercent: 0, filter: 'blur(0px)',
            duration: .42, stagger: {amount: .7}, ease: 'power1.out'}, fade)
          .to(incoming.querySelector('.button'), {autoAlpha: 1, y: 0, duration: .3, ease: 'power1.out'}, fade + .85);
      };
      const updateScene = () => {
        if (building || !timeline?.scrollTrigger) return;
        const progress = timeline.scrollTrigger.progress;
        if (progress < .84 && firstSlide.parentElement.scrollLeft) firstSlide.parentElement.scrollLeft = 0;
        changeText(phaseAt(progress));
        setLayer(gallery, progress >= .97);
      };
      const galleryBox = () => {
        const parent = stage.getBoundingClientRect();
        const rect = firstSlide.getBoundingClientRect();
        return {left: rect.left - parent.left, top: rect.top - parent.top, width: rect.width, height: rect.height};
      };
      const build = () => {
        building = true;
        const restoring = phase !== undefined;
        textTransition?.kill();
        if (timeline) { timeline.scrollTrigger?.kill(true); timeline.kill(); }
        splits.forEach(split => split.revert());
        splits = [];
        lines.clear();
        phase = undefined;
        gsap.set([visit, about, photo, overlay, title, gallery], {clearProps: 'all'});
        gsap.set([visit, about, gallery], {autoAlpha: 0});
        gsap.set(title, {yPercent: 115, autoAlpha: 0});
        gsap.set(overlay, {backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)', backgroundColor: 'rgba(20,23,25,0)'});
        layers.forEach(splitLines);
        timeline = gsap.timeline({
          defaults: {ease: 'none'},
          scrollTrigger: {
            id: 'interior-story', trigger: story, pin: stage,
            start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.2),
            scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
            onUpdate: updateScene
          }
        });
        timeline.to(overlay, {backdropFilter: 'blur(17px)', webkitBackdropFilter: 'blur(17px)', backgroundColor: 'rgba(20,23,25,.42)', duration: .12}, .02)
          .to(title, {yPercent: 0, autoAlpha: 1, duration: .12, ease: 'power2.out'}, .02)
          .to(title, {autoAlpha: 0, yPercent: 60, duration: .08}, .79)
          .to(overlay, {backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)', backgroundColor: 'rgba(20,23,25,0)', duration: .1}, .8)
          .to(photo, {left: () => galleryBox().left, top: () => galleryBox().top,
            width: () => galleryBox().width, height: () => galleryBox().height,
            duration: .12, ease: 'power1.inOut'}, .84)
          .to(gallery, {autoAlpha: 1, duration: .01}, .96)
          .set(photo, {autoAlpha: 0}, .97)
          .to({}, {duration: .03}, .97);
        timeline.scrollTrigger.refresh();
        const progress = timeline.scrollTrigger.progress;
        timeline.progress(progress);
        changeText(phaseAt(progress), restoring);
        building = false;
        updateScene();
      };
      build();
      const rebuild = () => {
        // Address-bar height changes do not need a new line split.
        if (Math.abs(stage.clientWidth - lastWidth) < 2) return;
        lastWidth = stage.clientWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(build, 180);
      };
      window.addEventListener('resize', rebuild, {passive: true});
      const refresh = () => ScrollTrigger.refresh();
      if (firstSlide.complete) refresh(); else firstSlide.addEventListener('load', refresh, {once: true});
      return () => {
        building = true;
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', rebuild);
        firstSlide.removeEventListener('load', refresh);
        textTransition?.kill();
        timeline?.scrollTrigger?.kill(true);
        timeline?.kill();
        splits.forEach(split => split.revert());
        story.classList.remove('is-animated');
        delete story.dataset.textPhase;
        gsap.set([visit, about, photo, overlay, title, gallery, ...story.querySelectorAll('.button')], {clearProps: 'all'});
        [visit, about, gallery].forEach(layer => {layer.inert = false; layer.removeAttribute('aria-hidden');});
      };
    });
  });
})();
