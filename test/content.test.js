import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateQuestions } from '../src/lib/study.js';
const bank=JSON.parse(readFileSync(new URL('../public/data/questions.json',import.meta.url),'utf8'));
const authored=['osteology','shoulder','forearm','hand','visual-bones','visual-shoulder','visual-forearm','visual-hand'].flatMap(name=>JSON.parse(readFileSync(new URL(`../content/${name}.json`,import.meta.url),'utf8')));
test('banco completo: 300 preguntas únicas, soluciones explicadas y páginas trazables',()=>{
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

test('las 100 preguntas visuales tienen imagen local, marcador válido y procedencia en el PDF',()=>{
 const visual=bank.filter(q=>q.image);
 assert.equal(visual.length,100);
 assert.equal(bank.filter(q=>!q.image).length,200);
 for(const q of visual){
  const image=readFileSync(new URL(`../public/${q.image}`,import.meta.url));
  assert.equal(image[0],255);assert.equal(image[1],216);
  assert.ok(q.imageAlt && q.imageCaption && q.imageCredit);
 }
 let corrupt=structuredClone(bank);corrupt[200].imageMarkers=[{label:'A',x:101,y:50}];
 assert.throws(()=>validateQuestions(corrupt),/Señalamiento fuera/);
});
