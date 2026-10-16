const byId = id => document.getElementById(id);
const glossaryById = new Map(glossary.map(term => [term.id, term]));
const lessonById = new Map(lessons.map(lesson => [lesson.id, lesson]));
const stageById = new Map(stages.map(stage => [stage.id, stage]));
const progressKey = 'architect-handbook-progress-v1';
const topicWord = n => n % 10 === 1 && n % 100 !== 11 ? 'тема' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'темы' : 'тем';
let completed = new Set();
try { completed = new Set(JSON.parse(localStorage.getItem(progressKey) || '[]').filter(id => lessonById.has(id))); } catch (_) {}
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function renderNav(activeStage) {
  byId('stage-nav').innerHTML = stages.map(stage => {
    const count = lessons.filter(lesson => lesson.stage === stage.id && completed.has(lesson.id)).length;
    const total = lessons.filter(lesson => lesson.stage === stage.id).length;
    return `<a class="stage-nav-item ${activeStage === stage.id ? 'active' : ''}" href="#/stage/${stage.id}"><span class="stage-nav-num">${stage.icon}</span><span>${esc(stage.title)}</span><span class="stage-nav-progress">${count}/${total}</span></a>`;
  }).join('');
  byId('term-count').textContent = glossary.length;
}

function lessonCard(lesson, number) {
  const done = completed.has(lesson.id);
  return `<a class="lesson-card" href="#/lesson/${lesson.id}"><span class="lesson-number">${String(number).padStart(2,'0')}</span><span class="lesson-copy"><strong>${esc(lesson.title)}</strong><span>${esc(lesson.summary)}</span></span><span class="lesson-status ${done ? 'done' : ''}" aria-label="${done ? 'Пройдено' : 'Не пройдено'}">${done ? '✓' : '↗'}</span></a>`;
}

function renderHome() {
  const next = lessons.find(lesson => !completed.has(lesson.id)) || lessons[0];
  const percent = Math.round(completed.size / lessons.length * 100);
  byId('breadcrumbs').innerHTML = 'Главная <span>/</span> Маршрут';
  byId('main').innerHTML = `<section class="hero"><div class="eyebrow"><span class="eyebrow-line"></span> УЧЕБНЫЙ МАРШРУТ · ${lessons.length} ${topicWord(lessons.length).toUpperCase()}</div><h1>Понимать систему.<br><em>Обосновывать решения.</em></h1><p class="hero-lead">Справочник программного архитектора: от первых понятий до проектирования, эксплуатации и развития сложных систем. Идите по порядку или открывайте нужную тему.</p><div class="hero-actions"><a class="primary-button" href="#/lesson/${next.id}">${completed.size ? 'Продолжить обучение' : 'Начать с первой темы'} <span>↗</span></a><a class="quiet-button" href="#/glossary">Открыть словарь →</a></div><div class="hero-decoration" aria-hidden="true"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="orbit orbit-three"></span><span class="orbit-core">A</span></div></section>
  <section class="progress-panel"><div><span class="section-kicker">ВАШ ПРОГРЕСС</span><strong>${completed.size} <small>/ ${lessons.length}</small></strong><p>тем отмечено как изученные</p></div><div class="progress-right"><span>${percent}% маршрута</span><div class="progress-track"><span style="width:${percent}%"></span></div><small>Сохраняется только в этом браузере</small></div></section>
  <section class="content-section"><div class="section-heading"><div><span class="section-kicker">ПОСЛЕДОВАТЕЛЬНО</span><h2>Пять этапов пути</h2></div><p>Каждый этап опирается на предыдущий. Начните с основ, затем переходите к проектированию и эксплуатации.</p></div><div class="stage-grid">${stages.map((stage,index) => {const stageLessons=lessons.filter(l=>l.stage===stage.id); return `<a class="stage-card" href="#/stage/${stage.id}"><span class="stage-card-top"><span class="stage-index">${stage.icon} / 05</span><span class="stage-arrow">↗</span></span><span class="stage-card-icon">${['◈','▦','⤳','◎','✳'][index]}</span><strong>${esc(stage.title)}</strong><span class="stage-desc">${esc(stage.subtitle)}</span><span class="stage-card-footer">${stageLessons.length} ${topicWord(stageLessons.length)} <span>Смотреть →</span></span></a>`;}).join('')}</div></section>
  <section class="content-section pathway"><div class="section-heading"><div><span class="section-kicker">ПРОГРАММА</span><h2>Все темы</h2></div><p>Откройте тему, выполните небольшое задание и отметьте её как изученную.</p></div>${stages.map(stage => `<div class="pathway-group"><div class="pathway-label"><span>${stage.icon}</span><div><strong>${esc(stage.title)}</strong><small>${esc(stage.subtitle)}</small></div></div><div class="lesson-list">${lessons.filter(l=>l.stage===stage.id).map(l=>lessonCard(l,lessons.indexOf(l)+1)).join('')}</div></div>`).join('')}</section>`;
}

