import { DURATION, getQuestionStatus, shuffle } from './study.js';

export const SESSION_BANK_VERSION = 'morfo300-v1';
const MAX_TIME = 8_640_000_000_000_000;
const MAX_COUNT = 1_000_000;
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const timestamp = value => Number.isFinite(value) && value >= 0 && value <= MAX_TIME;
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const goalValue = value => integer(value, 5, 100) ? value : 20;
const nonnegative = value => integer(value, 0, MAX_COUNT) ? value : 0;
const uniqueQuestions = questions => [...new Map((Array.isArray(questions) ? questions : []).filter(q => q && typeof q.id === 'string').map(q => [q.id, q])).values()];

function localDay(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1970 || year > 2200) return false;
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
function cleanActivity(value) {
  return Object.fromEntries(Object.entries(plain(value) ? value : {}).filter(([day, count]) => isDay(day) && integer(count, 0, MAX_COUNT)));
}

/** Fixed-priority review: overdue, mistakes, unseen questions, then known questions. */
export function getStudyPlan(questions, progress, count = 20, now = Date.now(), random = Math.random) {
  const unique = uniqueQuestions(questions);
  const buckets = { due: [], learning: [], new: [], learned: [] };
  const topics = new Map();
  for (const q of unique) {
    buckets[getQuestionStatus(progress, q.id, now)].push(q);
    if (!topics.has(q.topic)) topics.set(q.topic, { topic: q.topic, attempts: 0, correct: 0, seen: 0, total: 0 });
    const topic = topics.get(q.topic), record = progress?.[q.id];
    const attempts = nonnegative(record?.attempts);
    topic.total++;
    topic.attempts += attempts;
    topic.correct += Math.min(attempts, nonnegative(record?.correct));
    if (attempts) topic.seen++;
  }
  buckets.due.sort((a, b) => Number(progress?.[a.id]?.nextReview || 0) - Number(progress?.[b.id]?.nextReview || 0));
  const requested = Math.max(0, Math.min(unique.length, Math.trunc(Number(count) || 0)));
  const weakTopics = [...topics.values()].filter(topic => topic.attempts >= 3).map(topic => ({ ...topic, accuracy: Math.round(topic.correct / topic.attempts * 100) })).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.topic.localeCompare(b.topic, 'es'));
  return {
    questions: [...buckets.due, ...shuffle(buckets.learning, random), ...shuffle(buckets.new, random), ...shuffle(buckets.learned, random)].slice(0, requested),
    dueCount: buckets.due.length,
    errorCount: buckets.learning.length,
    unseenCount: buckets.new.length,
    weakTopics,
    focusTopic: weakTopics[0]?.topic || null,
  };
}

/** Counts actual answer events; it does not infer activity from aggregate progress. */
export function recordActivity(activity, now = Date.now()) {
  const today = localDay(now);
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - 89);
  const oldest = localDay(threshold);
  const result = Object.fromEntries(Object.entries(cleanActivity(activity)).filter(([day]) => day >= oldest && day <= today));
  result[today] = Math.min(MAX_COUNT, (result[today] || 0) + 1);
  return result;
}

export function getActivitySummary(activity, goal = 20, now = Date.now()) {
  const valid = cleanActivity(activity), target = goalValue(goal), today = localDay(now);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    const key = localDay(date);
    return { date: key, label: WEEKDAYS[date.getDay()], count: valid[key] || 0, isToday: key === today };
  });
  const todayCount = valid[today] || 0;
  return { todayCount, goal: target, goalPercent: Math.min(100, Math.round(todayCount / target * 100)), weekTotal: last7Days.reduce((sum, day) => sum + day.count, 0), activeDays: last7Days.filter(day => day.count > 0).length, last7Days };
}

function sessionAnswers(value, ids, byId) {
  if (!Array.isArray(value) || value.length > ids.length) return null;
  const result = [];
  for (let i = 0; i < value.length; i++) {
    const answer = value[i], q = byId.get(ids[i]);
    if (!plain(answer) || answer.id !== ids[i] || typeof answer.timeout !== 'boolean') return null;
    if (answer.timeout ? answer.selected !== null : !integer(answer.selected, 0, q.options.length - 1)) return null;
    result.push({ id: answer.id, selected: answer.selected, timeout: answer.timeout, correct: !answer.timeout && answer.selected === q.correctIndex });
  }
  return result;
}

