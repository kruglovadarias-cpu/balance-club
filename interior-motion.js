/* One reversible timeline. Scroll distance, rather than a timer, drives each state. */
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
  const media = gsap.matchMedia();
  let rebuild;

  document.fonts.ready.then(() => {
    media.add('(prefers-reduced-motion: no-preference)', () => {
      story.classList.add('is-animated');
      let timeline, splits = [], resizeTimer;
      let lastWidth = stage.clientWidth;
      const revealSelector = 'p, h2, h3, .interior-contract';
      const setLayer = (layer, visible) => {
        layer.inert = !visible;
        layer.setAttribute('aria-hidden', String(!visible));
      };
      const updateLayers = () => {
        const time = timeline.time();
        if (time < 9.5 && firstSlide.parentElement.scrollLeft) firstSlide.parentElement.scrollLeft = 0;
        setLayer(visit, time >= 1.1 && time < 4.5);
        setLayer(about, time >= 4.8 && time < 8.9);
        setLayer(gallery, time >= 11.5);
      };
      const splitLines = layer => {
        const split = SplitText.create(layer.querySelectorAll(revealSelector), {
          type: 'lines', linesClass: 'interior-line', aria: 'auto'
        });
        splits.push(split);
        return split.lines;
      };
      const reveal = (lines, at, span) => {
        timeline.fromTo(lines,
          {opacity: 0, yPercent: 65, filter: 'blur(8px)'},
          {opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: .32,
            stagger: {amount: span}, ease: 'power1.out'}, at);
      };
      const galleryBox = () => {
        const parent = stage.getBoundingClientRect();
        const rect = firstSlide.getBoundingClientRect();
        return {left: rect.left - parent.left, top: rect.top - parent.top, width: rect.width, height: rect.height};
      };
      const build = () => {
        const oldProgress = timeline?.scrollTrigger?.progress || 0;
        if (timeline) { timeline.scrollTrigger?.kill(true); timeline.kill(); }
        splits.forEach(split => split.revert());
        splits = [];
        gsap.set([visit, about, photo, overlay, title, gallery], {clearProps: 'all'});
        gsap.set([visit, about, gallery], {autoAlpha: 0});
        gsap.set(title, {yPercent: 115, autoAlpha: 0});
        gsap.set(overlay, {backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)', backgroundColor: 'rgba(20,23,25,0)'});
        const visitLines = splitLines(visit);
        const aboutLines = splitLines(about);
        timeline = gsap.timeline({
          defaults: {ease: 'none'},
          scrollTrigger: {
            id: 'interior-story', trigger: story, pin: stage,
            start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 5.5),
            scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
            onUpdate: updateLayers
          }
        });
        timeline.to(overlay, {backdropFilter: 'blur(17px)', webkitBackdropFilter: 'blur(17px)', backgroundColor: 'rgba(20,23,25,.42)', duration: .9}, .3)
          .to(title, {yPercent: 0, autoAlpha: 1, duration: .9, ease: 'power2.out'}, .3)
          .set(visit, {autoAlpha: 1}, 1.1);
        reveal(visitLines, 1.15, 1.75);
        timeline.fromTo(visit.querySelector('.button'), {autoAlpha: 0, y: 20}, {autoAlpha: 1, y: 0, duration: .35}, 3.25)
          .to(visit, {autoAlpha: 0, y: -24, duration: .5}, 4)
          .set(about, {autoAlpha: 1}, 4.8);
        reveal(aboutLines, 4.85, 1.7);
        timeline.fromTo(about.querySelector('.button'), {autoAlpha: 0, y: 20}, {autoAlpha: 1, y: 0, duration: .35}, 6.9)
          .to(about, {autoAlpha: 0, y: -24, duration: .5}, 8.4)
          .to(title, {autoAlpha: 0, yPercent: 60, duration: .7}, 8.7)
          .to(overlay, {backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)', backgroundColor: 'rgba(20,23,25,0)', duration: 1}, 9)
          .to(photo, {left: () => galleryBox().left, top: () => galleryBox().top,
            width: () => galleryBox().width, height: () => galleryBox().height,
            duration: 2, ease: 'power1.inOut'}, 9.5)
          .to(gallery, {autoAlpha: 1, duration: .15}, 11.5)
          .set(photo, {autoAlpha: 0}, 11.65)
          .to({}, {duration: .35}, 11.65);
        timeline.scrollTrigger.refresh();
        timeline.progress(oldProgress);
        updateLayers();
      };
      build();
      rebuild = () => {
        // Ignore mobile address-bar height changes; re-split only if line widths change.
        if (Math.abs(stage.clientWidth - lastWidth) < 2) return;
        lastWidth = stage.clientWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(build, 180);
      };
      window.addEventListener('resize', rebuild, {passive: true});
      const refresh = () => ScrollTrigger.refresh();
      if (firstSlide.complete) refresh(); else firstSlide.addEventListener('load', refresh, {once: true});
      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', rebuild);
        timeline?.scrollTrigger?.kill(true);
        timeline?.kill();
        splits.forEach(split => split.revert());
        story.classList.remove('is-animated');
        gsap.set([visit, about, photo, overlay, title, gallery, ...story.querySelectorAll('.button')], {clearProps: 'all'});
        [visit, about, gallery].forEach(layer => {layer.inert = false; layer.removeAttribute('aria-hidden');});
      };
    });
  });
})();
