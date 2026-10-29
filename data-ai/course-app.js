(function () {
  'use strict';
  const C = window.DataCourse;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const lessons = new Map(C.lessons.map(l => [l.id,l]));
  const modules = new Map(C.modules.map(m => [m.id,m]));
  const KEY = 'data-ai-course-v1';
  const statuses = ['Не начато','В работе','Готово','Повторить'];
  const plain = x => x && typeof x === 'object' && !Array.isArray(x);
  let state = {completed:[],notes:{},gates:{},lessonStatus:{},settings:{start:C.start,weekdayHours:C.weekdayHours,weekendHours:C.weekendHours}};
  let storageWarning = '';
  function cleanState(raw) {
    if (!plain(raw)) throw new Error('Ожидается объект резервной копии.');
    const clean = {...state, completed:[], notes:{}, gates:{}, lessonStatus:{}};
    clean.completed = [...new Set((Array.isArray(raw.completed) ? raw.completed : []).filter(id => lessons.has(id)))];
    if (plain(raw.notes)) Object.entries(raw.notes).forEach(([id,note]) => {if (lessons.has(id) && typeof note === 'string') clean.notes[id] = note.slice(0,100000);});
    if (plain(raw.gates)) Object.entries(raw.gates).forEach(([id,status]) => {if (modules.has(id) && statuses.includes(status)) clean.gates[id] = status;});
    if (plain(raw.lessonStatus)) Object.entries(raw.lessonStatus).forEach(([id,status]) => {if (lessons.has(id) && statuses.includes(status)) clean.lessonStatus[id] = status;});
    if (plain(raw.settings) && /^\d{4}-\d{2}-\d{2}$/.test(raw.settings.start || '') &&
        Number.isFinite(raw.settings.weekdayHours) && Number.isFinite(raw.settings.weekendHours)) {
      C.buildSchedule(raw.settings); clean.settings = {start:raw.settings.start,weekdayHours:raw.settings.weekdayHours,weekendHours:raw.settings.weekendHours};
    }
    clean.completed.forEach(id => {clean.lessonStatus[id] = 'Готово';});
    Object.entries(clean.lessonStatus).forEach(([id,status]) => {if(status === 'Готово' && !clean.completed.includes(id)) clean.completed.push(id);});
    return clean;
  }
  try {const saved = localStorage.getItem(KEY); if(saved) state = cleanState(JSON.parse(saved));}
  catch {storageWarning = 'Сохранённые данные недоступны или повреждены. Скачивайте резервную копию прогресса.';}
  function save() {
    try {localStorage.setItem(KEY, JSON.stringify(state)); return true;}
    catch {storageWarning = 'Браузер не сохранил изменения. Экспортируйте резервную копию в справочнике.'; return false;}
  }
  function setStatus(id,status,gate=false) {
    if(gate) state.gates[id] = status;
    else {
      state.lessonStatus[id] = status;
      state.completed = state.completed.filter(x => x !== id);
      if(status === 'Готово') state.completed.push(id);
    }
    return save();
  }
  const list = (items,tag='ul',cls='') => `<${tag} class="${cls}">${items.map(t => `<li>${esc(t)}</li>`).join('')}</${tag}>`;
  const dateText = value => new Date(value+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'});
  const dayText = value => new Date(value+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'short',timeZone:'UTC'});
  const xlsxLink = '../outputs/python-bi-ai-1c-2026/learning-plan.xlsx';
  function sourceList(ids) { return `<ul class="source-list">${ids.map(id => C.sources[id]).filter(Boolean).map(([title,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(title)} ↗</a></li>`).join('')}</ul>`; }
  function card(l) {
    const index = C.lessons.indexOf(l)+1;
    return `<a class="lesson-card" href="#/lesson/${l.id}"><span class="lesson-num">${String(index).padStart(2,'0')}</span><span class="lesson-card-copy"><strong>${esc(l.title)}</strong><small>${esc(l.summary)}</small></span><span class="lesson-done ${state.completed.includes(l.id)?'done':''}" aria-label="${state.completed.includes(l.id)?'Пройден':'Ещё не пройден'}">${state.completed.includes(l.id)?'✓':'↗'}</span></a>`;
  }
  function nav(active) {
    $('track-nav').innerHTML = C.modules.map((m,i)=> {
      const own = C.lessons.filter(l=>l.module === m.id);
      return `<a href="#/module/${m.id}" class="side-link ${active===m.id?'active':''}"><span class="nav-index">${String(i+1).padStart(2,'0')}</span><span>${esc(m.title)}</span><small>${own.filter(l=>state.completed.includes(l.id)).length}/4</small></a>`;
    }).join('');
    document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active', a.dataset.nav===active));
  }
  function pageHeader(kicker,title,body) { return `<section class="page-header"><span class="kicker">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(body)}</p></section>`; }
  function home() {
    const schedule = C.buildSchedule(state.settings);
    const next = C.lessons.find(l=>!state.completed.includes(l.id)) || C.lessons[0];
    const percent = Math.round(state.completed.length / C.lessons.length *100);
    $('breadcrumbs').textContent = 'Главная / Python, BI, AI и 1С';
    $('main').innerHTML = `<section class="hero"><div class="eyebrow">60 ДНЕЙ · 12 ЭТАПОВ · 48 ПОДРОБНЫХ УРОКОВ</div><h1>От данных 1С<br><em>до работающей платформы.</em></h1><p>Python, SQL, DWH, ETL, API, BI, ML и RAG на одном сквозном проекте. В каждом уроке — теория, код с разбором, самостоятельная работа, критерии и ответы для проверки.</p><div class="hero-actions"><a class="button primary" href="#/lesson/${next.id}">${state.completed.length?'Продолжить':'Начать обучение'} ↗</a><a class="button secondary" href="#/schedule">Расписание и Excel</a></div><div class="meta-pills"><span>${dateText(schedule[0].date)} — ${dateText(schedule.at(-1).date)}</span><span>${schedule.reduce((s,d)=>s+d.hours,0)} часов по плану</span><span>12 практикумов и защита</span></div></section>
    <section class="progress"><div><span class="kicker">ВАШ ПРОГРЕСС</span><strong>${state.completed.length}<small> / 48</small></strong><p>уроков отмечено после практики</p></div><div class="progress-side"><b>${percent}% уроков · ${Object.values(state.gates).filter(s=>s==='Готово').length}/12 практикумов</b><div class="bar"><span style="width:${percent}%"></span></div><small>${esc(storageWarning || 'Учёт этого курса отделён от тимлида и архива архитектора.')}</small></div></section>
    <section class="section"><div class="section-heading"><div><span class="kicker">КАК УЧИТЬСЯ</span><h2>Интенсив с проверкой результата</h2></div></div><div class="course-intro"><div><h3>Исходный уровень</h3><p>Нужны основы Python, Git и SQL. Первый урок содержит диагностику и вариант адаптации при пробелах. Курс рассчитан на интенсивную практику; экспертность формируется дальнейшей работой и ревью.</p></div><div><h3>Нагрузка</h3><p>В будни — 7 часов как середина ваших 6–8. В выходные — условные 4 часа, их можно изменить. На теорию отведено около 25%, практику 55%, повтор и проверку 20%. Делайте перерывы между рабочими блоками.</p></div><div><h3>Один основной стек</h3><p>Основной путь: PostgreSQL, Prefect, FastAPI, один BI и scikit-learn. Airflow, Django, другие BI и нейросети — отдельные лабораторные на тех же данных. Все запрошенные темы включены.</p></div><div><h3>Каждый пятый день</h3><p>Самостоятельно соберите результат этапа и пройдите критерии. Если они не выполнены, используйте время повторения и исправьте план. Простое чтение не заменяет практику.</p></div></div></section>
    <section class="section"><div class="section-heading"><div><span class="kicker">ПРОГРАММА</span><h2>Двенадцать этапов</h2></div><p>Идите по порядку: данные, их корректность и надёжность нужны до BI и моделей.</p></div><label class="searchbox"><span>Поиск по урокам, объяснениям и коду</span><input id="course-search" type="search" placeholder="Например: SCD2, OData, leakage, Django…"></label><div id="search-results" class="search-results" aria-live="polite"></div><div class="track-grid" id="modules-grid">${C.modules.map((m,i)=>`<a class="track-card" href="#/module/${m.id}"><span class="track-card-top">ЭТАП ${String(i+1).padStart(2,'0')}<span>↗</span></span><strong>${esc(m.title)}</strong><p>${esc(m.subtitle)}</p><span class="track-card-bottom">4 урока + практикум · ${esc(m.outcome)}</span></a>`).join('')}</div></section>`;
    $('course-search').addEventListener('input', event=> {
      const query = event.target.value.trim().toLocaleLowerCase('ru');
      $('modules-grid').hidden = !!query;
      if(!query) { $('search-results').innerHTML=''; return; }
      const found = C.lessons.filter(l => JSON.stringify(l).toLocaleLowerCase('ru').includes(query));
      $('search-results').innerHTML = `<p>Найдено уроков: ${found.length}</p>${found.map(card).join('')}`;
    });
  }
  function modulePage(id) {
    const m = modules.get(id); if(!m) return notFound();
    const index = C.modules.indexOf(m);
    $('breadcrumbs').innerHTML = `<a href="#/">Программа</a> / ${esc(m.title)}`;
    $('main').innerHTML = pageHeader(`ЭТАП ${index+1} / 12 · ДНИ ${index*5+1}–${index*5+5}`,m.title,m.subtitle)+`<div class="content-narrow"><div class="callout"><strong>Результат этапа</strong><p>${esc(m.outcome)}. Четыре дня изучения и один день самостоятельного практикума. Часы и даты смотрите в расписании.</p></div>${C.lessons.filter(l=>l.module===id).map(card).join('')}<section class="gate-check"><span class="section-number">ДЕНЬ ${index*5+5} / ПРАКТИКУМ</span><h2>Соберите и проверьте</h2><p>${esc(m.gate)}</p><p><strong>Сохраните:</strong> ${esc(m.evidence)}.</p><label>Состояние практикума <select id="gate-status">${statuses.map(s=>`<option ${state.gates[id]===s?'selected':''}>${s}</option>`).join('')}</select></label><p id="gate-save" aria-live="polite"></p></section><nav class="pager">${index?`<a href="#/module/${C.modules[index-1].id}">← Предыдущий этап</a>`:'<a href="#/">← Программа</a>'}${C.modules[index+1]?`<a href="#/module/${C.modules[index+1].id}">Следующий этап →</a>`:'<a href="#/project">Итоговый проект →</a>'}</nav></div>`;
    $('gate-status').addEventListener('change',e=>{$('gate-save').textContent=setStatus(id,e.target.value,true)?'Сохранено.':storageWarning;});
  }
  function lessonPage(id) {
    const l = lessons.get(id); if(!l) return notFound();
    const m = modules.get(l.module), index = C.lessons.indexOf(l);
    const prev = C.lessons[index-1], next = C.lessons[index+1];
    const day = C.buildSchedule(state.settings).find(d=>d.lesson===id);
    $('breadcrumbs').innerHTML = `<a href="#/">Программа</a> / <a href="#/module/${m.id}">${esc(m.title)}</a> / ${esc(l.title)}`;
    $('main').innerHTML = pageHeader(`УРОК ${index+1} / 48 · ЭТАП ${C.modules.indexOf(m)+1}`,l.title,l.summary)+`<article class="article"><div class="meta-pills"><span>День ${day.day} · ${dateText(day.date)}</span><span>${day.hours} ч по плану</span><span>25% теория · 55% практика · 20% повтор</span></div><div class="callout"><strong>Результат урока</strong><p>${esc(l.result)}.</p><p>Сначала объясните идею своими словами, затем выполните пример и самостоятельную работу. ${prev?`Опора: <a href="#/lesson/${prev.id}">${esc(prev.title)}</a>.`:'Начните с диагностики ниже.'}</p></div><nav class="lesson-toc" aria-label="Содержание урока"><a href="#theory" data-jump="theory">Теория</a><a href="#example" data-jump="example">Пример</a><a href="#practice" data-jump="practice">Практика</a><a href="#criteria" data-jump="criteria">Критерии</a><a href="#selfcheck" data-jump="selfcheck">Самопроверка</a></nav>
    <section class="article-section" id="theory"><span class="section-number">01 / ОБЪЯСНЕНИЕ</span><h2>Разберитесь в устройстве</h2>${l.theory.map(([title,p])=>`<h3>${esc(title)}</h3><p>${esc(p)}</p>`).join('')}</section>
    <section class="article-section" id="example"><span class="section-number">02 / ПРИМЕР</span><h2>Код и разбор</h2><div class="codebox"><div class="codebar"><span>${esc(l.code.filename)}</span><button id="copy-code" type="button">Копировать код</button></div><pre><code>${esc(l.code.text)}</code></pre></div><p class="code-note">${l.code.runnable?'Самостоятельный минимальный пример. Установите указанные зависимости в учебное окружение.':'Фрагмент, схема или шаблон: проверьте условия и реализуйте зависимости, указанные в названии и комментариях.'}</p>${list(l.walkthrough,'ol','steps')}<p id="copy-status" class="code-note" aria-live="polite"></p></section>
    <section class="article-section practice" id="practice"><span class="section-number">03 / САМОСТОЯТЕЛЬНАЯ РАБОТА</span><h2>Сделайте на своём проекте</h2>${list(l.practice,'ol','steps')}<details class="reveal"><summary>Ориентир решения — откройте после попытки</summary><p>${esc(l.solution)}</p></details><label for="lesson-note">Решение, выводы и ссылка на артефакт</label><textarea id="lesson-note" rows="8" placeholder="Что реализовали? Как запускали? Какие результаты и ограничения?">${esc(state.notes[id]||'')}</textarea><small id="note-status" aria-live="polite">Заметка сохраняется при вводе в этом браузере.</small></section>
    <section class="article-section" id="criteria"><span class="section-number">04 / ПРИЁМКА</span><h2>Проверьте результат</h2>${list(l.criteria,'ul','checklist')}</section>
    <section class="article-section"><span class="section-number">05 / ОШИБКИ</span><h2>На что обратить внимание</h2>${list(l.pitfalls,'ul','pitfalls')}</section>
    <section class="article-section" id="selfcheck"><span class="section-number">06 / САМОПРОВЕРКА</span><h2>Ответьте без подсказки</h2>${l.questions.map(([q,a])=>`<details class="review-answer"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
    <section class="article-section"><span class="section-number">07 / ДОКУМЕНТАЦИЯ</span><h2>Официальные источники</h2><p>Материал курса самодостаточен для начала практики. По ссылкам проверяйте API установленной версии и углубляйте конкретный вопрос.</p>${sourceList(l.sources)}</section>
    <section class="article-section completion"><h2>Практика прошла проверку?</h2><p>Отметка отражает вашу проверку критериев. Её можно снять. Excel и браузер ведут прогресс независимо.</p><div class="toolbar"><button id="complete-lesson" class="button primary" aria-pressed="${state.completed.includes(id)}">${state.completed.includes(id)?'✓ Пройдено — снять отметку':'Отметить урок как пройденный'}</button><a class="button secondary" href="#/schedule">К расписанию</a></div><p id="completion-status" class="status-message" aria-live="polite"></p></section>
    <nav class="pager">${prev?`<a href="#/lesson/${prev.id}">← ${esc(prev.title)}</a>`:'<a href="#/">← Программа</a>'}${next?`<a href="#/lesson/${next.id}">${esc(next.title)} →</a>`:`<a href="#/module/${m.id}">Практикум и защита →</a>`}</nav></article>`;
    document.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();$(a.dataset.jump).scrollIntoView({behavior:'smooth'});}));
    $('lesson-note').addEventListener('input',e=>{state.notes[id]=e.target.value; $('note-status').textContent=save()?'Сохранено в этом браузере.':storageWarning;});
    $('complete-lesson').addEventListener('click',()=>{
      const done=!state.completed.includes(id), saved=setStatus(id,done?'Готово':'Не начато');
      $('complete-lesson').textContent=done?'✓ Пройдено — снять отметку':'Отметить урок как пройденный';
      $('complete-lesson').setAttribute('aria-pressed',String(done)); nav(l.module);
      $('completion-status').textContent=saved?'':storageWarning;
    });
    $('copy-code').addEventListener('click',async()=>{
      try {await navigator.clipboard.writeText(l.code.text);$('copy-status').textContent='Код скопирован.';}
      catch {$('copy-status').textContent='Автоматическое копирование недоступно. Выделите код и скопируйте вручную.';}
    });
  }
  function schedulePage() {
    const days = C.buildSchedule(state.settings), hours=days.reduce((s,d)=>s+d.hours,0);
    $('breadcrumbs').innerHTML='<a href="#/">Программа</a> / Расписание';
    $('main').innerHTML=pageHeader('ПЛАН ДО 31 ДЕКАБРЯ 2026','Расписание на 60 дней','Четыре урока и практикум на каждом этапе. Меняйте даты и нагрузку под себя; последовательность тем сохраняется.')+`<div class="wide-content"><div class="toolbar"><a class="button primary" href="${xlsxLink}" download>Скачать Excel ↗</a><a class="button secondary" href="#/project">Лабораторный комплект</a></div><div class="callout"><strong>Как распределять день</strong><p>Теория ≈25%, самостоятельная работа ≈55%, повтор и проверка ≈20%. В дополнительные часы: расширьте тестовый набор, разберите документацию и выполните углублённые задания. Перерывы планируйте отдельно. Выходные 4 часа — редактируемое допущение.</p><p>Изменения в браузере не меняют скачанный Excel. Для Excel используйте его поля настроек и ручные поправки.</p></div><form id="schedule-settings" class="settings"><label>Начало<input type="date" name="start" required value="${esc(state.settings.start)}"></label><label>Будни, ч<input type="number" min="0" max="16" step="0.5" name="weekdayHours" required value="${state.settings.weekdayHours}"></label><label>Выходные, ч<input type="number" min="0" max="16" step="0.5" name="weekendHours" required value="${state.settings.weekendHours}"></label><button class="button primary" type="submit">Применить</button></form><p class="schedule-summary">${dateText(days[0].date)} — ${dateText(days.at(-1).date)} · ${hours} часов · 48 уроков + 12 практикумов.</p><p id="schedule-message" class="status-message" aria-live="polite">${days.at(-1).date>C.deadline?'При этом начале 60-дневный маршрут выходит за дедлайн 31.12.2026. Сократите объём или перенесите начало.':''}</p><div class="table-scroll"><table class="schedule-table"><thead><tr><th>День</th><th>Дата</th><th>Тема и работа</th><th>Теория</th><th>Практика</th><th>Повтор</th><th>Итого</th><th>Состояние</th></tr></thead><tbody>${days.map(d=>{
      const status=d.lesson?(state.lessonStatus[d.lesson]||'Не начато'):(state.gates[d.module]||'Не начато');
      return `<tr class="${d.lesson?'':'gate'}"><td>${d.day}</td><td class="date-cell">${dateText(d.date)}<br>${dayText(d.date)}</td><td><a href="${d.lesson?'#/lesson/'+d.lesson:'#/module/'+d.module}">${esc(d.title)}</a><details><summary>Задание и результат</summary><p>${esc(d.task)}</p><p><b>Сохранить:</b> ${esc(d.result)}.</p></details></td><td>${d.theory} ч</td><td>${d.practice} ч</td><td>${d.review} ч</td><td>${d.hours} ч</td><td><label><span class="sr-only">Состояние дня ${d.day}</span><select data-day-id="${d.lesson||d.module}" data-gate="${!d.lesson}">${statuses.map(s=>`<option ${s===status?'selected':''}>${s}</option>`).join('')}</select></label></td></tr>`;
    }).join('')}</tbody></table></div></div>`;
    $('schedule-settings').addEventListener('submit',e=>{
      e.preventDefault();const fields=new FormData(e.target);
      const settings={start:String(fields.get('start')),weekdayHours:Number(fields.get('weekdayHours')),weekendHours:Number(fields.get('weekendHours'))};
      try {C.buildSchedule(settings); state.settings=settings;save();schedulePage();if(storageWarning)$('schedule-message').textContent=storageWarning;}
      catch(error){$('schedule-message').textContent=error.message;}
    });
    document.querySelectorAll('[data-day-id]').forEach(s=>s.addEventListener('change',()=>{
      if(!setStatus(s.dataset.dayId,s.value,s.dataset.gate==='true'))$('schedule-message').textContent=storageWarning;
      nav('schedule');
    }));
  }
  function projectPage() {
    $('breadcrumbs').innerHTML='<a href="#/">Программа</a> / Проект';
    $('main').innerHTML=pageHeader('СКВОЗНАЯ ПРАКТИКА','Учебная Data/AI-платформа','Реализуйте путь данных торговой компании и соберите портфолио, которое можно запустить и проверить.')+`<article class="article"><div class="callout"><strong>Кейс</strong><p>Две организации продают товары, делают возвраты и исправляют прошлые документы. Руководителю нужны сверенная выручка и остатки, интеграторам — API, аналитикам — витрина, планированию — прогноз, сотрудникам — ответы по регламентам с источниками.</p></div><div class="flow-diagram" aria-label="Поток проекта"><div><strong>1. Источник</strong>Mock/учебная 1С: файлы, OData, HTTP, журнал изменений.</div><div><strong>2. Обработка</strong>Python, pandas/Polars, SQLAlchemy, Prefect/Airflow.</div><div><strong>3. Хранилище</strong>Raw, staging, core, SCD2 и mart в PostgreSQL.</div><div><strong>4. Доступ</strong>FastAPI и Django-лабораторная, права и jobs.</div><div><strong>5. Аналитика</strong>Один основной BI, baseline/ML, DL-лабораторные.</div><div><strong>6. Знания</strong>Корпус, embeddings, vector store, LangChain/LlamaIndex.</div></div>
    <section class="article-section"><h2>Готовый лабораторный комплект</h2><p>В репозитории есть генератор синтетических данных, mock HTTP-сервиса, SQLite-пример идемпотентной загрузки и DDL для переноса в PostgreSQL. Это рабочая стартовая точка. Слои, BI, API и модели вы развиваете по заданиям курса.</p>${list(['Откройте терминал в data-ai/lab и выполните python generate_data.py.', 'Проверьте локальный ETL: python pipeline.py --db training.sqlite. Повторите и сравните итог.', 'Запустите источник: python mock_onec.py --port 8011. Он имитирует custom feed, а не стандартный OData.', 'Читайте lab/README.md: там есть команды, контрольные суммы, ошибки и границы примера.'],'ol','steps')}<div class="toolbar"><a class="button primary" href="lab/README.md">Инструкция лаборатории ↗</a><a class="button secondary" href="lab/schema_postgres.sql" download>DDL PostgreSQL</a></div></section>
    <section class="article-section"><h2>Что собрать к защите</h2>${list(C.modules.map((m,i)=>`${String(i+1).padStart(2,'0')}. ${m.title}: ${m.evidence}.`))}</section>
    <section class="article-section"><h2>Как проверять готовность</h2>${list(['Запуск из чистой среды по README и зафиксированным версиям.', 'Суммы совпадают после первой загрузки, повтора, возврата, исправления и восстановления.', 'Чужая организация недоступна в API, jobs, BI и RAG.', 'Baseline и модели оцениваются на честном holdout с известной доступностью признаков.', 'RAG показывает проверенные источники, отказывается без данных и удаляет старые документы.', 'Каждое непроверенное свойство реальной 1С, АТК или серверного BI отмечено явно.'],'ul','checklist')}</section>
    <section class="article-section"><h2>Если база знаний пока слабее</h2><p>Сначала доведите до результата Python → SQL → DWH → 1С-контракт → ETL → API → один BI. Для AI сохраните отдельные лабораторные, не подключая непроверенные модели к бизнес-решениям. Используйте задания как продолжение после дедлайна. На интенсиве не пытайтесь одновременно вводить все альтернативы в основную архитектуру.</p></section><div class="toolbar"><a class="button primary" href="#/lesson/final-defense">Сценарий итоговой защиты →</a></div></article>`;
  }
  function resourcesPage() {
    $('breadcrumbs').innerHTML='<a href="#/">Программа</a> / Справочник';
    const terms = [
      ['Зерно','Что означает одна строка набора. Все JOIN и агрегаты должны сохранять или явно менять его.'],
      ['Watermark / checkpoint','Устойчивый указатель уже применённых изменений. Продвигается после успешного commit.'],
      ['SCD2','Хранение версий измерения с непересекающимися интервалами действия.'],
      ['Идемпотентность','Повтор одной операции не меняет бизнес-результат второй раз.'],
      ['CDC','Передача изменений, включая исправления и удаления, с определёнными гарантиями.'],
      ['Data lineage','Связь результата с источниками, пакетами и правилами преобразования.'],
      ['Leakage','Информация, которой не должно быть в обучении или признаках в момент решения.'],
      ['Baseline','Простой контрольный способ, который сложная модель должна обоснованно улучшить.'],
      ['Embedding','Векторное представление, привязанное к конкретной модели и её версии.'],
      ['RAG','Поиск источников перед генерацией ответа по найденному контексту.'],
      ['RPO / RTO','Допустимая потеря данных по времени / допустимое время восстановления.'],
      ['АТК','Неизвестное обозначение из требований. Нужны точное название, релиз, владелец и метаданные.']
    ];
    $('main').innerHTML=pageHeader('ОПОРА ДЛЯ ПРАКТИКИ','Справочник, документы и прогресс','Возвращайтесь к определениям и официальным руководствам. Сохраняйте резервную копию заметок перед сменой браузера.')+`<article class="article"><section class="backup-block"><h2>Резервная копия обучения</h2><p>Копия содержит отметки, заметки и настройки дат этого курса. Импорт объединяет отметки и заменяет только совпавшие заметки данными файла. Excel ведётся отдельно.</p><div class="toolbar"><button class="button primary" id="export-progress">Экспорт JSON</button></div><label for="import-progress">Восстановить из JSON (до 2 МБ)</label><br><input class="file-input" type="file" id="import-progress" accept=".json,application/json"><p id="backup-status" aria-live="polite">${esc(storageWarning)}</p></section><section class="article-section"><h2>Краткие определения</h2><div class="resource-grid">${terms.map(([t,b])=>`<div class="resource-card"><h2>${esc(t)}</h2><p>${esc(b)}</p></div>`).join('')}</div></section><section class="article-section"><h2>Официальные руководства</h2><p>Примеры ориентированы на указанные в уроках линии API. При установке фиксируйте конкретные версии и сверяйте совместимость. Сайт курса не загружает ваши данные и не выполняет Python-код в браузере.</p>${sourceList(Object.keys(C.sources))}</section><section class="article-section"><h2>Шаблон evidence.md</h2><div class="codebox"><pre><code>Требование:
Артефакт / версия:
Команда воспроизведения:
Входной набор и его версия:
Ожидаемый результат:
Фактическое наблюдение:
Проверенные ошибки и отказы:
Ограничения и непроверенное:
Следующий шаг:</code></pre></div></section></article>`;
    $('export-progress').addEventListener('click',()=>{
      const blob=new Blob([JSON.stringify({course:'data-ai-v1',...state},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='data-ai-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      $('backup-status').textContent='Резервная копия подготовлена для скачивания.';
    });
    $('import-progress').addEventListener('change',async e=>{
      try {
        const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024)throw new Error('Файл больше 2 МБ.');
        const raw=JSON.parse(await file.text());if(raw.course!=='data-ai-v1')throw new Error('Это не резервная копия данного курса.');
        const incoming=cleanState(raw);
        state={...incoming,notes:{...state.notes,...incoming.notes},gates:{...state.gates,...incoming.gates},lessonStatus:{...state.lessonStatus,...incoming.lessonStatus},completed:[...new Set([...state.completed,...incoming.completed])]};
        state.completed.forEach(id=>{state.lessonStatus[id]='Готово';});
        $('backup-status').textContent=save()?'Копия импортирована. Отметки объединены, заметки восстановлены.':storageWarning;nav('resources');
      } catch(error) {$('backup-status').textContent='Не удалось импортировать: '+error.message;}
    });
  }
  function notFound() {$('breadcrumbs').textContent='Страница не найдена';$('main').innerHTML=pageHeader('404','Страница не найдена','Проверьте адрес или вернитесь к программе.')+'<div class="content-narrow"><a class="button primary" href="#/">К программе →</a></div>';}
  function route() {
    const parts=(location.hash||'#/').split('/'), kind=parts[1]||'', id=parts[2]||'';
    const active=kind==='module'?id:kind==='lesson'?lessons.get(id)?.module:kind||'home';nav(active);
    if(!kind)home();else if(kind==='module')modulePage(id);else if(kind==='lesson')lessonPage(id);else if(kind==='schedule')schedulePage();else if(kind==='project')projectPage();else if(kind==='resources')resourcesPage();else notFound();
    document.title=(kind==='lesson'&&lessons.has(id)?lessons.get(id).title:kind==='module'&&modules.has(id)?modules.get(id).title:'Python, BI, AI и 1С')+' — практический курс';
    $('sidebar').classList.remove('open');$('menu-button').setAttribute('aria-expanded','false');$('main').focus({preventScroll:true});window.scrollTo(0,0);
  }
  $('menu-button').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu-button').setAttribute('aria-expanded',String(open));});
  window.addEventListener('hashchange',route);route();
}());
