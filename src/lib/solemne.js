export const SOLEMNE_TOPICS = [
  'Bases de miología',
  'Dorso I: osteología y artrología',
  'Dorso II: músculos e inervación',
  'Miembro superior I: osteología y artrología',
  'Miembro superior II: miología e inervación',
  'Miembro inferior I: osteología y artrología',
  'Miembro inferior II: miología e inervación',
];

export function validateSolemneQuestions(questions) {
  if (!Array.isArray(questions) || questions.length !== 100) throw new Error('Solemne 2 debe tener exactamente 100 preguntas.');
  const ids = new Set(), texts = new Set();
  for (const q of questions) {
    if (!/^q\d{3}$/.test(q.id) || ids.has(q.id) || q.sourceId !== 'solemne2') throw new Error(`ID o fuente inválidos: ${q.id}`);
    ids.add(q.id);
    const text = q.question?.trim().toLocaleLowerCase('es');
    if (!text || texts.has(text) || /[\t\r\n]|\S {2,}\S/.test(q.question)) throw new Error(`Enunciado inválido o duplicado: ${q.id}`);
    texts.add(text);
    if (!SOLEMNE_TOPICS.includes(q.topic) || !q.subtopic?.trim() || !['Básica', 'Intermedia', 'Avanzada'].includes(q.difficulty) || !['concepto', 'aplicación', 'caso clínico'].includes(q.type)) throw new Error(`Metadatos inválidos: ${q.id}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string' || !o.trim()) || new Set(q.options.map(o => o.trim().toLocaleLowerCase('es'))).size !== 4) throw new Error(`Alternativas inválidas: ${q.id}`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || typeof q.explanation !== 'string' || q.explanation.length < 100) throw new Error(`Solución incompleta: ${q.id}`);
    if (!Array.isArray(q.sourcePages) || !q.sourcePages.length || q.sourcePages.some(p => !Number.isInteger(p) || p < 1 || p > 97)) throw new Error(`Referencia inválida: ${q.id}`);
    if (q.image) throw new Error(`Formato escrito inesperado: ${q.id}`);
  }
  for (let i = 1; i <= 100; i++) if (!ids.has(`q${String(i).padStart(3, '0')}`)) throw new Error(`Falta la pregunta ${i}`);
  for (const topic of SOLEMNE_TOPICS) if (!questions.some(q => q.topic === topic)) throw new Error(`Tema ausente: ${topic}`);
  return true;
}