function renderStage(id) {
  const stage = stageById.get(id); if (!stage) return renderNotFound();
  const stageLessons = lessons.filter(l=>l.stage===id);
  byId('breadcrumbs').innerHTML = `<a href="#/">Главная</a> <span>/</span> ${esc(stage.title)}`;
  byId('main').innerHTML = `<section class="page-header"><span class="section-kicker">ЭТАП ${stage.icon} / 05</span><h1>${esc(stage.title)}</h1><p>${esc(stage.subtitle)}. Изучайте темы по порядку: каждая следующая опирается на предыдущие.</p></section><section class="narrow-content"><div class="stage-intro"><span class="stage-intro-icon">${stage.icon}</span><div><strong>${stageLessons.length} ${topicWord(stageLessons.length)} в этом этапе</strong><p>Начните с первой или продолжите с того места, где остановились.</p></div></div><div class="lesson-list">${stageLessons.map(l=>lessonCard(l,lessons.indexOf(l)+1)).join('')}</div><a class="back-link" href="#/">← Вернуться ко всему маршруту</a></section>`;
}

function renderGlossary(query='') {
  const q=query.trim().toLocaleLowerCase('ru');
  const found=glossary.filter(t=>(t.title+' '+t.description).toLocaleLowerCase('ru').includes(q)).sort((a,b)=>a.title.localeCompare(b.title,'ru'));
  byId('breadcrumbs').innerHTML = '<a href="#/">Главная</a> <span>/</span> Словарь';
  byId('main').innerHTML = `<section class="page-header"><span class="section-kicker">СПРАВОЧНИК ПОНЯТИЙ</span><h1>Словарь терминов</h1><p>Определения сокращений и ключевых понятий. Ищите по названию или описанию, затем переходите к темам, где они встречаются.</p></section><section class="narrow-content glossary-content"><label class="search-box"><span aria-hidden="true">⌕</span><input id="glossary-search" type="search" placeholder="Найти термин или сокращение..." value="${esc(query)}" autocomplete="off"><kbd>/</kbd></label><div class="glossary-summary" id="glossary-summary">Найдено: ${found.length} из ${glossary.length}</div><div class="glossary-list" id="glossary-list">${glossaryCards(found)}</div></section>`;
  const input=byId('glossary-search'); input.addEventListener('input',()=>{const q=input.value.trim().toLocaleLowerCase('ru'); const items=glossary.filter(t=>(t.title+' '+t.description).toLocaleLowerCase('ru').includes(q)).sort((a,b)=>a.title.localeCompare(b.title,'ru'));byId('glossary-list').innerHTML=glossaryCards(items);byId('glossary-summary').textContent=`Найдено: ${items.length} из ${glossary.length}`;});
}
function glossaryCards(items) {return items.length?items.map(term=>`<a class="glossary-item" href="#/glossary/${term.id}"><strong>${esc(term.title)}</strong><p>${esc(term.description)}</p><span>Подробнее ↗</span></a>`).join(''):'<div class="empty-state">Ничего не найдено. Попробуйте другое слово.</div>';}

