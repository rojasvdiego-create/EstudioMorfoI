import test from 'node:test';
import assert from 'node:assert/strict';
import { DURATION, createSession, recordAnswer, getQuestionStatus, getStats, loadData, saveData } from '../src/lib/study.js';

test('sesión aleatoria respeta el tamaño, sin repetir ni mutar el banco', () => {
 const questions = Array.from({length:200}, (_,i) => ({id:`q${i}`}));
 const original = JSON.stringify(questions);
 for (const n of [10,20,50,100,200,300]) {
  const session = createSession([...questions, questions[0]],n);
  assert.equal(session.ids.length, Math.min(n,200));
  assert.equal(new Set(session.ids).size, session.ids.length);
  assert.equal(session.answers.length,0);
 }
 assert.equal(JSON.stringify(questions),original);
 assert.equal(createSession([],10).ids.length,0);
 assert.equal(DURATION,90);
});

test('errores quedan pendientes y aciertos programan repasos de 1, 3, 7, 14 y 30 días', () => {
 const now = 1_800_000_000_000, day = 86_400_000;
 let p = recordAnswer({},'q001',false,now);
 assert.equal(getQuestionStatus(p,'q001',now),'learning');
 assert.equal(getQuestionStatus(p,'q002',now),'new');
 for (const interval of [1,3,7,14,30,30]) {
  p = recordAnswer(p,'q001',true,now);
  assert.equal(p.q001.nextReview,now + interval * day);
  assert.equal(getQuestionStatus(p,'q001',now),'learned');
  assert.equal(getQuestionStatus(p,'q001',p.q001.nextReview),'due');
 }
 p = recordAnswer(p,'q001',false,now);
 assert.equal(p.q001.streak,0);
 p = recordAnswer(p,'q001',true,now);
 assert.equal(p.q001.nextReview,now + day);
});

test('estadísticas reflejan intentos y solo IDs del banco actual', () => {
 let p = recordAnswer({},'q1',false,100);
 p = recordAnswer(p,'q1',true,100);
 p = recordAnswer(p,'q2',false,100);
 p = recordAnswer(p,'unknown',true,100);
 assert.deepEqual(getStats(p,[{id:'q1'},{id:'q2'},{id:'q3'}],101),{answered:3,correct:1,accuracy:33,mastered:1,due:1});
});

test('el almacenamiento fallido o corrupto no impide estudiar', () => {
 globalThis.localStorage={getItem:()=>'{malformed',setItem:()=>{throw new Error('quota')}};
 assert.deepEqual(loadData('x',{}),{});
 assert.equal(saveData('x',{}),false);
 const values=new Map();
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(saveData('x',{a:1}),true);
 assert.deepEqual(loadData('x',{}),{a:1});
 delete globalThis.localStorage;
});
