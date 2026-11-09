import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateHistoEmbrioQuestions, HISTOEMBRIO_TOPICS } from '../src/lib/histoembrio.js';
import { STUDY_SECTIONS, STUDY_SOURCES, sectionFromHash } from '../src/lib/sections.js';
import { createSession, recordAnswer } from '../src/lib/study.js';
import { createBackup, parseBackup, createSessionSnapshot, sanitizeSavedSession } from '../src/lib/learning.js';
const bank = JSON.parse(readFileSync(new URL('../public/data/histoembrio.json', import.meta.url), 'utf8'));
const authored = JSON.parse(readFileSync(new URL('../content/histoembrio.json', import.meta.url), 'utf8'));

test('histo-embrio: 100 preguntas, 50 por clase y claves preservadas tras permutar', () => {
  assert.equal(validateHistoEmbrioQuestions(bank), true);
  assert.equal(new Set(bank.map(q => q.topic)).size, HISTOEMBRIO_TOPICS.length);
  const positions = [0, 0, 0, 0];
  for (const q of bank) {
    const original = authored.find(a => a.id === q.id);
    assert.equal(q.options[q.correctIndex], original.options[original.correctIndex], q.id);
    assert.equal(/según (?:la|el)|\bdiapositiva\b|\besta figura\b/i.test(q.question), false, q.id);
    positions[q.correctIndex]++;
  }
  assert.ok(positions.every(n => n >= 12 && n <= 38), `Claves distribuidas: ${positions}`);
  const session = createSession(bank, 100);
  assert.equal(new Set(session.ids).size, 100);
  for (const sourceId of ['histo', 'embrio']) {
    assert.equal(bank.filter(q => q.sourceId === sourceId).length, 50);
    assert.equal(readFileSync(new URL(`../public/${STUDY_SOURCES[sourceId].file}`, import.meta.url)).subarray(0, 4).toString(), '%PDF');
  }
});

test('histo-embrio rechaza referencias fuera de la clase correcta y bancos incompletos', () => {
  for (const mutate of [
    q => { q[0].sourcePages = [57]; },
    q => { q[50].sourcePages = [51]; },
    q => { q[0].sourceId = 'embrio'; },
    q => { q[0].sourceId = 'solemne2'; },
    q => { q[0].correctIndex = 4; },
    q => { q[1].id = q[0].id; },
    q => { q[1].question = q[0].question; },
    q => { q[0].options[1] = q[0].options[0]; },
    q => { q.pop(); },
  ]) {
    const corrupt = structuredClone(bank); mutate(corrupt);
    assert.throws(() => validateHistoEmbrioQuestions(corrupt));
  }
});

test('las tres secciones mantienen enlaces, duraciones y almacenamiento independientes', () => {
  assert.equal(sectionFromHash('#histo-embrio'), 'histoembrio');
  assert.equal(sectionFromHash('#solemne-2-morfo'), 'solemne2');
  assert.equal(sectionFromHash('#control-ii'), 'control2');
  assert.equal(sectionFromHash(''), 'control2');
  assert.equal(STUDY_SECTIONS.control2.duration, 90);
  assert.equal(STUDY_SECTIONS.histoembrio.duration, 120);
  assert.equal(new Set(Object.values(STUDY_SECTIONS).map(s => s.prefix)).size, 3);
  assert.deepEqual(STUDY_SECTIONS.histoembrio.sourceIds, ['histo', 'embrio']);
  const now = 1_800_000_000_000;
  const snapshot = createSessionSnapshot({ id: 'histo-embrio-test', ids: ['q001', 'q051'], index: 0, answers: [], startedAt: now, mode: 'exam', duration: 120, deadline: now + 118_321, timeLeft: 120_000, selected: 1, paused: false }, now);
  const restored = sanitizeSavedSession(snapshot, bank, now + 1_000_000, 120);
  assert.equal(restored.timeLeft, 118_321);
  assert.equal(restored.paused, true);
  const data = { bank: 'histoembrio', progress: recordAnswer({}, 'q051', true, now), bookmarks: ['q001', 'q100'] };
  const backup = createBackup(data, now);
  assert.deepEqual(parseBackup(backup, bank, 'histoembrio').progress, data.progress);
  for (const foreign of ['control2', 'solemne2']) {
    assert.throws(() => parseBackup(backup, bank, foreign), /otra sección/);
    assert.throws(() => parseBackup(createBackup({ ...data, bank: foreign }, now), bank, 'histoembrio'), /otra sección/);
  }
});
