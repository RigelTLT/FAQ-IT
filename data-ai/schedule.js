(function () {
  'use strict';
  const C = window.DataCourse;
  C.buildSchedule = function (settings = {}) {
    const start = settings.start || C.start;
    const weekday = Number(settings.weekdayHours ?? C.weekdayHours);
    const weekend = Number(settings.weekendHours ?? C.weekendHours);
    const base = new Date(start + 'T12:00:00Z');
    if (!Number.isFinite(base.getTime()) || base.toISOString().slice(0,10) !== start || !Number.isFinite(weekday) || !Number.isFinite(weekend) || weekday < 0 || weekend < 0 || weekday > 16 || weekend > 16) throw new Error('Проверьте дату и часы (0–16).');
    return C.modules.flatMap((module, index) => {
      const own = C.lessons.filter(l => l.module === module.id);
      return [...own, null].map((lesson, offset) => {
        const day = index * 5 + offset + 1;
        const date = new Date(base); date.setUTCDate(base.getUTCDate() + day - 1);
        const dayOfWeek = date.getUTCDay();
        const hours = dayOfWeek === 0 || dayOfWeek === 6 ? weekend : weekday;
        const theory = Math.round(hours * .25 * 10) / 10;
        const practice = Math.round(hours * .55 * 10) / 10;
        return {day, date: date.toISOString().slice(0,10), module:module.id, lesson:lesson?.id || null,
          title: lesson ? lesson.title : 'Практикум и проверка этапа: ' + module.title,
          hours, theory, practice, review:Math.round((hours-theory-practice)*10)/10,
          task: lesson ? lesson.practice.join(' ') : module.gate,
          result: lesson ? lesson.result : module.evidence,
          criteria: lesson ? lesson.criteria.join(' ') : module.gate};
      });
    });
  };
}());
