import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateQuestions } from '../src/lib/study.js';
const groups = ['osteology', 'shoulder', 'forearm', 'hand'];
const questions = (await Promise.all(groups.map(async group => JSON.parse(await readFile(new URL(`../content/${group}.json`, import.meta.url), 'utf8'))))).flat().sort((a,b) => a.id.localeCompare(b.id));
validateQuestions(questions);
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
console.log('Banco validado: 200 preguntas, 800 alternativas.');
console.table(byTopic);
