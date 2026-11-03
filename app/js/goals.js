// SEEDSED — goals.js
// Purpose: the three monthly goals, tracked week by week. Weeks are the 7-day blocks of the month
//          (days 1-7 are week 1). Weekly goals are reached after enough weeks are met, so a week
//          of trying still shows as effort.
// Input:  a goal { type, target, weeks?, text?, checks?, reachedOn? }, the day log, month "YYYY-MM", today.
// Output: { title, weeks: [{ label, value, met }], value, target, reached }.
// Boundaries: pure. Reports only what the log recorded. Stamping dates and certificates is store.js.

export const GOAL_TYPES = {
  days: { label: "Practise a number of days each week", unit: "days a week", weekly: true, title: t => `Practise ${t} days a week` },
  minutes: { label: "Practise a number of minutes each week", unit: "minutes a week", weekly: true, title: t => `Practise ${t} minutes a week` },
  words: { label: "Own new words this month", unit: "words", title: t => `Own ${t} new words` },
  sentences: { label: "Write my own sentences this month", unit: "sentences", title: t => `Write ${t} of my own sentences` },
  activities: { label: "Finish games and readings this month", unit: "activities", title: t => `Finish ${t} games and readings` },
  custom: { label: "Something else (helper checks it off)", unit: "", weekly: true, title: (_, text) => text || "My goal" }
};

export const ACTIVITY_FIELDS = ["puzzles", "typos", "gaps", "threads", "stories", "readings"];
export const WEEKS_TO_REACH = 3;

export const weekOfDay = day => Math.floor((day - 1) / 7);

export function evaluateGoal(goal, log, month, today) {
  const type = GOAL_TYPES[goal.type];
  const days = Object.keys(log).filter(d => d.startsWith(month + "-")).sort();
  const lastDay = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate();
  const weekCount = weekOfDay(lastDay) + 1;
  const empty = () => Array.from({ length: weekCount }, (_, i) => ({ label: `Week ${i + 1}`, value: 0, met: false }));
  const weeks = empty();

  const dayValue = (rec) => {
    if (goal.type === "days") return (rec.activeMs || 0) > 0 ? 1 : 0;
    if (goal.type === "minutes") return (rec.activeMs || 0) / 60000;
    if (goal.type === "words") return (rec.wordsOwned || []).length;
    if (goal.type === "sentences") return rec.sentences || 0;
    if (goal.type === "activities") return ACTIVITY_FIELDS.reduce((a, f) => a + (rec[f] || 0), 0);
    return 0;
  };
  for (const d of days) weeks[weekOfDay(+d.slice(8, 10))].value += dayValue(log[d]);
  for (const w of weeks) w.value = Math.floor(w.value);

  if (goal.type === "custom") {
    (goal.checks || []).forEach(i => { if (weeks[i]) { weeks[i].value = 1; weeks[i].met = true; } });
  } else if (type.weekly) {
    for (const w of weeks) w.met = w.value >= goal.target;
  }

  const total = weeks.reduce((a, w) => a + w.value, 0);
  const metWeeks = weeks.filter(w => w.met).length;
  const value = type.weekly ? metWeeks : total;
  const target = type.weekly ? WEEKS_TO_REACH : goal.target;
  return { title: type.title(goal.target, goal.text), weekly: !!type.weekly, weeks, value, target, total, reached: value >= target, thisWeek: weekOfDay(+today.slice(8, 10)) };
}
