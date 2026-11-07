import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSolemneQuestions } from '../src/lib/solemne.js';
import { createSession, recordAnswer } from '../src/lib/study.js';
import { createSessionSnapshot, sanitizeSavedSession, createBackup, parseBackup } from '../src/lib/learning.js';
const bank = JSON.parse(readFileSync(new URL('../public/data/solemne2.json', import.meta.url), 'utf8'));
const authored = JSON.parse(readFileSync(new URL('../content/solemne2.json', import.meta.url), 'utf8'));
const now = 1_800_000_000_000;

test('Solemne 2: 100 preguntas escritas, siete áreas y claves correctas después de permutar', () => {
  assert.equal(validateSolemneQuestions(bank), true);
  assert.equal(bank.filter(q => q.type === 'caso clínico').length, 35);
  const counts = [0, 0, 0, 0];
  for (const q of bank) {
    const source = authored.find(item => item.id === q.id);
    assert.equal(q.options[q.correctIndex], source.options[source.correctIndex], q.id);
    assert.equal(/según (?:la|el)|\bAN0?\d+\b/i.test(q.question), false, q.id);
    counts[q.correctIndex]++;
  }
  assert.ok(counts.every(count => count >= 15 && count <= 35), `Claves distribuidas: ${counts}`);
  const session = createSession(bank, 100);
  assert.equal(session.ids.length, 100);
  assert.equal(new Set(session.ids).size, 100);
  assert.ok(bank.some(q => q.sourcePages.some(page => page > 50)), 'Referencias al nuevo PDF completo');
  assert.equal(readFileSync(new URL('../public/source-solemne2.pdf', import.meta.url)).subarray(0, 4).toString(), '%PDF');
});

test('Solemne 2 rechaza duplicados, claves y referencias fuera de las 97 páginas', () => {
  for (const mutate of [q => { q[0].correctIndex = 4; }, q => { q[0].sourcePages = [98]; }, q => { q[0].sourceId = 'control2'; }, q => { q[1].question = q[0].question; }, q => { q[0].options[1] = q[0].options[0]; }]) {
    const corrupt = structuredClone(bank); mutate(corrupt);
    assert.throws(() => validateSolemneQuestions(corrupt));
  }
});

test('el reloj de 120 segundos se conserva al guardar y restaurar sin truncarlo a 90', () => {
  const session = { id: 'solemne-session', ids: ['q001', 'q100'], index: 0, answers: [], startedAt: now, mode: 'exam', duration: 120, deadline: now + 119_321, timeLeft: 120_000, selected: 2, paused: false };
  const snapshot = createSessionSnapshot(session, now);
  assert.equal(snapshot.timeLeft, 119_321);
  assert.equal(snapshot.duration, 120);
  const restored = sanitizeSavedSession(snapshot, bank, now + 86_400_000, 120);
  assert.equal(restored.timeLeft, 119_321);
  assert.equal(restored.duration, 120);
  assert.equal(restored.paused, true);
  assert.equal(restored.selected, 2);
  assert.equal(sanitizeSavedSession(snapshot, bank, now), null, 'Un reloj de Solemne no se restaura como Control II');
  assert.equal(sanitizeSavedSession({ ...snapshot, timeLeft: 120_001 }, bank, now, 120), null);
  assert.equal(sanitizeSavedSession({ ...snapshot, timeLeft: 0 }, bank, now, 120).timeLeft, 0);
});

test('copias de Solemne y Control II no se mezclan aunque compartan números de pregunta', () => {
  const progress = recordAnswer({}, 'q001', true, now);
  const data = { bank: 'solemne2', progress, bookmarks: ['q100'] };
  const backup = createBackup(data, now);
  assert.deepEqual(parseBackup(backup, bank, 'solemne2').progress, progress);
  assert.throws(() => parseBackup(backup, bank), /otra sección/);
  assert.throws(() => parseBackup(createBackup({ progress }, now), bank, 'solemne2'), /otra sección/);
  const oldBackup = createBackup({ progress }, now); delete oldBackup.bank;
  assert.deepEqual(parseBackup(oldBackup, bank).progress, progress, 'La copia antigua sigue siendo importable en Control II');
});
