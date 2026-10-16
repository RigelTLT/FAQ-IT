function renderLesson(id) {
  const lesson = lessonById.get(id);
  if (!lesson) return renderNotFound();
  const detail = lessonDetails[id];
  const index = lessons.indexOf(lesson);
  const stage = stageById.get(lesson.stage);
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  byId('breadcrumbs').innerHTML = `<a href="#/">Главная</a> <span>/</span> <a href="#/stage/${stage.id}">${esc(stage.title)}</a> <span>/</span> ${esc(lesson.title)}`;
  byId('main').innerHTML = `
    <section class="page-header lesson-header">
      <span class="section-kicker">ТЕМА ${String(index + 1).padStart(2, '0')} / ${lessons.length} · ${esc(stage.title).toUpperCase()}</span>
      <h1>${esc(lesson.title)}</h1>
      <p>${esc(lesson.summary)}</p>
      <div class="lesson-meta"><span>◷ 20–30 минут на изучение</span><span>◇ ${lesson.terms.length} понятий</span></div>
    </section>
    <article class="article detailed-article">
      <div class="reader-note"><strong>Впервые в IT?</strong><span>Читайте по порядку. Незнакомый термин можно открыть в разделе «Словарь» ниже. После чтения попробуйте объяснить тему своими словами.</span></div>
      <section class="article-block">
        <span class="article-number">01 / ПРОСТЫМИ СЛОВАМИ</span>
        <h2>Что это такое</h2>
        <p>${esc(detail.plain)}</p>
        <div class="analogy-box"><span>ПРЕДСТАВЬТЕ ТАК</span><p>${esc(detail.analogy)}</p></div>
      </section>
      <section class="article-block">
        <span class="article-number">02 / ПО ШАГАМ</span>
        <h2>Как это работает</h2>
        <ol class="explanation-steps">${detail.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      </section>
      <section class="article-block">
        <span class="article-number">03 / ПРИМЕР</span>
        <h2>Разберём ситуацию</h2>
        <p>${esc(detail.example)}</p>
      </section>
      <section class="article-block">
        <span class="article-number">04 / СЛОВАРЬ</span>
        <h2>Понятия этой темы</h2>
        <p>Откройте любое понятие, чтобы увидеть его определение и другие связанные темы.</p>
        <div class="term-grid">${lesson.terms.map(termLink).join('')}</div>
      </section>
      <section class="article-block">
        <span class="article-number">05 / ЧАСТЫЕ ОШИБКИ</span>
        <h2>На что обратить внимание</h2>
        <ul class="pitfall-list">${detail.pitfalls.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      </section>
      <section class="article-block practice-block">
        <span class="article-number">06 / ПРАКТИКА</span>
        <h2>Попробуйте сами</h2>
        <p>${esc(lesson.practice)}</p>
      </section>
      <section class="article-block">
        <span class="article-number">07 / САМОПРОВЕРКА</span>
        <h2>Ответьте своими словами</h2>
        <ol class="check-questions">${detail.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol>
      </section>
      <section class="article-block outcome-block">
        <span class="article-number">08 / РЕЗУЛЬТАТ</span>
        <h2>Что вы теперь умеете</h2>
        <p>Переходите дальше, когда можете объяснить идею и выполнить задание:</p>
        <blockquote>«${esc(lesson.result)}»</blockquote>
        <button class="complete-button ${completed.has(id) ? 'is-complete' : ''}" id="complete-button" type="button" aria-pressed="${completed.has(id)}">${completed.has(id) ? '✓ Тема изучена' : 'Отметить как изученную'}</button>
      </section>
      <nav class="lesson-pagination" aria-label="Соседние темы">
        ${previous ? `<a href="#/lesson/${previous.id}"><small>← ПРЕДЫДУЩАЯ ТЕМА</small><strong>${esc(previous.title)}</strong></a>` : '<span></span>'}
        ${next ? `<a href="#/lesson/${next.id}"><small>СЛЕДУЮЩАЯ ТЕМА →</small><strong>${esc(next.title)}</strong></a>` : '<a href="#/"><small>МАРШРУТ ЗАВЕРШЁН →</small><strong>Все темы</strong></a>'}
      </nav>
    </article>`;
  byId('complete-button').addEventListener('click', () => {
    if (completed.has(id)) completed.delete(id); else completed.add(id);
    localStorage.setItem(progressKey, JSON.stringify([...completed]));
    renderNav(lesson.stage);
    renderLesson(id);
  });
}
