export const DURATION = 90;
const DAY = 86_400_000;
const INTERVALS = [1, 3, 7, 14, 30];

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createSession(questions, size) {
  const unique = [...new Map(questions.map(q => [q.id, q])).values()];
  const count = Math.max(0, Math.min(unique.length, Math.trunc(Number(size) || 0)));
  return { ids: shuffle(unique).slice(0, count).map(q => q.id), index: 0, answers: [], startedAt: Date.now() };
}

export function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) ?? fallback;
  } catch { return fallback; }
}

export function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function recordAnswer(progress, questionId, isCorrect, now = Date.now()) {
  const old = progress?.[questionId] || {};
  const streak = isCorrect ? Math.max(0, Number(old.streak) || 0) + 1 : 0;
  return {
    ...progress,
    [questionId]: {
      attempts: Math.max(0, Number(old.attempts) || 0) + 1,
      correct: Math.max(0, Number(old.correct) || 0) + (isCorrect ? 1 : 0),
      lastCorrect: !!isCorrect,
      streak,
      lastReviewed: now,
      nextReview: isCorrect ? now + INTERVALS[Math.min(streak - 1, INTERVALS.length - 1)] * DAY : now,
    },
  };
}

export function getQuestionStatus(progress, questionId, now = Date.now()) {
  const record = progress?.[questionId];
  if (!record || !(Number(record.attempts) > 0)) return 'new';
  if (!record.lastCorrect) return 'learning';
  return Number(record.nextReview) <= now ? 'due' : 'learned';
}

export function getStats(progress, questions, now = Date.now()) {
  let answered = 0, correct = 0, mastered = 0, due = 0;
  for (const q of questions) {
    const record = progress?.[q.id];
    const attempts = Math.max(0, Number(record?.attempts) || 0);
    answered += attempts;
    correct += Math.min(attempts, Math.max(0, Number(record?.correct) || 0));
    const status = getQuestionStatus(progress, q.id, now);
    if (record?.lastCorrect && attempts) mastered++;
    if (status === 'due' || status === 'learning') due++;
  }
  return { answered, correct, accuracy: answered ? Math.round(correct / answered * 100) : 0, mastered, due };
}

export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length !== 400) throw new Error('El banco debe tener exactamente 400 preguntas.');
  const ids = new Set(), texts = new Set();
  const topics = new Set(['Osteología', 'Artrología', 'Axila y plexo braquial', 'Hombro y brazo', 'Antebrazo', 'Muñeca y mano', 'Integración clínica']);
  for (const q of questions) {
    if (!/^q\d{3}$/.test(q.id) || ids.has(q.id)) throw new Error(`ID inválido o duplicado: ${q.id}`);
    ids.add(q.id);
    const text = q.question?.trim().toLocaleLowerCase('es');
    if (!text || texts.has(text)) throw new Error(`Enunciado ausente o duplicado: ${q.id}`);
    texts.add(text);
    if (!topics.has(q.topic) || !q.subtopic || !['Básica', 'Intermedia', 'Avanzada'].includes(q.difficulty) || !['concepto', 'aplicación', 'caso clínico'].includes(q.type)) throw new Error(`Metadatos inválidos: ${q.id}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string' || !o.trim()) || new Set(q.options.map(o => o.toLocaleLowerCase('es').trim())).size !== 4) throw new Error(`Alternativas inválidas: ${q.id}`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || typeof q.explanation !== 'string' || q.explanation.length < 100) throw new Error(`Solución incompleta: ${q.id}`);
    const visual = Number(q.id.slice(1)) > 200 && Number(q.id.slice(1)) <= 300;
    if (visual && !q.image || !visual && q.image) throw new Error(`Formato visual inesperado: ${q.id}`);
    if (q.image) {
      if (!/^figures\/(?:bones|shoulder|forearm|hand)\/[a-z0-9-]+\.jpg$/.test(q.image) || !q.imageAlt?.trim() || !q.imageCaption?.trim() || !q.imageCredit?.trim()) throw new Error(`Imagen o atribución incompleta: ${q.id}`);
      if (q.imageMarkers !== undefined && (!Array.isArray(q.imageMarkers) || q.imageMarkers.some(m => !m.label || !Number.isFinite(m.x) || !Number.isFinite(m.y) || m.x < 0 || m.x > 100 || m.y < 0 || m.y > 100))) throw new Error(`Señalamiento fuera de la imagen: ${q.id}`);
    }
    if (!Array.isArray(q.sourcePages) || !q.sourcePages.length || q.sourcePages.some(p => !Number.isInteger(p) || p < 1 || p > 50)) throw new Error(`Referencia inválida: ${q.id}`);
  }
  if (questions.filter(q => q.image).length !== 100) throw new Error('El banco debe incluir exactamente 100 preguntas con imagen.');
  for (let i = 1; i <= 400; i++) if (!ids.has(`q${String(i).padStart(3, '0')}`)) throw new Error(`Falta la pregunta ${i}`);
  return true;
}
