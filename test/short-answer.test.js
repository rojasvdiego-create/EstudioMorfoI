import test from 'node:test';
import assert from 'node:assert/strict';
import { isCorrectAnswer, isShortAnswer, isValidAnswer, SHORT_ANSWER_MAX_LENGTH } from '../src/lib/answers.js';
import { addSessionHistory, createSessionSnapshot, sanitizeSavedSession } from '../src/lib/learning.js';

const textQuestion = (acceptedAnswers, id = 'q001') => ({
  id, acceptedAnswers, topic: 'Histología de la sangre', image: 'figures/blood/demo.jpg',
});
const choiceQuestion = { id: 'q002', topic: 'Histología de la sangre', options: ['Eritrocito', 'Plaqueta'], correctIndex: 1 };

test('las respuestas escritas aceptan variantes completas y diferencias de escritura', () => {
  const question = textQuestion(['fagocitosis de bacterias', 'fagocitar bacterias']);
  assert.equal(isShortAnswer(question), true);
  assert.equal(isShortAnswer(choiceQuestion), false);
  assert.equal(isCorrectAnswer(question, '  FAGOCITÓSIS  DE   BACTERIAS.  '), true);
  assert.equal(isCorrectAnswer(question, 'Fagocitar bacterias'), true);
  assert.equal(isCorrectAnswer(question, 'Fagocitar bacterias y secretar anticuerpos'), false);
  assert.equal(isCorrectAnswer(question, 'No fagocita bacterias'), false);
  assert.equal(isValidAnswer(question, '   '), false);
  assert.equal(isValidAnswer(question, 'a'.repeat(SHORT_ANSWER_MAX_LENGTH + 1)), false);
  assert.equal(isValidAnswer(question, 0), false);
  assert.equal(isCorrectAnswer(choiceQuestion, 1), true);
  assert.equal(isCorrectAnswer(choiceQuestion, '1'), false);
  assert.equal(isValidAnswer(choiceQuestion, 2), false);
});

test('las conversiones tipográficas conservan los dos límites y las unidades', () => {
  const range = textQuestion(['0,5 a 2 %', '0,5 a 2']);
  for (const value of ['0.5–2%', '0,50% a 2,0%', 'entre 0,5 y 2 %', '0,5 hasta 2', 'de 0.5 a 2']) {
    assert.equal(isCorrectAnswer(range, value), true, value);
  }
  for (const value of ['1 %', '0,5 a 3 %', '2 a 0,5 %', '0,5 a 2 µm', 'menos de 0,5 a 2 %']) {
    assert.equal(isCorrectAnswer(range, value), false, value);
  }
  assert.equal(isCorrectAnswer(textQuestion(['3.000 a 6.000 por mm³']), '3 000-6000 por mm^3'), true);
  assert.equal(isCorrectAnswer(textQuestion(['7 a 8 µm']), 'entre 7 um y 8 μm'), true);
  assert.equal(isCorrectAnswer(textQuestion(['7 a 8 µm']), '7 a 8'), false);
  assert.equal(isCorrectAnswer(textQuestion(['histamina y heparina']), 'Histamina, heparina'), true);
});

test('retoma un borrador de texto, recupera la respuesta original y recalcula su corrección', () => {
  const bank = [textQuestion(['150 a 400 por mm³']), choiceQuestion];
  const now = Date.UTC(2026, 10, 19);
  const session = {
    id: 'short-draft', ids: ['q001', 'q002'], index: 0, answers: [], mode: 'practice',
    duration: 90, startedAt: now, deadline: now + 65_000, timeLeft: 65_000, selected: '150 a ',
  };
  const saved = createSessionSnapshot(session, now);
  const draft = sanitizeSavedSession(saved, bank, now + 100_000);
  assert.equal(draft.selected, '150 a ');
  assert.equal(draft.timeLeft, 65_000);
  assert.equal(draft.paused, true);
  assert.equal(draft.imagePending, true);
  assert.equal(sanitizeSavedSession({ ...saved, selected: 2 }, bank, now), null);

  const attempt = { id: 'q001', selected: '150-400 por mm3', timeout: false, correct: false };
  const answered = sanitizeSavedSession({ ...saved, answers: [attempt] }, bank, now);
  assert.equal(answered.selected, attempt.selected);
  assert.equal(answered.answers[0].correct, true);
  assert.equal(answered.imagePending, false);

  const timeout = { id: 'q001', selected: null, timeout: true, correct: true };
  const expired = sanitizeSavedSession({ ...saved, answers: [timeout] }, bank, now);
  assert.equal(expired.selected, null);
  assert.equal(expired.answers[0].correct, false);
  assert.equal(sanitizeSavedSession({ ...saved, answers: [{ ...timeout, selected: '150 a 400 por mm3' }] }, bank, now), null);

  const complete = { ...session, index: 2, answers: [attempt, { id: 'q002', selected: 1, timeout: false, correct: false }] };
  const history = addSessionHistory([], complete, bank, now);
  assert.equal(history.length, 1);
  assert.equal(history[0].correct, 2);
  assert.equal(history[0].accuracy, 100);
});
