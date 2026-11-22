'use strict';

for (const carousel of document.querySelectorAll('[data-carousel]')) {
  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  const controls = carousel.querySelector('.carousel-controls');
  const selector = controls.querySelector('select');
  const previous = controls.querySelector('[data-prev]');
  const next = controls.querySelector('[data-next]');
  const status = controls.querySelector('[role="status"]');
  let current = 0;

  slides.forEach((slide, index) => {
    const title = slide.querySelector('h4').textContent;
    selector.add(new Option(title, String(index)));
  });

  function show(index) {
    current = Math.max(0, Math.min(index, slides.length - 1));
    slides.forEach((slide, position) => {
      slide.hidden = position !== current;
    });
    selector.value = String(current);
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    status.textContent = `${current + 1} de ${slides.length} · ${selector.selectedOptions[0].textContent}`;
    if (document.activeElement === previous && previous.disabled || document.activeElement === next && next.disabled) {
      selector.focus({preventScroll: true});
    }
  }

  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  selector.addEventListener('change', () => show(Number(selector.value)));
  controls.addEventListener('keydown', event => {
    if (event.target === selector) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  show(0);
  controls.hidden = false;
}
