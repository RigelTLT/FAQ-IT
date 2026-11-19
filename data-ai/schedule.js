(function () {
  'use strict';
  const C = window.DataCourse;
  C.mainLessons = C.lessons.filter(lesson => !lesson.companionFor);
  C.companions = lessonId => C.lessons.filter(lesson => lesson.companionFor === lessonId);
  C.buildSchedule = function (settings = {}) {
    const start = settings.start || C.start;
    const weekday = Number(settings.weekdayHours ?? C.weekdayHours);
    const weekend = Number(settings.weekendHours ?? C.weekendHours);
    const base = new Date(start + 'T12:00:00Z');
    if (!Number.isFinite(base.getTime()) || base.toISOString().slice(0,10) !== start || !Number.isFinite(weekday) || !Number.isFinite(weekend) || weekday < 0 || weekend < 0 || weekday > 16 || weekend > 16) throw new Error('Проверьте дату и часы (0–16).');
    return C.modules.flatMap((module, index) => {
      const own = C.mainLessons.filter(l => l.module === module.id);
      const stage = C.guideModules[module.id];
      return [...own, null].map((lesson, offset) => {
        const guide = lesson && C.guide[lesson.id];
        const day = index * 5 + offset + 1;
        const date = new Date(base); date.setUTCDate(base.getUTCDate() + day - 1);
        const dayOfWeek = date.getUTCDay();
        const hours = dayOfWeek === 0 || dayOfWeek === 6 ? weekend : weekday;
        const theory = Math.round(hours * .25 * 10) / 10;
        const practice = Math.round(hours * .55 * 10) / 10;
        return {day, date: date.toISOString().slice(0,10), module:module.id, lesson:lesson?.id || null,
          extension: Boolean(module.extension), companions: lesson ? C.companions(lesson.id).map(item => item.id) : [],
          title: lesson ? guide.title : 'Практикум. ' + stage.title,
          hours, theory, practice, review:Math.round((hours-theory-practice)*10)/10,
          task: lesson ? guide.task : stage.practice.join(' '),
          result: lesson ? guide.trace : stage.milestone,
          criteria: lesson ? guide.answer : stage.check};
      });
    });
  };
}());
