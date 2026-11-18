import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateNextExamQuestions } from '../src/lib/next-exam.js';
import { STUDY_SECTIONS, STUDY_SOURCES, sectionFromHash } from '../src/lib/sections.js';
import { createBackup, parseBackup, createSessionSnapshot, sanitizeSavedSession } from '../src/lib/learning.js';
import { recordAnswer } from '../src/lib/study.js';
const bank = JSON.parse(readFileSync(new URL('../public/data/proxima-prueba.json', import.meta.url), 'utf8'));
const authored = JSON.parse(readFileSync(new URL('../content/proxima-prueba.json', import.meta.url), 'utf8'));

test('próxima prueba reúne 70 preguntas por clase 12 y 100 de AN13 con referencias y claves preservadas', () => {
  assert.equal(validateNextExamQuestions(bank), true);
  assert.equal(bank.length, 240);
  for (const sourceId of ['blood12', 'vascular12', 'vascular13']) {
    const own = bank.filter(q => q.sourceId === sourceId);
    assert.equal(own.length, sourceId === 'vascular13' ? 100 : 70);
    assert.ok(new Set(own.map(q => q.correctIndex)).size === 4);
    assert.equal(readFileSync(new URL('../public/' + STUDY_SOURCES[sourceId].file, import.meta.url)).subarray(0, 4).toString(), '%PDF');
    for (const q of own) {
      const original = authored.find(item => item.id === q.id);
      assert.equal(q.options[q.correctIndex], original.options[original.correctIndex]);
      assert.deepEqual([...q.options].sort(), [...original.options].sort());
    }
  }
  // These concepts distinguish closely related alternatives in the exam pattern.
  for (const [id, answer] of [['q007','Gamma globulinas'],['q078','Porción inicial de la aorta ascendente'],['q127','Mesentérica superior y esplénica']]) {
    const q = bank.find(item => item.id === id);
    assert.equal(q.options[q.correctIndex], answer);
  }
});

test('se rechazan bancos incompletos, alternativas repetidas y páginas de otra fuente', () => {
  for (const mutate of [q => q.pop(), q => {q[0].sourcePages = [50];}, q => {q[70].sourcePages = [46];}, q => {q[140].sourcePages = [94];}, q => {q[0].options[1] = q[0].options[0];}, q => {q[0].sourceId = 'histo';}, q => {q[0].correctIndex = 4;}]) {
    const broken = structuredClone(bank); mutate(broken);
    assert.throws(() => validateNextExamQuestions(broken));
  }
});

test('las clases nuevas aíslan progreso y copias, y recuperan el reloj de dos minutos', () => {
  const prefixes = Object.values(STUDY_SECTIONS).map(section => section.prefix);
  assert.equal(new Set(prefixes).size, prefixes.length);
  for (const [id,hash] of [['blood12','#proxima-prueba-sangre'],['vascular12','#proxima-prueba-vascular'],['vascular13','#proxima-prueba-vascularizacion-extremidades']]) {
    assert.equal(sectionFromHash(hash), id);
    assert.equal(STUDY_SECTIONS[id].duration, 120);
    assert.equal(STUDY_SECTIONS[id].immediateFeedback, true);
    const own = bank.filter(q => q.sourceId === id);
    const payload = createBackup({bank:id,progress:recordAnswer({},own[0].id,true),bookmarks:[own[0].id]});
    assert.equal(parseBackup(payload,own,id).bookmarks[0],own[0].id);
    for (const other of ['control2','solemne2','histo10','embrio11', id === 'blood12' ? 'vascular12' : 'blood12']) assert.throws(() => parseBackup(payload,own,other),/otra sección/);
    const now=1_800_000_000_000;
    const snapshot=createSessionSnapshot({id:'new-exam-'+id,ids:own.map(q=>q.id),index:0,answers:[],mode:'practice',duration:120,startedAt:now,deadline:now+117_321,timeLeft:120_000,paused:false},now);
    const resumed=sanitizeSavedSession(snapshot,own,now+500_000,120);
    assert.equal(resumed.timeLeft,117_321);
    assert.equal(resumed.paused,true);
    assert.equal(resumed.ids.length,id === 'vascular13' ? 100 : 70);
  }
});
