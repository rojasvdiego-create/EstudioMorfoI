import test from 'node:test';
import assert from 'node:assert/strict';
import { recordAnswer } from '../src/lib/study.js';
import { getStudyPlan, recordActivity, getActivitySummary, createSessionSnapshot, sanitizeSavedSession, addSessionHistory, createBackup, parseBackup } from '../src/lib/learning.js';

const questions = Array.from({ length: 6 }, (_, i) => ({ id: `q00${i + 1}`, topic: i < 3 ? 'Hombro' : 'Mano', options: ['A', 'B', 'C', 'D'], correctIndex: i % 4, ...(i === 3 ? { image: 'figures/hand/test.jpg' } : {}) }));
const now = new Date(2026, 9, 30, 12).getTime();
const answer = (id, selected, timeout = false) => ({ id, selected, timeout, correct: false });
function session(overrides = {}) {
 return { id: 'attempt-1', ids: ['q001', 'q004'], index: 0, answers: [], startedAt: now - 10_000, mode: 'practice', deadline: now + 65_432, timeLeft: 90_000, paused: false, selected: 2, progressApplied: false, ...overrides };
}

test('plan prioriza repasos vencidos, errores y nuevas sin repetir ni mutar', () => {
 let progress = recordAnswer({}, 'q001', true, now - 2 * 86_400_000);
 progress = recordAnswer(progress, 'q002', false, now - 1000);
 progress = recordAnswer(progress, 'q004', true, now);
 const copy = JSON.stringify(progress), source = JSON.stringify(questions);
 const plan = getStudyPlan([...questions, questions[0]], progress, 6, now, () => 0.5);
 assert.equal(plan.questions.length, 6);
 assert.equal(new Set(plan.questions.map(q => q.id)).size, 6);
 assert.deepEqual(plan.questions.slice(0, 2).map(q => q.id), ['q001', 'q002']);
 assert.equal(plan.questions.at(-1).id, 'q004');
 assert.equal(plan.dueCount, 1); assert.equal(plan.errorCount, 1); assert.equal(plan.unseenCount, 3);
 assert.equal(plan.focusTopic, null, 'No focus based on fewer than three attempts');
 assert.equal(JSON.stringify(progress), copy, 'Planning must not alter cumulative progress');
 progress = recordAnswer(progress, 'q002', false, now);
 const updated = getStudyPlan(questions, progress, 2, now);
 assert.equal(updated.focusTopic, 'Hombro');assert.equal(updated.weakTopics[0].accuracy, 33);
 assert.equal(JSON.stringify(questions), source);
});

test('actividad cuenta respuestas reales y conserva 90 días del calendario local', () => {
 const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
 let activity = recordActivity({}, yesterday.getTime());
 activity = recordActivity(activity, now); activity = recordActivity(activity, now);
 activity['2025-01-01'] = 20; activity['2026-02-30'] = 10;activity.invalid=2;activity['2026-10-29']='3';
 const cleaned = recordActivity(activity, now);
 assert.equal(cleaned['2026-10-30'], 3);
 assert.equal('2025-01-01' in cleaned, false);assert.equal('2026-02-30' in cleaned,false);assert.equal('2026-10-29' in cleaned,false);
 const summary = getActivitySummary(cleaned, 20, now);
 assert.equal(summary.todayCount,3);assert.equal(summary.goalPercent,15);assert.equal(summary.weekTotal,3);assert.equal(summary.activeDays,1);
 assert.equal(summary.last7Days.length,7);assert.equal(summary.last7Days.at(-1).isToday,true);
 assert.equal(getActivitySummary({},20,now).weekTotal,0,'No inferred old activity');
 assert.equal(recordActivity(null,now)['2026-10-30'],1);
});

test('sesión restaurada conserva milisegundos exactos, selección y pausa sin consumir el cierre', () => {
 const saved = createSessionSnapshot(session(), now);
 assert.equal(saved.timeLeft,65_432);assert.equal(saved.selected,2);
 const restored = sanitizeSavedSession(saved,questions,now + 86_400_000);
 assert.equal(restored.timeLeft,65_432);assert.equal(restored.selected,2);assert.equal(restored.paused,true);
 assert.equal(restored.deadline, now + 86_400_000 + 65_432);
 const paused = createSessionSnapshot(session({paused:true,timeLeft:42_123}),now);
 assert.equal(paused.timeLeft,42_123);
 const loading = createSessionSnapshot(session({imagePending:true,timeLeft:90_000}),now);
 assert.equal(loading.timeLeft,90_000);
 const zero = createSessionSnapshot(session({deadline:now - 10}),now);
 assert.equal(sanitizeSavedSession(zero,questions,now).timeLeft,0,'Expired clock does not gain new time');
});