/** Completed sessions are not resumable. Saved clocks never run while the page is closed. */
export function createSessionSnapshot(session, now = Date.now()) {
  if (!plain(session) || !validId(session.id) || !Array.isArray(session.ids) || !session.ids.length || !Array.isArray(session.answers) || !integer(session.index, 0, session.ids.length - 1) || !['practice', 'exam'].includes(session.mode) || !timestamp(session.startedAt)) return null;
  const answered = Array.isArray(session.answers) && session.answers.some(answer => answer.id === session.ids[session.index]);
  const timeLeft = session.paused || session.imagePending || answered ? session.timeLeft : Math.max(0, session.deadline - now);
  if (!Number.isFinite(timeLeft)) return null;
  return {
    version: 1,
    bankVersion: SESSION_BANK_VERSION,
    id: session.id,
    ids: [...session.ids],
    index: session.index,
    answers: (session.answers || []).map(answer => ({ id: answer.id, selected: answer.selected, timeout: answer.timeout, correct: answer.correct })),
    mode: session.mode,
    startedAt: session.startedAt,
    timeLeft: Math.max(0, Math.min(DURATION * 1000, timeLeft)),
    selected: answered ? session.answers.find(answer => answer.id === session.ids[session.index]).selected : session.selected ?? null,
    progressApplied: !!session.progressApplied,
  };
}

export function sanitizeSavedSession(value, questions, now = Date.now()) {
  if (!plain(value) || value.version !== 1 || value.bankVersion !== SESSION_BANK_VERSION || !validId(value.id)) return null;
  const byId = new Map(uniqueQuestions(questions).map(q => [q.id, q]));
  if (!Array.isArray(value.ids) || !value.ids.length || value.ids.length > byId.size || new Set(value.ids).size !== value.ids.length || value.ids.some(id => !byId.has(id))) return null;
  if (!integer(value.index, 0, value.ids.length - 1) || !['practice', 'exam'].includes(value.mode) || !timestamp(value.startedAt)) return null;
  if (!Number.isFinite(value.timeLeft) || value.timeLeft < 0 || value.timeLeft > DURATION * 1000 || value.progressApplied !== false) return null;
  const answers = sessionAnswers(value.answers, value.ids, byId);
  if (!answers || ![value.index, value.index + 1].includes(answers.length)) return null;
  if (value.selected !== null && !integer(value.selected, 0, byId.get(value.ids[value.index]).options.length - 1)) return null;
  const currentAnswer = answers[value.index];
  return {
    id: value.id,
    ids: [...value.ids],
    index: value.index,
    answers,
    mode: value.mode,
    startedAt: value.startedAt,
    timeLeft: value.timeLeft,
    selected: currentAnswer ? currentAnswer.selected : value.selected,
    paused: true,
    deadline: now + value.timeLeft,
    imagePending: !!byId.get(value.ids[value.index]).image && !currentAnswer,
    progressApplied: false,
  };
}

function historyRecord(value, allowedTopics) {
  if (!plain(value) || !validId(value.id) || !timestamp(value.completedAt) || !integer(value.questionCount, 1, 400) || !integer(value.correct, 0, value.questionCount) || !['practice', 'exam'].includes(value.mode)) return null;
  if (value.accuracy !== Math.round(value.correct / value.questionCount * 100) || !Array.isArray(value.topics) || !value.topics.length || new Set(value.topics).size !== value.topics.length || value.topics.some(topic => typeof topic !== 'string' || !topic.trim() || topic.length > 100 || allowedTopics && !allowedTopics.has(topic))) return null;
  return { id: value.id, completedAt: value.completedAt, questionCount: value.questionCount, correct: value.correct, accuracy: value.accuracy, mode: value.mode, topics: [...value.topics] };
}

