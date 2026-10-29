import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateQuestions } from '../src/lib/study.js';
const bank=JSON.parse(readFileSync(new URL('../public/data/questions.json',import.meta.url),'utf8'));
const authored=['osteology','shoulder','forearm','hand'].flatMap(name=>JSON.parse(readFileSync(new URL(`../content/${name}.json`,import.meta.url),'utf8')));
test('banco completo: 200 preguntas únicas, soluciones explicadas y páginas trazables',()=>{
 assert.equal(validateQuestions(bank),true);
 assert.equal(new Set(bank.map(q=>q.topic)).size,7);
 for(const q of bank){
  const source=authored.find(a=>a.id===q.id);
  assert.ok(source,`Fuente para ${q.id}`);
  assert.equal(q.options[q.correctIndex],source.options[source.correctIndex],`Clave permutada incorrecta: ${q.id}`);
 }
});
test('el validador rechaza preguntas sin alternativa correcta o páginas inexistentes',()=>{
 let corrupt=structuredClone(bank);corrupt[0].correctIndex=4;
 assert.throws(()=>validateQuestions(corrupt),/Solución incompleta/);
 corrupt=structuredClone(bank);corrupt[0].sourcePages=[51];
 assert.throws(()=>validateQuestions(corrupt),/Referencia inválida/);
});