test('restauración valida cola y respuestas, recalcula claves y rechaza snapshots incompatibles', () => {
 const saved = createSessionSnapshot(session({answers:[answer('q001',0)],selected:3,timeLeft:12_000}),now);
 const restored = sanitizeSavedSession(saved,questions,now);
 assert.equal(restored.answers[0].correct,true);assert.equal(restored.selected,0,'Feedback selection comes from submitted answer');
 assert.equal(sanitizeSavedSession({...saved,ids:['q001','q001']},questions),null);
 assert.equal(sanitizeSavedSession({...saved,answers:[answer('q004',3)]},questions),null);
 assert.equal(sanitizeSavedSession({...saved,index:1,answers:[]},questions),null);
 assert.equal(sanitizeSavedSession({...saved,bankVersion:'old'},questions),null);
 assert.equal(sanitizeSavedSession({...saved,timeLeft:90_001},questions),null);
 assert.equal(sanitizeSavedSession({...saved,selected:'0'},questions),null);
 assert.equal(sanitizeSavedSession({...saved,progressApplied:true},questions),null);
 assert.equal(createSessionSnapshot(session({index:2}),now),null);
 const image = createSessionSnapshot(session({ids:['q004'],selected:null}),now);
 assert.equal(sanitizeSavedSession(image,questions,now).imagePending,true);
});

test('historial solo guarda sesiones completas, una vez por ID y con exactitud calculada', () => {
 const complete = session({index:2,answers:[answer('q001',0),answer('q004',0)]});
 const history = addSessionHistory([],complete,questions,now);
 assert.equal(history.length,1);assert.equal(history[0].correct,1);assert.equal(history[0].accuracy,50);
 assert.deepEqual(history[0].topics,['Hombro','Mano']);
 assert.equal(addSessionHistory(history,complete,questions,now + 1).length,1);
 assert.equal(addSessionHistory([],session(),questions,now).length,0);
 assert.equal(addSessionHistory([], {...complete,answers:[answer('q001',0),answer('q001',0)]},questions,now).length,0);
 let limited=[];
 for(let i=0;i<35;i++) limited=addSessionHistory(limited,{...complete,id:`session-${i}`},questions,now+i);
 assert.equal(limited.length,30);assert.equal(limited[0].id,'session-34');
});

test('copias round-trip válidas y rechazo total de IDs ajenos, contadores y calendarios inválidos', () => {
 const progress = recordAnswer({},'q001',true,now);
 const history = addSessionHistory([],session({index:2,answers:[answer('q001',0),answer('q004',3)]}),questions,now);
 const data={progress,bookmarks:['q001'],activity:recordActivity({},now),goal:20,history};
 const backup=createBackup(data,now);
 assert.deepEqual(parseBackup(JSON.stringify(backup),questions),data);
 backup.progress.q001.attempts=99;
 assert.equal(progress.q001.attempts,1,'Export creates detached data');
 for(const mutate of [
  b=>{b.progress.q999={...b.progress.q001};},
  b=>{b.progress.q001.correct=2;},
  b=>{b.progress.q001.lastCorrect='true';},
  b=>{b.progress.q001.nextReview=-1;},
  b=>{b.bookmarks=['q001','q001'];},
  b=>{b.activity['2026-02-30']=1;},
  b=>{b.goal=101;},
  b=>{b.history[0].accuracy=99;},
  b=>{b.version=2;},
 ]){
  const corrupt=createBackup(data,now);mutate(corrupt);
  assert.throws(()=>parseBackup(corrupt,questions),/copia de progreso no es válida/);
 }
 assert.throws(()=>parseBackup('{broken',questions),/JSON legible/);
});

test('historial y copias conservan sesiones completas de 400 y progreso previo', () => {
 const expanded = Array.from({ length: 400 }, (_, i) => ({ id: `q${String(i + 1).padStart(3,'0')}`, topic: 'Mano', options: ['A','B','C','D'], correctIndex: i % 4 }));
 const complete = session({ ids: expanded.map(q=>q.id), index: 400, answers: expanded.map(q=>answer(q.id,q.correctIndex)) });
 const history = addSessionHistory([],complete,expanded,now);
 assert.equal(history[0].questionCount,400);
 assert.equal(history[0].accuracy,100);
 assert.equal(addSessionHistory(history,{...complete,id:'next'},expanded,now+1).length,2);
 const data = {progress:recordAnswer({},'q001',true,now),bookmarks:['q001','q400'],activity:{},goal:20,history};
 assert.deepEqual(parseBackup(createBackup(data,now),expanded),data);
 const oldSnapshot=createSessionSnapshot(session({ids:['q001','q004']}),now);
 assert.ok(sanitizeSavedSession(oldSnapshot,expanded,now));
});