export function addSessionHistory(history, session, questions, now = Date.now()) {
  const byId = new Map(uniqueQuestions(questions).map(q => [q.id, q]));
  const topics = new Set([...byId.values()].map(q => q.topic));
  const previous = (Array.isArray(history) ? history : []).map(record => historyRecord(record, topics)).filter(Boolean).sort((a, b) => b.completedAt - a.completedAt).slice(0, 30);
  if (!plain(session) || !validId(session.id) || !Array.isArray(session.ids) || !session.ids.length || new Set(session.ids).size !== session.ids.length || session.ids.some(id => !byId.has(id)) || !Number.isInteger(session.index) || session.index < session.ids.length) return previous;
  const answers = sessionAnswers(session.answers, session.ids, byId);
  if (!answers || answers.length !== session.ids.length || previous.some(record => record.id === session.id) || !['practice', 'exam'].includes(session.mode)) return previous;
  const correct = answers.filter(answer => answer.correct).length;
  const record = { id: session.id, completedAt: now, questionCount: session.ids.length, correct, accuracy: Math.round(correct / session.ids.length * 100), mode: session.mode, topics: [...new Set(session.ids.map(id => byId.get(id).topic))] };
  return [record, ...previous].slice(0, 30);
}

const backupError = detail => new Error(`La copia de progreso no es válida: ${detail}.`);

export function createBackup({ progress = {}, bookmarks = [], activity = {}, goal = 20, history = [] } = {}, now = Date.now()) {
  return JSON.parse(JSON.stringify({ format: 'u-san-esteban-progress', version: 1, exportedAt: now, progress, bookmarks, activity, goal, history }));
}

/** Strict replacement payload: a malformed/foreign record rejects the whole file. */
export function parseBackup(inputObject, questions) {
  let input = inputObject;
  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { throw backupError('el archivo no contiene JSON legible'); }
  }
  if (!plain(input) || input.format !== 'u-san-esteban-progress' || input.version !== 1 || !timestamp(input.exportedAt)) throw backupError('formato o versión incompatibles');
  const known = new Set(uniqueQuestions(questions).map(q => q.id));
  const allowedTopics = new Set(uniqueQuestions(questions).map(q => q.topic));
  if (!plain(input.progress) || Object.keys(input.progress).length > known.size) throw backupError('registro de respuestas incorrecto');
  const progress = {};
  for (const [id, value] of Object.entries(input.progress)) {
    if (!known.has(id) || !plain(value) || !integer(value.attempts, 0, MAX_COUNT) || !integer(value.correct, 0, value.attempts) || typeof value.lastCorrect !== 'boolean' || value.lastCorrect && !value.correct) throw backupError('hay respuestas desconocidas o contadores incorrectos');
    const streak = value.streak === undefined ? 0 : value.streak;
    const lastReviewed = value.lastReviewed === undefined ? 0 : value.lastReviewed;
    if (!integer(streak, 0, value.correct) || !value.lastCorrect && streak !== 0 || !timestamp(lastReviewed) || !timestamp(value.nextReview)) throw backupError('el calendario de repaso contiene datos incorrectos');
    progress[id] = { attempts: value.attempts, correct: value.correct, lastCorrect: value.lastCorrect, streak, lastReviewed, nextReview: value.nextReview };
  }
  if (!Array.isArray(input.bookmarks) || input.bookmarks.length > known.size || new Set(input.bookmarks).size !== input.bookmarks.length || input.bookmarks.some(id => !known.has(id))) throw backupError('la selección de guardadas no coincide con el banco');
  if (!plain(input.activity) || Object.keys(input.activity).length > 3660 || Object.entries(input.activity).some(([day, count]) => !isDay(day) || !integer(count, 0, MAX_COUNT))) throw backupError('el historial diario contiene datos incorrectos');
  if (!integer(input.goal, 5, 100)) throw backupError('la meta diaria debe estar entre 5 y 100 intentos');
  if (!Array.isArray(input.history) || input.history.length > 30 || new Set(input.history.map(value => value?.id)).size !== input.history.length) throw backupError('el historial de sesiones contiene datos incorrectos');
  const history = input.history.map(record => historyRecord(record, allowedTopics));
  if (history.some(record => !record || record.questionCount > known.size)) throw backupError('una sesión del historial no es válida');
  return { progress, bookmarks: [...input.bookmarks], activity: { ...input.activity }, goal: input.goal, history };
}
