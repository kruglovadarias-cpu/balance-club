/* A smoothed scroll playhead selects scenes; text transitions finish before the next one. */
(() => {
  const story = document.querySelector('.interior-story');
  if (!story || !window.gsap || !window.ScrollTrigger || !window.SplitText) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const stage = story.querySelector('.interior-stage');
  const visit = story.querySelector('.interior-visit');
  const about = story.querySelector('.about-layout');
  const photo = story.querySelector('.interior-photo');
  const picture = photo.querySelector('.about-picture');
  const overlay = story.querySelector('.about-overlay');
  const title = story.querySelector('.display-title');
  const gallery = story.querySelector('.interior-gallery');
  const firstSlide = gallery.querySelector('.gallery-track img');
  const layers = [visit, about];
  const media = gsap.matchMedia();
  const phases = ['clear', 'visit', 'about', 'exit'];
  const boundaries = [.16, .48, .76];
  const phaseAt = progress => phases[boundaries.filter(value => progress >= value).length];
  const setLayer = (layer, visible) => {
    layer.inert = !visible;
    layer.setAttribute('aria-hidden', String(!visible));
  };

  document.fonts.ready.then(() => {
    media.add('(prefers-reduced-motion: no-preference)', () => {
      story.classList.add('is-animated');
      let timeline, textTransition = null, splits = [], resizeTimer, phase, desiredPhase, building = false;
      let lastWidth = stage.clientWidth;
      const lines = new Map();
      const splitLines = layer => {
        const split = SplitText.create(layer.querySelectorAll('p, h2, h3, .interior-contract'), {
          type: 'lines', linesClass: 'interior-line', aria: 'auto'
        });
        splits.push(split);
        lines.set(layer, split.lines);
      };
      const stopText = () => {
        if (!textTransition) return;
        gsap.killTweensOf(textTransition);
        textTransition.kill();
        textTransition = null;
      };
      const showText = (nextPhase, immediate = false) => {
        phase = nextPhase;
        story.dataset.textPhase = nextPhase;
        const incoming = nextPhase === 'visit' ? visit : nextPhase === 'about' ? about : null;
        const outgoingVisible = layers.some(layer => parseFloat(gsap.getProperty(layer, 'opacity')) > .01);
        layers.forEach(layer => setLayer(layer, false));
        if (immediate) {
          stopText();
          gsap.set(layers, {autoAlpha: 0, y: 0});
          if (incoming) {
            gsap.set(incoming, {autoAlpha: 1});
            gsap.set(lines.get(incoming), {opacity: 1, yPercent: 0, filter: 'blur(0px)'});
            gsap.set(incoming.querySelector('.button'), {autoAlpha: 1, y: 0});
            setLayer(incoming, true);
          }
          return;
        }
        if (!incoming && !outgoingVisible) {
          gsap.set(layers, {autoAlpha: 0});
          return;
        }
        const fade = outgoingVisible ? .24 : 0;
        textTransition = gsap.timeline({paused: true, onComplete: () => {
          const completed = textTransition;
          textTransition = null;
          gsap.killTweensOf(completed);
          // Coalesce rapid wheel/touch changes: never flash a scene that is already outdated.
          if (desiredPhase !== phase) showText(desiredPhase);
        }});
        if (fade) textTransition.to(layers, {autoAlpha: 0, y: -8, duration: fade, ease: 'power1.inOut'});
        else gsap.set(layers, {autoAlpha: 0});
        if (incoming) {
          textTransition
            .set(incoming, {autoAlpha: 1, y: 0}, fade)
            .set(lines.get(incoming), {opacity: 0, yPercent: 40, filter: 'blur(4px)'}, fade)
            .set(incoming.querySelector('.button'), {autoAlpha: 0, y: 10}, fade)
            .call(() => setLayer(incoming, true), null, fade)
            .to(lines.get(incoming), {opacity: 1, yPercent: 0, filter: 'blur(0px)',
              duration: .34, stagger: {amount: .4}, ease: 'power1.out'}, fade)
            .to(incoming.querySelector('.button'), {autoAlpha: 1, y: 0, duration: .25, ease: 'power1.out'}, fade + .5);
        }
        textTransition.play(0);
      };
      const requestText = (nextPhase, immediate = false) => {
        desiredPhase = nextPhase;
        if (immediate) { showText(nextPhase, true); return; }
        if (textTransition) {
          // Speed up smoothly instead of killing and resetting partially visible lines.
          gsap.to(textTransition, {timeScale: nextPhase === phase ? 1 : nextPhase === 'exit' || nextPhase === 'clear' ? 3 : 2,
            duration: .12, overwrite: true, ease: 'power1.out'});
        } else if (nextPhase !== phase) showText(nextPhase);
      };
      const updateScene = () => {
        if (building || !timeline) return;
        const progress = timeline.progress();
        if (progress < .8 && firstSlide.parentElement.scrollLeft) firstSlide.parentElement.scrollLeft = 0;
        // A small dead band prevents trackpad jitter at the border between two scenes.
        let index = phases.indexOf(desiredPhase);
        if (index < 0) index = phases.indexOf(phaseAt(progress));
        while (index < 3 && progress >= boundaries[index] + .015) index++;
        while (index > 0 && progress < boundaries[index - 1] - .015) index--;
        if (phases[index] !== desiredPhase) requestText(phases[index]);
        setLayer(gallery, progress >= .945);
      };
      const galleryBox = () => {
        const parent = stage.getBoundingClientRect();
        const rect = firstSlide.getBoundingClientRect();
        return {left: rect.left - parent.left, top: rect.top - parent.top, width: rect.width, height: rect.height};
      };
      const imageRatio = () => (picture.naturalWidth || Number(firstSlide.getAttribute('width'))) /
        (picture.naturalHeight || Number(firstSlide.getAttribute('height')));
      const cover = (width, height) => {
        const ratio = imageRatio();
        return width / height > ratio ? {width, height: width / ratio} : {width: height * ratio, height};
      };
      const preparePicture = () => {
        const width = stage.clientWidth, height = stage.clientHeight;
        const size = cover(width, height);
        gsap.set(picture, {autoRound: false, width: size.width, height: size.height,
          left: (width - size.width) / 2, top: (height - size.height) / 2,
          x: 0, y: 0, scale: 1, transformOrigin: '50% 50%'});
      };
      const clipToSlide = () => {
        const box = galleryBox();
        return `inset(${box.top}px ${stage.clientWidth - box.left - box.width}px ${stage.clientHeight - box.top - box.height}px ${box.left}px)`;
      };
      const build = () => {
        building = true;
        const restoring = phase !== undefined;
        stopText();
        if (timeline) { timeline.scrollTrigger?.kill(true); timeline.kill(); }
        splits.forEach(split => split.revert());
        splits = [];
        lines.clear();
        phase = desiredPhase = undefined;
        gsap.set([visit, about, photo, picture, overlay, title, gallery], {clearProps: 'all'});
        gsap.set([visit, about, gallery], {autoAlpha: 0});
        gsap.set(title, {yPercent: 115, autoAlpha: 0});
        // Keep the blur radius fixed; fade the composited layer instead of repainting a new blur every frame.
        gsap.set(overlay, {autoAlpha: 0});
        gsap.set(photo, {clipPath: 'inset(0px 0px 0px 0px)'});
        preparePicture();
        layers.forEach(splitLines);
        timeline = gsap.timeline({
          defaults: {ease: 'none'},
          scrollTrigger: {
            id: 'interior-story', trigger: story, pin: stage,
            start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.2),
            scrub: .8, anticipatePin: 1, invalidateOnRefresh: true,
            onRefreshInit: preparePicture
          }
        });
        timeline.to(overlay, {autoAlpha: 1, duration: .14, ease: 'power1.inOut'}, .03)
          .to(title, {yPercent: 0, autoAlpha: 1, duration: .14, ease: 'power2.out'}, .03)
          .to(title, {autoAlpha: 0, yPercent: 45, duration: .1, ease: 'power1.inOut'}, .77)
          .to(overlay, {autoAlpha: 0, duration: .12, ease: 'power1.inOut'}, .78)
          .to(photo, {clipPath: clipToSlide, duration: .14, ease: 'power1.inOut'}, .8)
          .to(picture, {
            scale: () => cover(galleryBox().width, galleryBox().height).width / cover(stage.clientWidth, stage.clientHeight).width,
            x: () => galleryBox().left + galleryBox().width / 2 - stage.clientWidth / 2,
            y: () => galleryBox().top + galleryBox().height / 2 - stage.clientHeight / 2,
            duration: .14, ease: 'power1.inOut'
          }, .8)
          .to(gallery, {autoAlpha: 1, duration: .015}, .94)
          .set(photo, {autoAlpha: 0}, .955)
          .to({}, {duration: .045}, .955);
        // The default scrub ease catches up very aggressively after a large wheel delta.
        const scrubTween = timeline.scrollTrigger.getTween();
        if (scrubTween) { scrubTween.vars.ease = 'power1.out'; scrubTween.invalidate(); }
        timeline.eventCallback('onUpdate', updateScene);
        timeline.scrollTrigger.refresh();
        const progress = timeline.scrollTrigger.progress;
        timeline.progress(progress);
        requestText(phaseAt(progress), restoring);
        building = false;
        updateScene();
      };
      build();
      const rebuild = () => {
        if (Math.abs(stage.clientWidth - lastWidth) < 2) return;
        lastWidth = stage.clientWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(build, 180);
      };
      window.addEventListener('resize', rebuild, {passive: true});
      const refresh = () => { preparePicture(); ScrollTrigger.refresh(); };
      if (picture.complete) ScrollTrigger.refresh(); else picture.addEventListener('load', refresh, {once: true});
      return () => {
        building = true;
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', rebuild);
        picture.removeEventListener('load', refresh);
        stopText();
        timeline?.scrollTrigger?.kill(true);
        timeline?.kill();
        splits.forEach(split => split.revert());
        story.classList.remove('is-animated');
        delete story.dataset.textPhase;
        gsap.set([visit, about, photo, picture, overlay, title, gallery, ...story.querySelectorAll('.button')], {clearProps: 'all'});
        [visit, about, gallery].forEach(layer => {layer.inert = false; layer.removeAttribute('aria-hidden');});
      };
    });
  });
})();
