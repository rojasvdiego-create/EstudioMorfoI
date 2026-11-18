import { STUDY_SECTIONS, STUDY_SOURCES } from './sections.js';

const topicsBySource = {
  histo: [
    'Histología: tejido cartilaginoso',
    'Histología: tejido óseo',
    'Histología: músculo estriado esquelético',
  ],
  embrio: [
    'Embriología: bases y mesodermo',
    'Embriología: somitas, columna y músculo',
    'Embriología: desarrollo de los miembros',
    'Embriología: osificación y crecimiento',
  ],
  histo13: [
    'Histología vascular: endotelio',
    'Histología vascular: pared vascular',
    'Histología vascular: arterias',
    'Histología vascular: microcirculación',
    'Histología vascular: venas',
    'Histología vascular: sistema linfático',
  ],
};
export const HISTOEMBRIO_TOPICS = Object.values(topicsBySource).flat();

export function validateHistoEmbrioQuestions(questions) {
  const classes = Object.values(STUDY_SECTIONS).filter(section => section.parentId === 'histoembrio');
  const expected = STUDY_SECTIONS.histoembrio.questionCount;
  if (!Array.isArray(questions) || questions.length !== expected) {
    throw new Error(`histo-embrio debe tener exactamente ${expected} preguntas.`);
  }
  const ids = new Set(), texts = new Set();
  for (const q of questions) {
    if (!/^q\d{3}$/.test(q.id) || ids.has(q.id) || !Object.hasOwn(topicsBySource, q.sourceId)) throw new Error(`ID o fuente inválidos: ${q.id}`);
    ids.add(q.id);
    const text = q.question?.trim().toLocaleLowerCase('es');
    if (!text || texts.has(text) || /[\t\r\n]|\S {2,}\S/.test(q.question)) throw new Error(`Enunciado inválido o duplicado: ${q.id}`);
    texts.add(text);
    if (!topicsBySource[q.sourceId].includes(q.topic) || !q.subtopic?.trim() || !['Básica', 'Intermedia', 'Avanzada'].includes(q.difficulty) || !['concepto', 'aplicación', 'caso clínico'].includes(q.type)) throw new Error(`Metadatos inválidos: ${q.id}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string' || !o.trim()) || new Set(q.options.map(o => o.trim().toLocaleLowerCase('es'))).size !== 4) throw new Error(`Alternativas inválidas: ${q.id}`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || typeof q.explanation !== 'string' || q.explanation.length < 100) throw new Error(`Solución incompleta: ${q.id}`);
    if (!Array.isArray(q.sourcePages) || !q.sourcePages.length || q.sourcePages.some(page => !Number.isInteger(page) || page < 1 || page > STUDY_SOURCES[q.sourceId].pages)) throw new Error(`Referencia inválida: ${q.id}`);
    if (q.image) throw new Error(`Formato escrito inesperado: ${q.id}`);
  }
  for (let i = 1; i <= expected; i++) if (!ids.has(`q${String(i).padStart(3, '0')}`)) throw new Error(`Falta la pregunta ${i}`);
  for (const topic of HISTOEMBRIO_TOPICS) if (!questions.some(q => q.topic === topic)) throw new Error(`Tema ausente: ${topic}`);
  for (const section of classes) {
    const own = questions.filter(q => section.sourceIds.includes(q.sourceId));
    if (own.length !== section.questionCount) throw new Error(`${section.name} debe tener ${section.questionCount} preguntas.`);
  }
  return true;
}
