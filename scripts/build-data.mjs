import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateNextExamQuestions } from '../src/lib/next-exam.js';
import { validateQuestions } from '../src/lib/study.js';
import { validateHistoEmbrioQuestions } from '../src/lib/histoembrio.js';
import { validateSolemneQuestions } from '../src/lib/solemne.js';
const groups = ['osteology', 'shoulder', 'forearm', 'hand', 'visual-bones', 'visual-shoulder', 'visual-forearm', 'visual-hand', 'additional'];
const questions = (await Promise.all(groups.map(async group => JSON.parse(await readFile(new URL(`../content/${group}.json`, import.meta.url), 'utf8'))))).flat().sort((a,b) => a.id.localeCompare(b.id));
validateQuestions(questions);
const figureSpecs = (await Promise.all(['bones','shoulder','forearm','hand'].map(async group => JSON.parse(await readFile(new URL(`./figures-${group}.json`, import.meta.url), 'utf8'))))).flat();
const figures = new Map(figureSpecs.map(spec => [spec.output, spec]));
for (const q of questions.filter(q => q.image)) {
  const spec = figures.get(q.image);
  if (!spec || !q.sourcePages.includes(spec.sourcePage)) throw new Error(`Imagen sin procedencia trazable: ${q.id}`);
  const data = await readFile(new URL(`../public/${q.image}`, import.meta.url));
  if (data[0] !== 255 || data[1] !== 216) throw new Error(`JPEG inválido: ${q.id}`);
}
// Stable permutation removes authoring patterns while keeping keys reproducible.
for (const q of questions) {
  const ordered = q.options.map((text, index) => ({ text, index, key: createHash('sha256').update(`${q.id}:${text}`).digest('hex') })).sort((a,b) => a.key.localeCompare(b.key));
  q.correctIndex = ordered.findIndex(o => o.index === q.correctIndex);
  q.options = ordered.map(o => o.text);
}
validateQuestions(questions);
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/questions.json', import.meta.url), JSON.stringify(questions, null, 2) + '\n');
const byTopic = questions.reduce((all,q) => ({ ...all, [q.topic]: (all[q.topic] || 0) + 1 }), {});
console.log('Banco validado: 400 preguntas, 1600 alternativas, 100 preguntas con imágenes.');
console.table(byTopic);

const solemne = JSON.parse(await readFile(new URL('../content/solemne2.json', import.meta.url), 'utf8'));
validateSolemneQuestions(solemne);
for (const q of solemne) {
  const ordered = q.options.map((text, index) => ({ text, index, key: createHash('sha256').update(`solemne2:${q.id}:${text}`).digest('hex') })).sort((a, b) => a.key.localeCompare(b.key));
  q.correctIndex = ordered.findIndex(o => o.index === q.correctIndex);
  q.options = ordered.map(o => o.text);
}
validateSolemneQuestions(solemne);
await writeFile(new URL('../public/data/solemne2.json', import.meta.url), JSON.stringify(solemne, null, 2) + '\n');
console.log('Solemne 2 Morfo: 100 preguntas, 400 alternativas, fuente de 97 páginas, 120 segundos por pregunta.');

const histoembrio = JSON.parse(await readFile(new URL('../content/histoembrio.json', import.meta.url), 'utf8'));
validateHistoEmbrioQuestions(histoembrio);
for (const q of histoembrio) {
  const ordered = q.options.map((text, index) => ({ text, index, key: createHash('sha256').update(`histoembrio:${q.id}:${text}`).digest('hex') })).sort((a, b) => a.key.localeCompare(b.key));
  q.correctIndex = ordered.findIndex(o => o.index === q.correctIndex);
  q.options = ordered.map(o => o.text);
}
validateHistoEmbrioQuestions(histoembrio);
await writeFile(new URL('../public/data/histoembrio.json', import.meta.url), JSON.stringify(histoembrio, null, 2) + '\n');
console.log(`histo-embrio: ${histoembrio.length} preguntas con corrección inmediata y 120 segundos por pregunta.`);

const nextExam = JSON.parse(await readFile(new URL('../content/proxima-prueba.json', import.meta.url), 'utf8'));
validateNextExamQuestions(nextExam);
for (const q of nextExam) {
  const ordered = q.options.map((text, index) => ({ text, index, key: createHash('sha256').update(`nextExam:${q.id}:${text}`).digest('hex') })).sort((a,b) => a.key.localeCompare(b.key));
  q.correctIndex = ordered.findIndex(option => option.index === q.correctIndex);
  q.options = ordered.map(option => option.text);
}
validateNextExamQuestions(nextExam);
await writeFile(new URL('../public/data/proxima-prueba.json', import.meta.url), JSON.stringify(nextExam, null, 2) + '\n');
console.log(`Próxima prueba: ${nextExam.length} preguntas con corrección inmediata y 120 segundos por pregunta.`);

await import('./build-gimkanas.mjs');
