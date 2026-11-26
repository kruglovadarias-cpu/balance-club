/* Shared, progressively enhanced interactions for the inner pages. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  $('.goal-close')?.addEventListener('click', event => {
    const picker = event.currentTarget.closest('details');
    picker.open = false;
    $('summary', picker).focus({ preventScroll: true });
  });
  const contact = $('#contact-dialog');
  function openContact(title = 'Запись на консультацию', description = 'Администратор поможет выбрать специалиста и удобное время.') {
    $('#dialog-title').textContent = title;
    $('#dialog-description').textContent = description;
    if (!contact.open) contact.showModal();
  }
  document.addEventListener('click', event => {
    const request = event.target.closest('[data-request], [data-contact], [data-gift], [data-document]');
    if (!request) return;
    event.preventDefault();
    if (request.hasAttribute('data-document')) {
      openContact(request.dataset.document, 'Для получения актуального документа свяжитесь с администратором центра.');
    } else if (request.dataset.request) {
      openContact(request.dataset.request, 'Уточните у администратора условия, стоимость и доступное время записи.');
    } else if (request.hasAttribute('data-gift')) {
      openContact('Подарочный сертификат', 'Администратор поможет выбрать номинал и оформить сертификат.');
    } else openContact();
  });
  $$('dialog').forEach(dialog => {
    $('.dialog-close', dialog)?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  const menu = $('.menu-toggle');
  const navigation = $('#navigation');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    navigation.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menu?.setAttribute('aria-expanded', 'false');
      navigation?.classList.remove('is-open');
    }
  });
  const search = $('#search-dialog');
  $('.search-toggle')?.addEventListener('click', () => { search.showModal(); $('#search-input').focus(); });
  $('#search-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const query = $('#search-input').value.trim().toLocaleLowerCase('ru');
    const match = query && $$('main h1, main h2, main h3, main p, main th, main .document-list button').find(n => !n.closest('[hidden]') && n.textContent.toLocaleLowerCase('ru').includes(query));
    if (!match) { $('#search-status').textContent = 'Не нашли совпадений. Попробуйте другое слово.'; return; }
    search.close(); match.scrollIntoView({ block: 'center' }); match.tabIndex = -1; match.focus({ preventScroll: true });
  });
  $('#newsletter')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const email = new FormData(form).get('email');
    $('.form-status', form).textContent = 'Откроется письмо администратору для подтверждения подписки.';
    location.href = 'mailto:balanceclub@bk.ru?subject=' + encodeURIComponent('Подписка на новости Balance Club') + '&body=' + encodeURIComponent('Хочу подписаться на новости центра. Мой email: ' + email);
  });
  $$('[data-request-form]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    $('.form-status', form).textContent = 'Откроется письмо администратору. Отправьте его, чтобы передать заявку.';
    location.href = 'mailto:balanceclub@bk.ru?subject=' + encodeURIComponent('Консультация — Balance Club') + '&body=' + encodeURIComponent('Имя: ' + data.get('name') + '\nТелефон: ' + data.get('phone') + '\nПроцедура: Релатокс\nСогласие на обработку персональных данных: отмечено пользователем.');
  }));
  const pageName = location.pathname.split('/').pop();
  const groups = $$('.catalog-group');
  function selectGroup(value) {
    $$('[data-group]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.group === value)));
    // Temporarily show the same supplied catalog for every service group.
    groups.forEach(g => { g.hidden = false; });
    const empty = $('.empty-results');
    if (empty) empty.hidden = groups.some(g => !g.hidden);
    const more = $('[data-expand-cards]');
    if (more) more.closest('.more-action').hidden = !groups.some(g => !g.hidden && $$('.catalog-tile[hidden]', g).length);
  }
  $$('[data-group]').forEach(b => b.addEventListener('click', () => selectGroup(b.dataset.group)));
  function filterStatus(text) { const status = $('.filter-status'); if (status) { status.textContent = text; status.hidden = !text; } }
  $$('[data-filter] button').forEach(button => button.addEventListener('click', () => {
    const row = button.closest('[data-filter]');
    const value = button.dataset.value;
    $$('button', row).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    if (groups.length) {
      groups.forEach(g => { g.hidden = false; });
      $('.empty-results').hidden = true;
      $('.catalog-menu').hidden = false;
      const more = $('[data-expand-cards]');
      if (more) more.closest('.more-action').hidden = !$('.catalog-tile[hidden]');
      filterStatus('');
      return;
    }
    const direction = $('[data-filter="direction"] [aria-pressed="true"]')?.dataset.value;
    const category = $('[data-filter="category"] [aria-pressed="true"]')?.dataset.value;
    const hasDirection = direction === 'Эстетическая косметология';
    const hasCategory = pageName === 'catalog.html' ? category === 'Эстетическая косметология' : category === 'Инъекционные методики';
    const available = hasDirection && hasCategory;
    if (groups.length) { groups.forEach(g => g.hidden = !available); $('.empty-results').hidden = available; $('.catalog-menu').hidden = !available; $('.more-action').hidden = !available || !$('.catalog-tile[hidden]'); }
    if ($('.price-groups')) $('.price-groups').hidden = !available;
    if ($('.blog-grid')) { $('.blog-grid').hidden = !available; $('.more-action').hidden = !available; }
    filterStatus(available ? '' : 'Материалы этой категории пока не добавлены. Уточнить услуги и цены можно у администратора.');
  }));
  // Reveal only the supplied cards; never invent extra services or publications.
  const tiles = $$('.catalog-tile');
  if (tiles.length > 12 && groups.length) {
    tiles.slice(12).forEach(n => n.hidden = true);
    const more = $('[data-expand-cards]');
    more.textContent = 'Показать ещё ' + (tiles.length - 12) + ' услуг';
    more.addEventListener('click', () => { tiles.forEach(n => n.hidden = false); more.closest('.more-action').hidden = true; });
  } else $('[data-expand-cards]')?.closest('.more-action').setAttribute('hidden', '');
  const blogCards = $$('.page-blog .blog-card');
  if (blogCards.length > 8) {
    blogCards.slice(8).forEach(n => n.hidden = true);
    const more = $('[data-expand-blog]');
    more.textContent = 'Показать ещё ' + (blogCards.length - 8) + ' статьи';
    more.addEventListener('click', () => { blogCards.forEach(n => n.hidden = false); more.closest('.more-action').hidden = true; });
  } else $('[data-expand-blog]')?.closest('.more-action').setAttribute('hidden', '');
  const params = new URLSearchParams(location.search);
  if (params.has('group')) selectGroup(params.get('group'));
  if (params.has('direction')) {
    const labels = { hair: 'Hair-студия', nail: 'Nail-студия', body: 'Body-студия', epilation: 'Ситудия эпиляции' };
    $$('[data-filter="direction"] button').find(b => b.dataset.value === labels[params.get('direction')])?.click();
  }
  if (params.get('category') === 'hardware') $$('[data-filter="category"] button').find(b => b.dataset.value === 'Аппаратные методики')?.click();
})();
