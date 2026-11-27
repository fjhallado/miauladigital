(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const criteria = ['coste', 'estabilidad', 'mantenimiento', 'reutilización'];
  const ideas = [
    ['Panel con envases', [4, 3, 3, 4]],
    ['Módulos de macetas', [3, 4, 4, 2]],
    ['Bolsillos desmontables', [4, 2, 3, 3]]
  ];
  const tbody = $('idea-matrix').tBodies[0];

  function updateTotals() {
    const totals = [...tbody.rows].map(row => {
      const total = [...row.querySelectorAll('select')].reduce((sum, field) => sum + Number(field.value), 0);
      row.lastElementChild.textContent = total + ' / 16';
      return total;
    });
    const best = Math.max(...totals);
    const leaders = ideas.filter((_, index) => totals[index] === best).map(([name]) => name);
    [...tbody.rows].forEach((row, index) => row.classList.toggle('leader', totals[index] === best));
    $('idea-result').textContent = leaders.length > 1
      ? `Empate a ${best} puntos entre ${leaders.join(' y ')}. Decide qué criterio pesa más en tu reto.`
      : `${leaders[0]} obtiene la mayor puntuación, ${best} de 16.`;
  }

  function resetMatrix() {
    tbody.replaceChildren();
    for (const [idea, scores] of ideas) {
      const row = tbody.insertRow();
      const title = document.createElement('th');
      title.scope = 'row';
      title.textContent = idea;
      row.append(title);
      scores.forEach((score, index) => {
        const select = document.createElement('select');
        select.setAttribute('aria-label', idea + ' · ' + criteria[index]);
        for (let value = 1; value <= 4; value++) select.add(new Option(value, value));
        select.value = score;
        row.insertCell().append(select);
      });
      row.insertCell();
    }
    updateTotals();
  }
  tbody.addEventListener('change', updateTotals);
  $('idea-reset').addEventListener('click', resetMatrix);
  resetMatrix();

  const quiz = [
    {
      prompt: '¿Cuál es una especificación técnica que puedes medir?',
      choices: ['Que las plantas se vean bonitas.', 'Que el panel mida 600 mm de alto como máximo.', 'Que el jardín resulte original.'],
      answer: 1,
      explanation: 'La altura se puede medir y comparar con el máximo acordado.'
    },
    {
      prompt: 'Una idea puntúa alto pero supera el presupuesto máximo. ¿Qué haces?',
      choices: ['La seleccionas por su puntuación.', 'Cambias el presupuesto después del montaje.', 'Revisas la idea para que cumpla el límite o eliges otra.'],
      answer: 2,
      explanation: 'Los requisitos obligatorios se comprueban antes de comparar las puntuaciones.'
    },
    {
      prompt: '¿Qué documento indica cuántos recipientes hacen falta y de qué material son?',
      choices: ['El despiece.', 'El cronograma.', 'El resumen de resultados.'],
      answer: 0,
      explanation: 'El despiece identifica cada elemento, su cantidad, su material y sus medidas cuando proceda.'
    },
    {
      prompt: '¿Qué muestra un diagrama de Gantt?',
      choices: ['Las dimensiones de cada pieza.', 'La secuencia, duración y solapamiento de las tareas.', 'El peso que resiste un soporte.'],
      answer: 1,
      explanation: 'El eje del tiempo permite ver cuándo empieza y termina cada actividad.'
    },
    {
      prompt: 'Has cambiado la posición de la bandeja. ¿Cómo compruebas si ha mejorado?',
      choices: ['Aumentas también el caudal y comparas el resultado.', 'Das por buena la mejora si el dibujo queda mejor.', 'Repites el ensayo con las mismas cantidades y comparas las pérdidas.'],
      answer: 2,
      explanation: 'Mantener las condiciones ayuda a relacionar la diferencia observada con el cambio introducido.'
    },
    {
      prompt: '¿Qué evidencia debe aparecer en la memoria técnica?',
      choices: ['Las medidas, el resultado de la prueba y las mejoras realizadas.', 'Solo una foto del producto acabado.', 'Una nota de grupo sin explicar de dónde sale.'],
      answer: 0,
      explanation: 'La memoria registra el diseño, el proceso de trabajo y las evidencias de evaluación.'
    }
  ];
  const form = $('process-quiz');
  const questions = $('process-questions');
  const summary = $('process-quiz-result');

  quiz.forEach(({prompt, choices}, index) => {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `${index + 1}. ${prompt}`;
    fieldset.append(legend);
    for (const [value, option] of choices.entries()) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'respuesta-' + index;
      radio.value = value;
      radio.required = true;
      label.append(radio, document.createTextNode(option));
      fieldset.append(label);
    }
    const feedback = document.createElement('p');
    feedback.className = 'process-feedback';
    feedback.hidden = true;
    fieldset.append(feedback);
    questions.append(fieldset);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const answers = new FormData(form);
    let hits = 0;
    quiz.forEach(({answer, explanation}, index) => {
      const correct = answers.get('respuesta-' + index) === String(answer);
      if (correct) hits++;
      const feedback = questions.children[index].querySelector('.process-feedback');
      feedback.dataset.correct = correct;
      feedback.textContent = (correct ? 'Correcto. ' : 'Revisa tu respuesta. ') + explanation;
      feedback.hidden = false;
    });
    summary.textContent = `${hits} de ${quiz.length} respuestas correctas.`;
  });
  form.addEventListener('reset', () => {
    for (const feedback of questions.querySelectorAll('.process-feedback')) feedback.hidden = true;
    summary.textContent = '';
  });
})();
