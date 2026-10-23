const $ = id => document.getElementById(id);
const safe = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const trackMap = new Map(tracks.map(track => [track.id, track]));
const lessonMap = new Map(lessons.map(lesson => [lesson.id, lesson]));
const progressKey = 'teamlead-course-progress-v1';
const notesKey = 'teamlead-course-notes-v1';
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
let completed = new Set(read(progressKey, []).filter(id => lessonMap.has(id)));
let notes = read(notesKey, {});
function saveProgress() { localStorage.setItem(progressKey, JSON.stringify([...completed])); }
function saveNotes() { localStorage.setItem(notesKey, JSON.stringify(notes)); }
function word(n, forms) { return forms[n % 100 > 10 && n % 100 < 20 ? 2 : [2,0,1,1,1,2,2,2,2,2][n % 10]]; }
function list(items, tag='ul', cls='') { return `<${tag} class="${cls}">${items.map(item => `<li>${safe(item)}</li>`).join('')}</${tag}>`; }
function card(lesson, number) {
  const done = completed.has(lesson.id);
  return `<a class="lesson-card" href="#/lesson/${lesson.id}"><span class="lesson-num">${String(number).padStart(2,'0')}</span><span class="lesson-card-copy"><strong>${safe(lesson.title)}</strong><small>${safe(lesson.summary)}</small></span><span class="lesson-done ${done ? 'done' : ''}" aria-label="${done ? 'Урок отмечен как пройденный' : 'Урок ещё не пройден'}">${done ? '✓' : '↗'}</span></a>`;
}
function nav(active) {
  $('track-nav').innerHTML = tracks.map((track,index) => {
    const own = lessons.filter(lesson => lesson.track === track.id);
    const done = own.filter(lesson => completed.has(lesson.id)).length;
    return `<a class="side-link ${active === track.id ? 'active' : ''}" href="#/track/${track.id}"><span class="nav-index">${String(index+1).padStart(2,'0')}</span><span>${safe(track.title)}</span><small>${done}/${own.length}</small></a>`;
  }).join('');
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === active));
}
function renderHome() {
  const next = lessons.find(lesson => !completed.has(lesson.id)) || lessons[0];
  const percent = Math.round(completed.size / lessons.length * 100);
  $('breadcrumbs').textContent = 'Главная / Маршрут тимлида';
  $('main').innerHTML = `<section class="hero"><div class="eyebrow">ПРАКТИЧЕСКИЙ КУРС · ${tracks.length} НАПРАВЛЕНИЙ · ${lessons.length} УРОКОВ</div><h1>Вести команду.<br><em>Доставлять результат.</em></h1><p>От первых 90 дней в роли до развития людей, инженерного качества, устойчивой поставки и сложных решений. Читайте по порядку, выполняйте задания на одном рабочем кейсе и соберите итоговое портфолио тимлида.</p><div class="hero-actions"><a class="button primary" href="#/lesson/${next.id}">${completed.size ? 'Продолжить обучение' : 'Начать с первого урока'} <span>↗</span></a><a class="button secondary" href="#/final">Посмотреть итоговую работу</a></div><div class="hero-art" aria-hidden="true"><span>ЛЮДИ</span><span>ПРОДУКТ</span><span>СИСТЕМА</span><b>TL</b></div></section>
  <section class="progress"><div><span class="kicker">ВАШ ПРОГРЕСС</span><strong>${completed.size}<small> / ${lessons.length}</small></strong><p>${word(completed.size,['урок отмечен','урока отмечены','уроков отмечено'])} как пройденные</p></div><div class="progress-side"><b>${percent}% маршрута</b><div class="bar"><span style="width:${percent}%"></span></div><small>Отмечайте урок после выполнения практического задания. Прогресс хранится в этом браузере.</small></div></section>
  <section class="section"><div class="section-heading"><div><span class="kicker">ПРОГРАММА</span><h2>Все направления</h2></div><p>Каждое направление заканчивается рабочим артефактом. Итоговая работа объединяет их в план для одной команды.</p></div><div class="track-grid">${tracks.map((track,index) => {const own=lessons.filter(lesson=>lesson.track===track.id);const done=own.filter(lesson=>completed.has(lesson.id)).length;return `<a class="track-card" href="#/track/${track.id}"><span class="track-card-top">${String(index+1).padStart(2,'0')} / ${String(tracks.length).padStart(2,'0')} <span>↗</span></span><strong>${safe(track.title)}</strong><p>${safe(track.subtitle)}</p><span class="track-card-bottom">${done}/${own.length} урока · ${safe(track.outcome)}</span></a>`;}).join('')}</div></section>
  <section class="section"><div class="section-heading"><div><span class="kicker">ПОСЛЕ ИЗУЧЕНИЯ</span><h2>Что вы сможете делать</h2></div></div><div class="outcomes"><div><b>01</b><strong>Вести людей</strong><p>Проводить личные встречи, давать обратную связь, развивать специалистов, нанимать и адаптировать.</p></div><div><b>02</b><strong>Доставлять результат</strong><p>Согласовывать приоритеты, планировать реалистично, управлять зависимостями и сообщать о рисках заранее.</p></div><div><b>03</b><strong>Удерживать качество</strong><p>Выстраивать инженерные правила, эксплуатацию, реакцию на инциденты и цикл улучшений.</p></div></div></section>`;
}
function renderTrack(id) {
  const track = trackMap.get(id); if (!track) return notFound();
  const own = lessons.filter(lesson => lesson.track === id);
  const index = tracks.indexOf(track);
  $('breadcrumbs').innerHTML = `<a href="#/">Главная</a> / ${safe(track.title)}`;
  $('main').innerHTML = `<section class="page-header"><span class="kicker">НАПРАВЛЕНИЕ ${String(index+1).padStart(2,'0')} / ${tracks.length}</span><h1>${safe(track.title)}</h1><p>${safe(track.subtitle)}. После изучения вы подготовите: ${safe(track.outcome.toLowerCase())}.</p></section><div class="content-narrow"><div class="callout"><strong>Как проходить направление</strong><p>Прочитайте урок, примените алгоритм к своему проекту или к учебному кейсу и сохраните результат. Отмечайте завершение только после проверки критериев готовности.</p></div><div class="lesson-list">${own.map(lesson => card(lesson, lessons.indexOf(lesson)+1)).join('')}</div><div class="pager">${tracks[index-1] ? `<a href="#/track/${tracks[index-1].id}">← ${safe(tracks[index-1].title)}</a>` : '<span></span>'}${tracks[index+1] ? `<a href="#/track/${tracks[index+1].id}">${safe(tracks[index+1].title)} →</a>` : '<a href="#/final">Итоговая работа →</a>'}</div></div>`;
}
function renderLesson(id) {
  const lesson = lessonMap.get(id); if (!lesson) return notFound();
  const track = trackMap.get(lesson.track);
  const index = lessons.indexOf(lesson);
  const previous = lessons[index-1], next = lessons[index+1];
  $('breadcrumbs').innerHTML = `<a href="#/">Главная</a> / <a href="#/track/${track.id}">${safe(track.title)}</a> / ${safe(lesson.title)}`;
  $('main').innerHTML = `<section class="page-header lesson-header"><span class="kicker">УРОК ${String(index+1).padStart(2,'0')} / ${lessons.length} · ${safe(track.title).toUpperCase()}</span><h1>${safe(lesson.title)}</h1><p>${safe(lesson.summary)}</p><div class="lesson-meta">Ориентир: 25–40 минут чтения и работы · Результат: применённый артефакт</div></section>
  <article class="article"><div class="callout"><strong>Как работать с уроком</strong><p>Читайте объяснение и пример, затем выполните задание на своём проекте или на кейсе из итоговой работы. Сверьте результат с критериями готовности. Сохраните черновик ниже — он останется в этом браузере.</p></div>
  <section class="article-section"><span class="section-number">01 / СУТЬ</span><h2>Почему это важно</h2><p>${safe(lesson.explanation)}</p></section>
  <section class="article-section"><span class="section-number">02 / АЛГОРИТМ</span><h2>Как действовать</h2>${list(lesson.steps,'ol','steps')}</section>
  <section class="article-section example"><span class="section-number">03 / РАБОЧИЙ ПРИМЕР</span><h2>Как это выглядит на практике</h2><p>${safe(lesson.example)}</p></section>
  <section class="article-section practice"><span class="section-number">04 / ПРАКТИКА</span><h2>Сделайте сами</h2><p>${safe(lesson.practice)}</p><label for="lesson-note">Ваш черновик или ссылка на рабочий документ</label><textarea id="lesson-note" rows="7" placeholder="Запишите выводы, решение или план действий...">${safe(notes[id] || '')}</textarea><small id="save-status" aria-live="polite">Черновик сохраняется автоматически в этом браузере.</small></section>
  <section class="article-section"><span class="section-number">05 / КРИТЕРИИ ГОТОВНОСТИ</span><h2>Проверьте результат</h2>${list(lesson.criteria,'ul','checklist')}</section>
  <section class="article-section"><span class="section-number">06 / ТИПИЧНЫЕ ОШИБКИ</span><h2>Чего избегать</h2>${list(lesson.pitfalls,'ul','pitfalls')}</section>
  <section class="article-section"><span class="section-number">07 / САМОПРОВЕРКА</span><h2>Ответьте своими словами</h2>${list(lesson.questions,'ol','questions')}</section>
  <section class="article-section completion"><span class="section-number">08 / РЕЗУЛЬТАТ</span><h2>Готовы идти дальше?</h2><p>Сверьте практическую работу с критериями выше. Отметка отражает вашу самооценку и всегда может быть снята.</p><button class="button primary complete-button ${completed.has(id)?'is-complete':''}" id="complete-button" type="button" aria-pressed="${completed.has(id)}">${completed.has(id)?'✓ Урок пройден':'Отметить урок как пройденный'}</button></section>
  <nav class="pager" aria-label="Соседние уроки">${previous?`<a href="#/lesson/${previous.id}">← ${safe(previous.title)}</a>`:'<span></span>'}${next?`<a href="#/lesson/${next.id}">${safe(next.title)} →</a>`:'<a href="#/final">Итоговая работа →</a>'}</nav></article>`;
  $('complete-button').addEventListener('click', () => { if (completed.has(id)) completed.delete(id); else completed.add(id); saveProgress(); nav(lesson.track); renderLesson(id); });
  let timer;
  $('lesson-note').addEventListener('input', event => { const value=event.target.value; $('save-status').textContent='Сохранение…'; clearTimeout(timer); timer=setTimeout(() => { notes[id]=value; try { saveNotes(); $('save-status').textContent='Сохранено в этом браузере.'; } catch { $('save-status').textContent='Не удалось сохранить. Скопируйте текст в свой документ.'; } },350); });
}
function renderResources() {
  $('breadcrumbs').innerHTML = '<a href="#/">Главная</a> / Шаблоны и инструменты';
  $('main').innerHTML = `<section class="page-header"><span class="kicker">РАБОЧИЕ ИНСТРУМЕНТЫ</span><h1>Шаблоны для практики</h1><p>Используйте структуры ниже как основу собственных документов. Сохраняйте конкретные факты, владельцев и даты: пустой шаблон сам по себе не меняет работу команды.</p></section><div class="content-narrow resource-grid">${resources.map((resource,index)=>`<section class="resource-card"><span class="section-number">${String(index+1).padStart(2,'0')} / ШАБЛОН</span><h2>${safe(resource.title)}</h2><p>${safe(resource.body)}</p></section>`).join('')}</div>`;
}
function renderFinal() {
  $('breadcrumbs').innerHTML = '<a href="#/">Главная</a> / Итоговая работа';
  $('main').innerHTML = `<section class="page-header"><span class="kicker">ИТОГОВЫЙ ПРОЕКТ</span><h1>План тимлида на 90 дней</h1><p>Соберите решения всех направлений в единый рабочий план. Цель — показать, как вы руководите командой в реальных ограничениях, а не пересказать термины.</p></section><article class="article"><div class="callout"><strong>Учебный кейс</strong><p>Вы стали тимлидом команды из шести инженеров, которая развивает сервис оформления заказов. Поставки запаздывают, релизы зависят от одного опытного человека, за месяц случились два сбоя оплаты. Продакт просит новую интеграцию за восемь недель. Поддержка сообщает о росте обращений, один инженер перегружен дежурствами, другой хочет развиваться до ведущего. У вас нет права единолично утверждать штат и бюджет.</p></div>
  <section class="article-section"><span class="section-number">01 / ДИАГНОСТИКА</span><h2>Разберитесь в ситуации</h2><p>Отделите факты кейса от предположений. Составьте список вопросов для команды, продакта, поддержки и руководителя. Покажите путь задачи и релиза, точки ожидания и критичные зависимости от людей. Опишите полномочия, которые нужно уточнить.</p></section>
  <section class="article-section"><span class="section-number">02 / ЦЕЛИ</span><h2>Выберите измеримые результаты</h2><p>Сформулируйте не более трёх результатов на 90 дней: например, устойчивый релиз, снижение ущерба от сбоев оплаты и проверка интеграции. Для каждого определите пользовательский или рабочий показатель, исходный уровень, если он известен, и способ получить недостающие данные.</p></section>
  <section class="article-section"><span class="section-number">03 / ПЛАН ПОСТАВКИ</span><h2>Сделайте выполнимое обещание</h2><p>Разбейте интеграцию на проверяемые срезы, выделите неизвестное для раннего эксперимента, зависимости и резерв. Покажите диапазон срока и два варианта при задержке. Явно запланируйте поддержку, инциденты и обучение, чтобы не расходовать одну и ту же мощность дважды.</p></section>
  <section class="article-section"><span class="section-number">04 / ЛЮДИ</span><h2>Распределите ответственность</h2><p>Подготовьте ритм личных встреч, план снижения перегрузки дежурного, задачу развития для будущего ведущего и передачу знаний о релизе минимум двум людям. Укажите, какие решения вы делегируете и где будет контрольная точка.</p></section>
  <section class="article-section"><span class="section-number">05 / НАДЁЖНОСТЬ</span><h2>Подготовьте реакцию на следующий сбой</h2><p>Опишите показатель качества оплаты, полезную тревогу, первые действия дежурного, координатора инцидента и канал обновлений. Для двух прошлых сбоев предложите разбор без обвинений и 1–3 проверяемых улучшения.</p></section>
  <section class="article-section"><span class="section-number">06 / КОММУНИКАЦИЯ</span><h2>Согласуйте ожидания</h2><p>Создайте карту заинтересованных сторон. Напишите короткое сообщение продакту и руководителю с вариантами поставки, последствиями и решениями, которые требуются от них. Опишите, когда будете пересматривать прогноз и сообщать о рисках.</p></section>
  <section class="article-section"><span class="section-number">07 / УЛУЧШЕНИЕ</span><h2>Проверьте эффекты</h2><p>Выберите пять сбалансированных сигналов: результат продукта, время поставки, качество релиза, надёжность и нагрузку. Для каждого укажите источник, период, возможное искажение и решение, которое может измениться по итогам измерения.</p></section>
  <section class="article-section"><span class="section-number">08 / ЗАЩИТА</span><h2>Проверьте план вопросами</h2>${list(['Что вы сделаете в первые 48 часов и почему именно это?','Что отмените или перенесёте, если интеграция окажется сложнее ожидаемого?','Кто принимает каждое ключевое решение и что команда решает без вас?','Какой сигнал покажет, что скорость выросла ценой надёжности или здоровья людей?','Что будет работать, если вы уйдёте в отпуск на две недели?'],'ol','questions')}</section>
  <section class="article-section completion"><span class="section-number">КРИТЕРИИ ИТОГА</span><h2>Когда работа готова</h2>${list(['План связан с проблемами пользователей и ограничениями команды.','В нём есть конкретные владельцы, контрольные даты и условия пересмотра.','Приоритеты помещаются в реальную мощность с резервом.','Показана цена решений для качества, людей и срока.','Улучшения можно проверить, а ключевые решения не зависят только от тимлида.'],'ul','checklist')}<p>Соберите документы в одну папку или страницу. Попросите опытного тимлида, продакта или руководителя сыграть роль заинтересованной стороны и оспорить план. После обратной связи обновите его.</p></section></article>`;
}
function notFound() { $('breadcrumbs').textContent='Страница не найдена'; $('main').innerHTML='<section class="page-header"><h1>Страница не найдена</h1><p>Проверьте адрес урока или вернитесь к программе.</p><a class="button primary" href="#/">К программе →</a></section>'; }
function route() {
  const [,kind,id] = (location.hash || '#/').split('/');
  const active = kind === 'track' ? id : kind === 'lesson' && lessonMap.has(id) ? lessonMap.get(id).track : kind || 'home';
  nav(active);
  if (!kind) renderHome(); else if (kind==='track') renderTrack(id); else if (kind==='lesson') renderLesson(id); else if (kind==='resources') renderResources(); else if (kind==='final') renderFinal(); else notFound();
  const title = kind==='lesson' && lessonMap.has(id) ? lessonMap.get(id).title : kind==='track' && trackMap.has(id) ? trackMap.get(id).title : kind==='final' ? 'Итоговая работа' : kind==='resources' ? 'Шаблоны и инструменты' : 'Практический курс';
  document.title=`${title} — Тимлид`;
  $('sidebar').classList.remove('open'); $('menu-button').setAttribute('aria-expanded','false'); window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
$('menu-button').addEventListener('click', () => { const open=$('sidebar').classList.toggle('open'); $('menu-button').setAttribute('aria-expanded',String(open)); });
route();
