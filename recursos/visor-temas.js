'use strict';

(() => {
  const lessons = [...document.querySelectorAll('.lesson')];
  const lessonIds = lessons.map(lesson => lesson.id);
  const menuButtons = [...document.querySelectorAll('[data-lesson-target]')];
  const topicNavigation = document.querySelector('.topic-nav');
  const steps = [...document.querySelectorAll('[data-completed]')];
  const previousLesson = document.getElementById('prev-lesson');
  const nextLesson = document.getElementById('next-lesson');
  const progress = document.querySelector('.progress-bar');
  const storageKey = document.querySelector('[data-study-key]').dataset.studyKey;
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

  function showLesson(index, target = null) {
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
    if (target) target.scrollIntoView({block: 'start'});
  }

  function goTo(index) {
    history.replaceState(null, '', `#${lessonIds[index]}`);
    showLesson(index, lessons[index]);
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
  function followFragment() {
    const target = document.getElementById(location.hash.slice(1));
    const index = lessons.indexOf(target?.closest('.lesson'));
    if (index === -1) return false;
    showLesson(index, target);
    return true;
  }

  if (!followFragment()) showLesson(0);
  window.addEventListener('hashchange', followFragment);
})();
