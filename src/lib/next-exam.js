import { STUDY_SECTIONS, STUDY_SOURCES } from './sections.js';

export const NEXT_EXAM_TOPICS = {
  blood12: ['Sangre: componentes y plasma', 'Sangre: eritrocitos', 'Sangre: leucocitos', 'Sangre: plaquetas y hemostasia'],
  vascular12: ['Vascular: circulación y aorta', 'Vascular: ramas y territorios', 'Vascular: venas y retorno', 'Vascular: vascularización de columna'],
  vascular13: [
    'Vascularización de extremidades: arterias del miembro superior',
    'Vascularización de extremidades: arterias del miembro inferior',
    'Vascularización de extremidades: venas del miembro superior',
    'Vascularización de extremidades: venas del miembro inferior',
    'Vascularización de extremidades: drenaje linfático',
  ],
};

export function validateNextExamQuestions(questions) {
  const classes = Object.entries(STUDY_SECTIONS).filter(([, section]) => section.parentId === 'nextExam');
  const expected = classes.reduce((sum, [, section]) => sum + section.questionCount, 0);
  if (!Array.isArray(questions) || questions.length !== expected) throw new Error(`Próxima prueba debe contener ${expected} preguntas.`);
  const ids = new Set(), texts = new Set();
  for (const q of questions) {
    const text = q.question?.trim().normalize('NFC').toLocaleLowerCase('es');
    if (!/^q\d{3}$/.test(q.id) || ids.has(q.id) || !text || texts.has(text) || /[\t\r\n]|\S {2,}\S/.test(q.question)) throw new Error(`Pregunta inválida o duplicada: ${q.id}`);
    ids.add(q.id); texts.add(text);
    if (!NEXT_EXAM_TOPICS[q.sourceId]?.includes(q.topic) || !q.subtopic?.trim() || !['Básica', 'Intermedia', 'Avanzada'].includes(q.difficulty) || !['concepto', 'aplicación', 'caso clínico'].includes(q.type)) throw new Error(`Metadatos inválidos: ${q.id}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(option => typeof option !== 'string' || !option.trim()) || new Set(q.options.map(option => option.trim().toLocaleLowerCase('es'))).size !== 4) throw new Error(`Alternativas inválidas: ${q.id}`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || typeof q.explanation !== 'string' || q.explanation.length < 100) throw new Error(`Solución incompleta: ${q.id}`);
    const source = STUDY_SOURCES[q.sourceId];
    if (!source || !Array.isArray(q.sourcePages) || !q.sourcePages.length || q.sourcePages.some(page => !Number.isInteger(page) || page < 1 || page > source.pages)) throw new Error(`Referencia inválida: ${q.id}`);
    if (q.image) throw new Error(`La pregunta debe ser autónoma sin imagen: ${q.id}`);
  }
  for (let n = 1; n <= expected; n++) if (!ids.has(`q${String(n).padStart(3, '0')}`)) throw new Error(`Falta pregunta ${n}`);
  for (const [id, section] of classes) {
    const own = questions.filter(q => section.sourceIds.includes(q.sourceId));
    if (own.length !== section.questionCount) throw new Error(`Número incorrecto en ${id}`);
    for (const sourceId of section.sourceIds) for (const topic of NEXT_EXAM_TOPICS[sourceId]) if (!own.some(q => q.topic === topic)) throw new Error(`Tema ausente en ${id}: ${topic}`);
  }
  return true;
}
