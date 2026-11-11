// Native scrolling keeps swipe, touchpad and keyboard navigation available.
function createCarousel(track, {label, loop = false, nextButton, controlsAfter} = {}) {
  const cards = [...track.children];
  track.setAttribute('role', 'region');
  track.setAttribute('aria-roledescription', 'карусель');
  track.setAttribute('aria-label', label);
  track.tabIndex = 0;
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  controls.innerHTML = `<input class="carousel-position" type="range" min="0" max="100" value="0" aria-label="Положение слайдера: ${label}"><div class="carousel-buttons"><button type="button" aria-label="Назад: ${label}">‹</button><button type="button" aria-label="Вперёд: ${label}">›</button></div><span class="sr-only" aria-live="polite"></span>`;
  const existingRule = track.parentElement.querySelector('.track-rule');
  if (controlsAfter) controlsAfter.after(controls); else if (existingRule) existingRule.replaceWith(controls); else track.after(controls);
  const range = controls.querySelector('input');
  const [prev, next] = controls.querySelectorAll('button');
  const status = controls.querySelector('[aria-live]');
  const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const positions = () => [...new Set(cards.map(card => Math.min(max(), card.offsetLeft - cards[0].offsetLeft)))];
  const go = value => track.scrollTo({left: Math.max(0, Math.min(max(), value)), behavior: 'instant'});
  function move(direction) {
    const stops = positions();
    let target = direction > 0 ? stops.find(x => x > track.scrollLeft + 2) : [...stops].reverse().find(x => x < track.scrollLeft - 2);
    if (target === undefined) target = loop ? (direction > 0 ? 0 : max()) : track.scrollLeft;
    go(target);
    update();
  }
  function update() {
    const overflow = max() > 1;
    controls.hidden = !overflow;
    range.value = max() ? track.scrollLeft / max() * 100 : 0;
    range.style.setProperty('--progress', range.value + '%');
    prev.disabled = !loop && track.scrollLeft < 2;
    next.disabled = !loop && track.scrollLeft >= max() - 2;
    status.textContent = `Слайд ${Math.min(cards.length, positions().filter(x => x <= track.scrollLeft + 2).length)} из ${cards.length}`;
    if (nextButton) nextButton.hidden = !overflow;
  }
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  nextButton?.addEventListener('click', () => move(1));
  range.addEventListener('input', () => go(Number(range.value) / 100 * max()));
  track.addEventListener('scroll', update, {passive:true});
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') go(0);
      else if (event.key === 'End') go(max());
      else move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  new ResizeObserver(update).observe(track);
  update();
  return {move};
}
createCarousel(document.querySelector('.service-track'), {label:'Направления услуг'});
createCarousel(document.querySelector('.team-track'), {label:'Специалисты'});
createCarousel(document.querySelector('.review-grid'), {label:'Отзывы'});
createCarousel(document.querySelector('.gallery-track'), {label:'Интерьер центра', loop:true, nextButton:document.querySelector('[data-gallery-next]')});

// The second offer reuses the gift certificate content supplied in the design.
const offers = [
  {title:'RF-лифтинг Scarlet<br>— скидка 10%', status:'Акция 28.11.2026', text:'Лицо + шея от 36 500 ₽ + ФДТ<br>+ зона вокруг глаз в подарок', button:'Подробнее об акции', gift:false},
  {title:'Подарочный<br>сертификат', status:'3 000 ₽ · 5 000 ₽ · 10 000 ₽', text:'Подарите заботу о себе', button:'Подарить сертификат', gift:true}
];
let offerIndex = 0;
const offerRegion = document.querySelector('.offer-grid');
function changeOffer(direction) {
  offerIndex = (offerIndex + direction + offers.length) % offers.length;
  const offer = offers[offerIndex];
  offerRegion.querySelector('h2').innerHTML = offer.title;
  offerRegion.querySelector('.offer-status').textContent = offer.status;
  offerRegion.querySelector('.offer-description p:last-child').innerHTML = offer.text;
  const offerButton = offerRegion.querySelector('[data-offer]');
  offerButton.querySelector('.hero-cta-label').textContent = offer.button;
  offerButton.querySelector('svg text').textContent = offer.button;
  offerButton.setAttribute('aria-label', offer.button);
  offerRegion.dataset.giftOffer = String(offer.gift);
  offerRegion.setAttribute('aria-label', `Предложения центра: ${offerIndex + 1} из ${offers.length}`);
}
document.querySelector('[data-offer-prev]').addEventListener('click', () => changeOffer(-1));
document.querySelector('[data-offer-next]').addEventListener('click', () => changeOffer(1));
offerRegion.addEventListener('keydown', event => {
  if (event.target === offerRegion && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); changeOffer(event.key === 'ArrowRight' ? 1 : -1); }
});
let touchStart;
offerRegion.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, {passive:true});
offerRegion.addEventListener('touchend', event => { const delta = event.changedTouches[0].clientX - touchStart; if (Math.abs(delta) > 50) changeOffer(delta < 0 ? 1 : -1); }, {passive:true});

const brandTrack = document.querySelector('.brand-track');
[...brandTrack.children].forEach(logo => { const slot = document.createElement('div'); slot.className = 'brand-slot'; logo.replaceWith(slot); slot.append(logo); });
// Partner logos remain a static strip, as requested.
