import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateQuestions } from '../src/lib/study.js';
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
