'use strict';

const lessons = [...document.querySelectorAll('.lesson')];
const lessonIds = lessons.map(lesson => lesson.id);
const menuButtons = [...document.querySelectorAll('[data-lesson-target]')];
const topicNavigation = document.querySelector('.topic-nav');
const steps = [...document.querySelectorAll('[data-completed]')];
const previousLesson = document.getElementById('prev-lesson');
const nextLesson = document.getElementById('next-lesson');
const progress = document.querySelector('.progress-bar');
const storageKey = 'mad-fyq2-actividad-cientifica-repaso-v1';
let active = 0;
let completed = new Set();

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved)) completed = new Set(saved.filter(id => lessonIds.includes(id)));
} catch {
  // La navegación funciona también cuando el navegador no permite conservar el progreso.
}

function renderProgress() {
  const total = completed.size;
  document.getElementById('progress-copy').textContent = `${total} de ${lessons.length} apartados repasados`;
  progress.setAttribute('aria-valuenow', total);
  document.getElementById('progress-fill').style.width = `${100 * total / lessons.length}%`;
  for (const step of steps) step.textContent = completed.has(step.dataset.completed) ? '✓' : '○';
}

function showLesson(index, scroll = false) {
  active = index;
  const lesson = lessons[active];
  lessons.forEach((item, position) => { item.hidden = position !== active; });
  for (const button of menuButtons) {
    const selected = button.dataset.lessonTarget === lesson.id;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
  const currentTab = topicNavigation.querySelector('[aria-current="step"]').getBoundingClientRect();
  const navigationBox = topicNavigation.getBoundingClientRect();
  topicNavigation.scrollLeft += Math.min(0, currentTab.left - navigationBox.left - 9)
    + Math.max(0, currentTab.right - navigationBox.right + 9);
  document.getElementById('lesson-pos').textContent = `${active + 1} / ${lessons.length}`;
  previousLesson.disabled = active === 0;
  const last = active === lessons.length - 1;
  nextLesson.disabled = last && completed.has(lesson.id);
  nextLesson.textContent = last
    ? (nextLesson.disabled ? 'Repaso completado ✓' : 'Finalizar repaso ✓')
    : 'Siguiente apartado →';
  if (scroll) lesson.scrollIntoView({block: 'start'});
}

function goTo(index) {
  history.replaceState(null, '', `#${lessonIds[index]}`);
  showLesson(index, true);
}

for (const button of menuButtons) {
  button.addEventListener('click', () => goTo(lessonIds.indexOf(button.dataset.lessonTarget)));
}
document.getElementById('start-unit').addEventListener('click', () => goTo(0));
document.getElementById('print-unit').addEventListener('click', () => window.print());
previousLesson.addEventListener('click', () => goTo(active - 1));
nextLesson.addEventListener('click', () => {
  completed.add(lessonIds[active]);
  try {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
  } catch {
    // El progreso se conserva en memoria mientras la página esté abierta.
  }
  renderProgress();
  if (active === lessons.length - 1) showLesson(active);
  else goTo(active + 1);
});

for (const controls of document.querySelectorAll('.hero-actions, .progress-summary, .topic-nav, .lesson-footer, .side-column')) {
  controls.hidden = false;
}
renderProgress();
const initial = lessonIds.indexOf(location.hash.slice(1));
showLesson(Math.max(0, initial), initial !== -1);

window.addEventListener('hashchange', () => {
  const chapter = lessonIds.indexOf(location.hash.slice(1));
  if (chapter !== -1) showLesson(chapter, true);
});

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
