function termExampleMarkup(termId, compact = false) {
  const example = termExamples.get(termId);
  return `<div class="term-example ${compact ? 'term-example-compact' : ''}">
    <div class="term-example-story"><span class="example-label">ПРИМЕР ИЗ ЖИЗНИ</span><p>${esc(example.scenario)}</p></div>
    <div class="term-example-code"><span class="example-label">ПРИМЕР КОДА · ${esc(example.language)}</span><pre><code>${esc(example.code)}</code></pre></div>
  </div>`;
}

function glossaryCards(items) {
  if (!items.length) return '<div class="empty-state">Ничего не найдено. Попробуйте другое слово.</div>';
  return items.map(term => `<article class="glossary-item">
    <a class="glossary-item-title" href="#/glossary/${term.id}">${esc(term.title)} ↗</a>
    <p class="glossary-definition">${esc(term.description)}</p>
    ${termExampleMarkup(term.id, true)}
  </article>`).join('');
}

function renderTerm(id) {
  const term = glossaryById.get(id);
  if (!term) return renderNotFound();
  const related = lessons.filter(lesson => lesson.terms.includes(id));
  byId('breadcrumbs').innerHTML = `<a href="#/">Главная</a> <span>/</span> <a href="#/glossary">Словарь</a> <span>/</span> ${esc(term.title)}`;
  byId('main').innerHTML = `<section class="page-header"><span class="section-kicker">СЛОВАРЬ / ПОНЯТИЕ</span><h1>${esc(term.title)}</h1><p>${esc(term.description)}</p></section>
    <section class="narrow-content term-page">
      ${termExampleMarkup(id)}
      <div class="term-related"><span class="article-number">ГДЕ ИЗУЧАТЬ</span><h2>Темы с этим понятием</h2><div class="lesson-list">${related.map(lesson => lessonCard(lesson, lessons.indexOf(lesson) + 1)).join('')}</div></div>
      <a class="back-link" href="#/glossary">← Все термины</a>
    </section>`;
}