function renderTerm(id) {
  const term=glossaryById.get(id); if(!term) return renderNotFound();
  const related=lessons.filter(l=>l.terms.includes(id));
  byId('breadcrumbs').innerHTML=`<a href="#/">Главная</a> <span>/</span> <a href="#/glossary">Словарь</a> <span>/</span> ${esc(term.title)}`;
  byId('main').innerHTML=`<section class="page-header"><span class="section-kicker">СЛОВАРЬ / ПОНЯТИЕ</span><h1>${esc(term.title)}</h1><p>${esc(term.description)}</p></section><section class="narrow-content term-page"><span class="article-number">ГДЕ ИЗУЧАТЬ</span><h2>Темы с этим понятием</h2><div class="lesson-list">${related.map(l=>lessonCard(l,lessons.indexOf(l)+1)).join('')}</div><a class="back-link" href="#/glossary">← Все термины</a></section>`;
}

function renderAbout() {
  byId('breadcrumbs').innerHTML='<a href="#/">Главная</a> <span>/</span> О проекте';
  byId('main').innerHTML=`<section class="page-header"><span class="section-kicker">О ПРОЕКТЕ</span><h1>Как пользоваться справочником</h1><p>Это открытая карта знаний программного архитектора. Она помогает начать с простого и постепенно связать идеи в целостную картину.</p></section><section class="narrow-content about-content"><div class="article-block"><span class="article-number">01 / МАРШРУТ</span><h2>Идите по темам</h2><p>Последовательность начинается с программы и сети, затем переходит к границам системы, данным, взаимодействию, эксплуатации и архитектурным решениям.</p></div><div class="article-block"><span class="article-number">02 / ПРАКТИКА</span><h2>Применяйте на примере</h2><p>В каждой теме есть короткое задание. Лучше выполнить его на знакомом проекте, чем только прочитать определения.</p></div><div class="article-block"><span class="article-number">03 / СЛОВАРЬ</span><h2>Возвращайтесь к понятиям</h2><p>Термины раскрываются прямо на странице урока. Под каждым определением есть ссылка на отдельную карточку словаря.</p></div><div class="about-note">Справочник основан на предоставленной пользователем памятке из 20 разделов. Это стартовая учебная карта; конкретные технологии выбирайте под задачи вашего проекта.</div><a class="primary-button" href="#/lesson/${lessons[0].id}">Начать обучение <span>↗</span></a></section>`;
}
function renderNotFound(){byId('breadcrumbs').textContent='Не найдено';byId('main').innerHTML='<section class="page-header"><span class="section-kicker">404</span><h1>Страница не найдена</h1><p>Проверьте ссылку или вернитесь к маршруту.</p><a class="primary-button" href="#/">На главную ↗</a></section>';}

function route() {
  const parts=(location.hash.slice(2)||'').split('/');
  const kind=parts[0], id=parts[1];
  const activeStage=kind==='stage'?id:kind==='lesson'&&lessonById.has(id)?lessonById.get(id).stage:null;
  renderNav(activeStage);
  if(!kind) renderHome(); else if(kind==='stage') renderStage(id); else if(kind==='lesson') renderLesson(id); else if(kind==='glossary'&&id) renderTerm(id); else if(kind==='glossary') renderGlossary(); else if(kind==='about') renderAbout(); else renderNotFound();
  document.title=(kind==='lesson'&&lessonById.has(id)?lessonById.get(id).title:kind==='glossary'&&id&&glossaryById.has(id)?glossaryById.get(id).title:kind==='glossary'?'Словарь терминов':kind==='stage'&&stageById.has(id)?stageById.get(id).title:'Архитектура ПО')+' — открытый справочник';
  byId('sidebar').classList.remove('open');byId('menu-button').setAttribute('aria-expanded','false');window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();location.hash='#/glossary';setTimeout(()=>byId('glossary-search')?.focus(),0);}});
byId('menu-button').addEventListener('click',()=>{const open=byId('sidebar').classList.toggle('open');byId('menu-button').setAttribute('aria-expanded',String(open));});
route();
