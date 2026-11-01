import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Upload, ArrowRight, ArrowUpRight, BookOpen, Bookmark, Check, CheckCheck, ChevronRight, CircleHelp, Clock3, FileText, GraduationCap, Grid2X2, Layers, ListFilter, Maximize2, Image as ImageIcon, Menu, Pause, Play, RotateCcw, Search, ShieldCheck, Target, TrendingUp, X, XCircle } from 'lucide-react';
import { DURATION, createSession, loadData, saveData, getStats, recordAnswer, getQuestionStatus } from './lib/study.js';
import { getStudyPlan, getActivitySummary, recordActivity, addSessionHistory, createSessionSnapshot, sanitizeSavedSession, createBackup, parseBackup } from './lib/learning.js';
import LearningDashboard, { SessionHistory } from './components/LearningDashboard.jsx';
import './styles.css';

const PREFIX = 'morfo.uss.v1.';
const sourceUrl = page => `${window.__MORFO_SOURCE__ || new URL('source.pdf', document.baseURI).href}${page ? `#page=${page}` : ''}`;
const pad = n => String(n).padStart(2, '0');
const clock = seconds => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
const letter = i => 'ABCD'[i];
const readProgress = () => { const value = loadData(PREFIX + 'progress', {}); return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([key, record]) => /^q\d{3}$/.test(key) && record && typeof record === 'object' && !Array.isArray(record))) : {}; };
const readBookmarks = () => { const value = loadData(PREFIX + 'bookmarks', []); return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^q\d{3}$/.test(id)))] : []; };
const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function App() {
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    const request = window.__MORFO_QUESTIONS__ ? Promise.resolve(window.__MORFO_QUESTIONS__) : fetch(new URL('data/questions.json?v=anatomia-integrada-400-v3', document.baseURI), { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('No se pudo cargar el banco.');
      return r.json();
    });
    request.then(data => {
      if (!Array.isArray(data) || !data.length) throw new Error('Banco vacío');
      setQuestions(data);
    }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [retry]);
  if (!questions) return <div className="loading-screen"><Brand/><div className="loading-card"><BookOpen size={30}/><h1>{error ? 'No pudimos cargar el material.' : 'Preparando tu espacio de estudio'}</h1><p>{error ? 'Comprueba tu conexión y vuelve a intentarlo.' : 'Anatomía del miembro superior · Control II'}</p>{error ? <button className="primary" onClick={() => setRetry(n => n + 1)}>Volver a intentar <RotateCcw size={16}/></button> : <div className="loading-line"/>}</div></div>;
  return <Workspace questions={questions}/>;
}

function Workspace({ questions }) {
  const [view, setView] = useState('study');
  const [progress, setProgress] = useState(readProgress);
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const [session, setSession] = useState(null);
  const [savedSession, setSavedSession] = useState(() => sanitizeSavedSession(loadData(PREFIX + 'session', null), questions));
  const [activity, setActivity] = useState(() => {
    const value = loadData(PREFIX + 'activity', {});
    return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([day,count]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isSafeInteger(count) && count >= 0 && count <= 1_000_000)) : {};
  });
  const [goal, setGoal] = useState(() => { const value = loadData(PREFIX + 'goal', 20); return Number.isInteger(value) && value >= 5 && value <= 100 ? value : 20; });
  const [history, setHistory] = useState(() => addSessionHistory(loadData(PREFIX + 'history', []), null, questions));
  const [importPreview, setImportPreview] = useState(null);
  const [calendarNow, setCalendarNow] = useState(Date.now);

  const [selected, setSelected] = useState(null);
  const [remaining, setRemaining] = useState(DURATION);
  const [topic, setTopic] = useState('Todos los temas');
  const [size, setSize] = useState(20);
  const [mode, setMode] = useState('practice');
  const [poolKind, setPoolKind] = useState('all');
  const [format, setFormat] = useState('all');
  const [search, setSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [revealed, setRevealed] = useState([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState(null);
  const [zoomQuestion, setZoomQuestion] = useState(null);
  const [notice, setNotice] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const sessionRef = useRef(session);
  const progressRef = useRef(progress);
  const questionRef = useRef(null);
  const selectedRef = useRef(selected);
  const activityRef = useRef(activity);
  const historyRef = useRef(history);
  const importFileRef = useRef(null);
  const pendingStartRef = useRef(null);
  selectedRef.current = selected;
  activityRef.current = activity;
  historyRef.current = history;
  const topics = useMemo(() => [...new Set(questions.map(q => q.topic))], [questions]);
  const byId = useMemo(() => Object.fromEntries(questions.map(q => [q.id, q])), [questions]);
  const stats = getStats(progress, questions);
  const plan = useMemo(() => getStudyPlan(questions, progress, 20, calendarNow), [questions, progress, calendarNow]);
  const dailyActivity = getActivitySummary(activity, goal, calendarNow);
  const imageCount = questions.filter(q => !!q.image).length;
  const sessionSizes = [...new Set([10, 20, 50, 100, questions.length])];
  const matchesFormat = q => format === 'all' || (format === 'images' ? !!q.image : !q.image);
  const question = session ? byId[session.ids[session.index]] : null;
  const done = !!session && session.index >= session.ids.length;
  const feedback = session?.answers.find(a => a.id === question?.id);
  const active = !!question && !feedback && !session.paused && !session.imagePending && !done;
  sessionRef.current = session;
  progressRef.current = progress;

  useEffect(() => { if (!saveData(PREFIX + 'progress', progress)) setStorageWarning(true); }, [progress]);
  useEffect(() => { if (!saveData(PREFIX + 'bookmarks', bookmarks)) setStorageWarning(true); }, [bookmarks]);
  useEffect(() => { if (!saveData(PREFIX + 'goal', goal)) setStorageWarning(true); }, [goal]);
  useEffect(() => {
    if (session) storeSession(session, selected);
  }, [session, selected]);
  useEffect(() => {
    const persist = () => { if (sessionRef.current) storeSession(sessionRef.current, selectedRef.current); };
    const visibility = () => {
      setCalendarNow(Date.now());
      if (document.hidden) { pause(); persist(); }
    };
    const autosave = setInterval(persist, 5000);
    const calendar = setInterval(() => setCalendarNow(Date.now()), 60000);
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(autosave); clearInterval(calendar); window.removeEventListener('pagehide', persist); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const current = sessionRef.current;
      if (!current || current.paused || current.answers.some(a => a.id === current.ids[current.index])) return;
      const time = Math.max(0, Math.ceil((current.deadline - Date.now()) / 1000));
      setRemaining(time);
      if (time === 0) submit(null, true);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [active, question?.id, session?.deadline]);
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') { setModal(null); closeZoom(); setMobileNav(false); return; }
      if (modal || zoomQuestion || view !== 'study' || !question || session?.paused || (['SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(e.target.tagName) || e.target.tagName === 'INPUT' && e.target.type !== 'radio')) return;
      if (/^[1-4]$/.test(e.key) && !feedback) { e.preventDefault(); setSelected(Number(e.key) - 1); }
      if (e.key === 'Enter') { e.preventDefault(); if (feedback) next(); else if (selected !== null) submit(selected); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, question, selected, feedback, session?.paused, modal, zoomQuestion]);
  useEffect(() => {
    if (questionRef.current && session?.index > 0) questionRef.current.focus({ preventScroll: true });
  }, [question?.id]);

  const pool = questions.filter(q => matchesFormat(q) && (topic === 'Todos los temas' || q.topic === topic) && (poolKind === 'all' || poolKind === 'saved' && bookmarks.includes(q.id) || poolKind === 'errors' && progress[q.id]?.attempts && !progress[q.id]?.lastCorrect || poolKind === 'review' && ['due', 'learning'].includes(getQuestionStatus(progress, q.id))));
  const effectiveSize = Math.min(size, pool.length);
  const library = questions.filter(q => matchesFormat(q) && (topic === 'Todos los temas' || q.topic === topic) && (libraryFilter !== 'saved' || bookmarks.includes(q.id)) && (libraryFilter !== 'errors' || progress[q.id]?.attempts && !progress[q.id]?.lastCorrect) && normalize(`${q.question} ${q.topic} ${q.subtopic} ${q.id}`).includes(normalize(search)));
  const sessionCorrect = session?.answers.filter(a => a.correct).length || 0;

  function persistValue(key, value) { if (!saveData(PREFIX + key, value)) setStorageWarning(true); }
  function storeSession(value, choice = selectedRef.current) {
    const snapshot = createSessionSnapshot(value ? { ...value, selected: choice } : null);
    persistValue('session', snapshot);
    setSavedSession(snapshot ? sanitizeSavedSession(snapshot, questions) : null);
  }
  function commitSession(nextSession, choice = selectedRef.current) {
    sessionRef.current = nextSession; setSession(nextSession); storeSession(nextSession, choice);
    if (nextSession && nextSession.index >= nextSession.ids.length) {
      const updated = addSessionHistory(historyRef.current, nextSession, questions);
      historyRef.current = updated; setHistory(updated); persistValue('history', updated);
    }
  }
  function logActivity() {
    const updated = recordActivity(activityRef.current);
    activityRef.current = updated; setActivity(updated); persistValue('activity', updated); setCalendarNow(Date.now());
  }
  function resumeSavedSession() {
    const restored = sanitizeSavedSession(createSessionSnapshot(savedSession), questions);
    if (!restored) { storeSession(null); setNotice('La sesión guardada ya no está disponible. Puedes iniciar otra.'); return; }
    commitSession(restored, restored.selected); setSelected(restored.selected); setRemaining(Math.ceil(restored.timeLeft / 1000)); setView('study'); setModal(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function discardSavedSession() {
    applyExamProgress(sessionRef.current || savedSession); commitSession(null, null); setSelected(null); setModal(null); setNotice('Sesión descartada. Los intentos registrados se conservan.');
  }
  function exportProgress() {
    const data = createBackup({ progress: progressRef.current, bookmarks, activity: activityRef.current, goal, history: historyRef.current });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `Aguante-los-Medchones-USS-progreso-${new Date().toLocaleDateString('sv-SE')}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Copia de progreso descargada. Guárdala para recuperar tus datos.');
  }
  async function previewImport(file) {
    if (!file) return;
    pause();
    try {
      if (file.size > 2_000_000) throw new Error('El archivo de progreso es demasiado grande.');
      const data = parseBackup(await file.text(), questions);
      setImportPreview(data); setModal('import');
    } catch (error) { setNotice(error.message || 'No se pudo leer la copia. Tus datos actuales se conservan.'); }
  }
  function confirmImport() {
    if (!importPreview) return;
    const data = importPreview;
    progressRef.current = data.progress; setProgress(data.progress); persistValue('progress', data.progress);
    setBookmarks(data.bookmarks); persistValue('bookmarks', data.bookmarks);
    activityRef.current = data.activity; setActivity(data.activity); persistValue('activity', data.activity);
    historyRef.current = data.history; setHistory(data.history); persistValue('history', data.history);
    setGoal(data.goal); persistValue('goal', data.goal);
    commitSession(null, null); setSelected(null); setImportPreview(null); setModal(null); setView('progress'); setCalendarNow(Date.now());
    setNotice('Progreso restaurado. La copia reemplazó los datos de este navegador.');
  }
  function transferPanel() {
    return <section className="progress-transfer" aria-label="Copia de tu progreso"><div className="transfer-copy"><span className="eyebrow">TUS DATOS, CONTIGO</span><h2>Conserva lo que has avanzado.</h2><p>Descarga una copia de tu progreso, guardadas y ajustes. Puedes restaurarla en otro navegador.</p><small>El archivo no incluye la sesión en curso. Tu sesión se guarda en este navegador.</small></div><div className="transfer-actions"><button className="secondary" onClick={exportProgress}><Download size={16}/>Descargar progreso</button><button className="secondary" onClick={() => importFileRef.current?.click()}><Upload size={16}/>Restaurar progreso</button></div></section>;
  }
  function pause() {
    const current = sessionRef.current;
    if (!current || current.paused || !byId[current.ids[current.index]] || current.answers.some(a => a.id === current.ids[current.index])) return;
    const timeLeft = current.imagePending ? current.timeLeft : Math.max(0, current.deadline - Date.now());
    if (!timeLeft) { submit(null, true); return; }
    commitSession({ ...current, paused: true, timeLeft });
    setRemaining(Math.ceil(timeLeft / 1000));
  }
  function resume() {
    const current = sessionRef.current;
    if (!current?.paused) return;
    commitSession({ ...current, paused: false, deadline: Date.now() + current.timeLeft });
  }
  function navigate(nextView) { pause(); setView(nextView); setMobileNav(false); }
  function applyExamProgress(current) {
    if (!current || current.mode !== 'exam' || current.progressApplied) return current;
    let nextProgress = progressRef.current;
    for (const answer of current.answers) nextProgress = recordAnswer(nextProgress, answer.id, answer.correct);
    progressRef.current = nextProgress; setProgress(nextProgress); persistValue('progress', nextProgress);
    return { ...current, progressApplied: true };
  }
  function start(selection = pool, count = effectiveSize, chosenMode = mode, replaceSaved = false) {
    if (!selection.length || !count) { setNotice('No hay preguntas en esta selección. Prueba otro tema o filtro.'); return; }
    const unfinished = sessionRef.current && sessionRef.current.index < sessionRef.current.ids.length ? sessionRef.current : !sessionRef.current ? savedSession : null;
    if (!replaceSaved && unfinished) { pause(); pendingStartRef.current = { selection, count, chosenMode }; setModal('replace-saved'); return; }
    applyExamProgress(sessionRef.current || savedSession);
    const initial = { ...createSession(selection, count), id: globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    commitSession({ ...initial, mode: chosenMode, imagePending: !!byId[initial.ids[0]]?.image, deadline: Date.now() + DURATION * 1000, paused: false, timeLeft: DURATION * 1000 }, null);
    setSelected(null); setRemaining(DURATION); setView('study'); setMobileNav(false); setModal(null); setZoomQuestion(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function submit(choice, timeout = false) {
    const current = sessionRef.current;
    if (!current || current.paused || current.imagePending) return;
    const q = byId[current.ids[current.index]];
    if (!q || current.answers.some(a => a.id === q.id) || (!timeout && choice === null)) return;
    const expired = Date.now() >= current.deadline;
    const wasTimeout = timeout || expired;
    const answer = { id: q.id, selected: wasTimeout ? null : choice, correct: !wasTimeout && choice === q.correctIndex, timeout: wasTimeout };
    const timeLeft = Math.max(0, current.deadline - Date.now());
    logActivity();
    if (current.mode !== 'exam') {
      const nextProgress = recordAnswer(progressRef.current, q.id, answer.correct);
      progressRef.current = nextProgress; setProgress(nextProgress); persistValue('progress', nextProgress);
    }
    commitSession({ ...current, answers: [...current.answers, answer], timeLeft });
    setRemaining(Math.ceil(timeLeft / 1000));
  }
  function next() {
    const current = sessionRef.current;
    if (!current || !current.answers.some(a => a.id === current.ids[current.index])) return;
    const updated = { ...current, index: current.index + 1, imagePending: !!byId[current.ids[current.index + 1]]?.image, deadline: Date.now() + DURATION * 1000, paused: false, timeLeft: DURATION * 1000 };
    commitSession(updated.index >= updated.ids.length ? applyExamProgress(updated) : updated, null);
    setSelected(null); setRemaining(DURATION);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function newSession(kind = 'all') {
    pause();
    const current = sessionRef.current;
    if (current && current.index < current.ids.length) { storeSession(current); sessionRef.current = null; setSession(null); }
    else if (current) commitSession(null, null);
    setPoolKind(kind); setFormat('all'); setTopic('Todos los temas'); setSelected(null); setView('study'); setModal(null); setMobileNav(false);
  }
  function toggleBookmark(id) { setBookmarks(values => values.includes(id) ? values.filter(v => v !== id) : [...values, id]); }
  function openModal(name) { pause(); setModal(name); }
  function resetProgress() { setProgress({}); progressRef.current = {}; persistValue('progress', {}); setActivity({}); activityRef.current = {}; persistValue('activity', {}); setHistory([]); historyRef.current = []; persistValue('history', []); commitSession(null, null); setSelected(null); setRemaining(DURATION); setModal(null); setNotice('Progreso reiniciado. Tus preguntas guardadas y tu meta se conservan.'); }
  function showLibrary(filter = 'all', nextFormat = 'all') { setLibraryFilter(filter); setFormat(nextFormat); setTopic('Todos los temas'); setSearch(''); navigate('library'); }
  function figureReady(id) {
    const current = sessionRef.current;
    if (!current || current.ids[current.index] !== id || !current.imagePending || current.answers.some(a => a.id === id)) return;
    commitSession({ ...current, imagePending: false, deadline: Date.now() + current.timeLeft });
  }
  function figureUnavailable(id) {
    const current = sessionRef.current;
    if (!current || current.ids[current.index] !== id || current.answers.some(a => a.id === id)) return;
    const timeLeft = current.imagePending || current.paused ? current.timeLeft : Math.max(0, current.deadline - Date.now());
    commitSession({ ...current, imagePending: true, timeLeft });
    setRemaining(Math.ceil(timeLeft / 1000));
  }
  function enlargeFigure(q) { pause(); setZoomQuestion(q); }
  function closeZoom() { if (!zoomQuestion) return; setZoomQuestion(null); requestAnimationFrame(() => { if (sessionRef.current?.paused && view === 'study') document.querySelector('.paused-question .primary')?.focus(); }); }
  function chooseVisualPractice() { setFormat('images'); setTopic('Todos los temas'); setPoolKind('all'); setSize(50); document.querySelector('.session-picker')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  return <div className="app-shell">
    <input ref={importFileRef} type="file" accept="application/json,.json" aria-label="Archivo de progreso" hidden onChange={event => { previewImport(event.target.files?.[0]); event.target.value = ''; }}/>
    <a href="#main-content" className="skip-link">Ir al contenido</a>
    {mobileNav && <button className="nav-backdrop" aria-label="Cerrar menú" onClick={() => setMobileNav(false)}/>}
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <Brand/>
      <div className="workspace-label">TU ESPACIO DE ESTUDIO</div>
      <nav aria-label="Navegación principal">
        <button className={`nav-item ${view === 'study' ? 'active' : ''}`} onClick={() => navigate('study')}><BookOpen size={18}/>Estudiar<span className="nav-indicator"/></button>
        <button className={`nav-item ${view === 'library' ? 'active' : ''}`} onClick={() => showLibrary()}><Grid2X2 size={18}/>Banco de preguntas<span className="nav-count">{questions.length}</span></button>
        <button className={`nav-item ${view === 'progress' ? 'active' : ''}`} onClick={() => navigate('progress')}><TrendingUp size={18}/>Mi progreso</button>
      </nav>
      <div className="sidebar-divider"/>
      <div className="workspace-label">MI COLECCIÓN</div>
      <button className="collection-link" onClick={() => showLibrary('saved')}><Bookmark size={17}/><span>Preguntas guardadas</span><small>{bookmarks.length}</small></button>
      <button className="collection-link" onClick={() => showLibrary('errors')}><RotateCcw size={17}/><span>Volver a practicar</span><small>{questions.filter(q => progress[q.id]?.attempts && !progress[q.id]?.lastCorrect).length}</small></button>
      <div className="sidebar-note"><div className="note-rule"/><span>MORFOLOGÍA INTEGRADA I</span><h3>La anatomía <br/>se comprende <br/>y se practica.</h3><p>Miembro superior <br/>Material de estudio · Control II</p><div className="note-orbit"><i/><i/><i/><i/></div></div>
      <div className="sidebar-bottom"><a href={sourceUrl()} target="_blank" rel="noreferrer"><FileText size={16}/>Consultar material PDF<ArrowUpRight size={14}/></a><button onClick={() => openModal('help')}><CircleHelp size={16}/>Cómo estudiar aquí</button><div className="sidebar-signature"><div className="signature-icon">V</div><div><strong>developed by vizdiego</strong><small>Un espacio para aprender.</small></div></div></div>
    </aside>
    <div className="main-wrapper">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Abrir menú" aria-expanded={mobileNav} onClick={() => { pause(); setMobileNav(true); }}><Menu size={21}/></button><GraduationCap size={17}/><span>Morfología I</span><ChevronRight size={12}/><strong>{view === 'study' ? 'Estudiar' : view === 'library' ? 'Banco de preguntas' : 'Mi progreso'}</strong></div><div className="topbar-right"><span className="private-label"><span/>{storageWarning ? 'Guardado no disponible' : session && !done ? 'Sesión guardada en este navegador' : 'Progreso en este dispositivo'}</span><button className="icon-button help-icon" onClick={() => openModal('help')} aria-label="Ayuda"><CircleHelp size={18}/></button></div></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">AGUANTE LOS MEDCHONES USS <span> / </span> CONTROL II</div><h1>{view === 'study' ? session ? done ? 'Cada intento cuenta.' : 'Una pregunta a la vez.' : 'Aguante los Medchones USS' : view === 'library' ? 'Tu banco de conocimiento.' : 'Lo que ya estás construyendo.'}</h1><p>{view === 'study' ? session ? 'Observa, relaciona y elige la mejor respuesta.' : 'Tu estudio de anatomía, organizado para avanzar.' : view === 'library' ? 'Explora los temas, guarda lo importante y repasa a tu ritmo.' : 'Un registro de tu práctica para enfocar el próximo repaso.'}</p></div>{session && view === 'study' ? <button className="secondary heading-action" onClick={() => newSession()}><RotateCcw size={15}/>Nueva sesión</button> : <a className="source-link" href={sourceUrl()} target="_blank" rel="noreferrer"><FileText size={15}/>Material de estudio<ArrowUpRight size={14}/></a>}</div>
        {storageWarning && <div className="storage-warning" role="status"><ShieldCheck size={17}/><span>El navegador no permite guardar datos. Puedes estudiar, pero el progreso podría perderse al cerrar esta página.</span></div>}
        {view === 'study' && !session && <>
          <div className="overview-strip"><div><Layers size={19}/><strong>{questions.length}</strong><span>preguntas originales</span></div><div><Clock3 size={19}/><strong>01:30</strong><span>por pregunta</span></div><div><Target size={19}/><strong>{topics.length}</strong><span>áreas de estudio</span></div><div><CheckCheck size={19}/><strong>Con fundamento</strong><span>respuestas explicadas</span></div></div>
          <LearningDashboard plan={plan} activity={dailyActivity} goal={goal} onGoalChange={setGoal} onRecommended={() => start(plan.questions, plan.questions.length, 'practice')} onReview={() => newSession('review')} onImages={chooseVisualPractice} onWeakTopic={chosenTopic => { const selection = questions.filter(q => q.topic === chosenTopic); start(selection, Math.min(20, selection.length), 'practice'); }} savedSession={savedSession} onResume={resumeSavedSession} onDiscardSession={() => setModal('discard-saved')} history={history}/>
          <section className="session-picker" id="configure-session"><div className="picker-main"><div className="section-label"><span className="small-number">01</span>CONFIGURA TU SESIÓN</div><h2>Tu próximo repaso <br/>empieza aquí.</h2><p className="picker-description">Preguntas de anatomía del miembro superior, desde la osteología hasta la integración clínica.</p>
            <div className="picker-filters"><label>Área de estudio<select value={topic} onChange={e => setTopic(e.target.value)}>{['Todos los temas', ...topics].map(t => <option key={t}>{t}</option>)}</select></label><label>Selección<select value={poolKind} onChange={e => setPoolKind(e.target.value)}><option value="all">Todas las preguntas</option><option value="saved">Preguntas guardadas</option><option value="errors">Respuestas por corregir</option><option value="review">Repasos pendientes</option></select></label><label>Formato de preguntas<select aria-label="Formato de preguntas" value={format} onChange={e => setFormat(e.target.value)}><option value="all">Todas · {questions.length}</option><option value="images">Con imagen · {imageCount}</option><option value="text">Solo texto · {questions.length - imageCount}</option></select></label></div>
            <fieldset className="session-options"><legend>¿Cuántas preguntas quieres practicar?</legend>{sessionSizes.map(n => <label className={`session-option ${size === n ? 'selected' : ''}`} key={n}><input type="radio" name="session-size" value={n} checked={size === n} onChange={() => setSize(n)}/><span className="option-check">{size === n && <Check size={10}/>}</span><strong>{n}</strong><span>preguntas</span><small>{n === 10 ? 'Breve' : n === 20 ? 'Enfocado' : n === 50 ? 'Completo' : n === 100 ? 'Intensivo' : 'Todo el banco'}</small></label>)}</fieldset>
            <fieldset className="mode-options"><legend>Forma de estudio</legend><label className={mode === 'practice' ? 'chosen' : ''}><input type="radio" name="study-mode" checked={mode === 'practice'} onChange={() => setMode('practice')}/><BookOpen size={17}/><span><strong>Práctica guiada</strong><small>Corrección tras cada respuesta</small></span></label><label className={mode === 'exam' ? 'chosen' : ''}><input type="radio" name="study-mode" checked={mode === 'exam'} onChange={() => setMode('exam')}/><Target size={17}/><span><strong>Simulacro</strong><small>Revisa todo al finalizar</small></span></label></fieldset>
            <div className="picker-summary"><ShuffleMark/><span>{effectiveSize ? <><strong>{effectiveSize} {effectiveSize === 1 ? 'pregunta' : 'preguntas'}</strong> al azar, sin repetir{effectiveSize < size ? ` · ${pool.length} ${pool.length === 1 ? 'disponible' : 'disponibles'} en este filtro` : ''}.</> : 'No hay preguntas con estos filtros. Cambia tu selección.'}</span></div><button className="primary start-session-button" disabled={!effectiveSize} onClick={() => start()}>Comenzar sesión<ArrowRight size={18}/></button><p className="picker-footnote">El reloj comienza al iniciar. Puedes pausar cuando lo necesites.</p>
          </div><aside className="picker-aside"><div className="anatomy-art"><AnatomyIllustration/><span className="art-caption">ANATOMÍA DEL MIEMBRO SUPERIOR</span></div><div className="aside-rule"/><span className="eyebrow">DEL CONCEPTO A LA APLICACIÓN</span><h3>Más que memorizar. <br/>Aprende a relacionar.</h3><p>Conceptos, relaciones funcionales y casos clínicos breves basados en tu material de estudio.</p><ul><li><Check size={15}/>Una mejor respuesta por pregunta</li><li><Check size={15}/>Fundamento y página del material</li><li><Check size={15}/>Progreso y guardadas en tu equipo</li></ul><a href={sourceUrl()} target="_blank" rel="noreferrer">Consultar el material original<ArrowUpRight size={15}/></a></aside></section>
          <section className="topics-section"><div className="section-heading"><div><span className="eyebrow">UN MAPA PARA TU REPASO</span><h2>De la estructura a la función.</h2></div><button className="text-button" onClick={() => showLibrary()}>Explorar el banco<ArrowRight size={15}/></button></div><div className="topic-grid">{topics.map((t, i) => <button className="topic-card" key={t} onClick={() => { setTopic(t); setPoolKind('all'); window.scrollTo({ top: 100, behavior: 'smooth' }); }}><span className="topic-number">{pad(i + 1)}</span><strong>{t}</strong><span>{questions.filter(q => q.topic === t).length} preguntas<ArrowUpRight size={14}/></span></button>)}</div></section>
        </>}
        {view === 'study' && session && !done && question && <div className="study-layout"><div className="study-column"><article className="question-card"><header className="question-toolbar"><div><span className="question-icon"><BookOpen size={16}/></span><strong>Pregunta {pad(session.index + 1)}</strong><span>de {session.ids.length}</span></div><button className={`icon-button ${bookmarks.includes(question.id) ? 'bookmarked' : ''}`} aria-label={bookmarks.includes(question.id) ? 'Quitar de guardadas' : 'Guardar pregunta'} aria-pressed={bookmarks.includes(question.id)} onClick={() => toggleBookmark(question.id)}><Bookmark size={19} fill={bookmarks.includes(question.id) ? 'currentColor' : 'none'}/></button></header>
          {session.paused && !feedback ? <div className="paused-question"><span><Pause size={28}/></span><div className="eyebrow">EL TIEMPO ESTÁ DETENIDO</div><h2>Una pausa también ayuda.</h2><p>La pregunta está oculta mientras descansas. <br/>Continúa cuando estés listo.</p><button className="primary" onClick={resume}><Play size={16}/>Reanudar pregunta</button></div> : <div className="question-body"><div className="question-tags"><span>{question.topic}</span><span>{question.difficulty}</span><span>{question.type}</span>{question.image && <span className="visual-question-tag"><ImageIcon size={12}/>Con imagen</span>}</div>{question.image && <QuestionFigure key={question.id} question={question} onZoom={() => enlargeFigure(question)} onReady={() => figureReady(question.id)} onUnavailable={() => figureUnavailable(question.id)}/>}<span className="question-subtopic">{question.subtopic}</span><h2 ref={questionRef} tabIndex={-1}>{question.question}</h2><fieldset className="answer-options" disabled={!!feedback || session.imagePending}><legend>Selecciona la mejor respuesta</legend>{question.options.map((option, i) => { const showResult = feedback && session.mode === 'practice'; return <label className={`answer-option ${selected === i ? 'selected' : ''} ${showResult && i === question.correctIndex ? 'is-correct' : ''} ${showResult && feedback.selected === i && !feedback.correct ? 'is-incorrect' : ''}`} key={`${question.id}-${i}`}><input type="radio" name={`answer-${question.id}`} checked={selected === i} onChange={() => setSelected(i)}/><span className="option-letter">{letter(i)}</span><span>{option}</span>{showResult && i === question.correctIndex && <Check size={18}/>} {showResult && feedback.selected === i && !feedback.correct && <X size={18}/>}</label>; })}</fieldset>
            {feedback && <div className={`feedback ${session.mode === 'exam' ? 'feedback-neutral' : feedback.correct ? 'feedback-correct' : 'feedback-incorrect'}`} role="status"><div className="feedback-title">{session.mode === 'exam' ? <CheckCheck size={18}/> : feedback.correct ? <Check size={19}/> : <XCircle size={18}/>}<strong>{feedback.timeout ? 'Tiempo agotado' : session.mode === 'exam' ? 'Respuesta registrada' : feedback.correct ? 'Respuesta correcta' : 'Una oportunidad para comprender'}</strong></div>{session.mode === 'practice' ? <><p className="official-answer">{letter(question.correctIndex)}. {question.options[question.correctIndex]}</p><p>{question.explanation}</p><SourceLink question={question}/></> : <p>La explicación y la respuesta correcta estarán disponibles al finalizar el simulacro.</p>}</div>}
            <div className="question-footer"><span className="keyboard-hint"><kbd>1</kbd>–<kbd>4</kbd> elegir <span>·</span> <kbd>↵</kbd> confirmar</span>{feedback ? <button className="primary" onClick={next}>{session.index === session.ids.length - 1 ? 'Ver resultados' : 'Siguiente pregunta'}<ArrowRight size={17}/></button> : <button className="primary" disabled={selected === null || session.imagePending} onClick={() => submit(selected)}>Confirmar respuesta<ArrowRight size={17}/></button>}</div>
          </div>}</article><p className="study-caption"><ShieldCheck size={13}/>Preguntas originales basadas en el material proporcionado.<span>{session.mode === 'exam' ? 'SIMULACRO' : 'PRÁCTICA GUIADA'}</span></p></div>
          <aside className="session-rail"><section className={`timer-card ${remaining <= 15 && active ? 'urgent' : ''}`}><div className="rail-heading"><Clock3 size={16}/>Tiempo disponible<span>01:30</span></div><div className="timer-visual"><svg viewBox="0 0 180 180" aria-hidden="true"><circle className="timer-track" cx="90" cy="90" r="76"/><circle className="timer-progress" cx="90" cy="90" r="76" strokeDasharray={478} strokeDashoffset={478 * (1 - remaining / DURATION)}/></svg><div className="timer-digits" role="timer" aria-label={`${remaining} segundos restantes`}><strong>{clock(remaining)}</strong><small>{feedback ? 'respuesta registrada' : session.paused ? 'en pausa' : session.imagePending ? 'esperando imagen' : 'para esta pregunta'}</small></div></div><button className="pause-button" onClick={session.paused ? resume : pause} disabled={!!feedback}>{session.paused ? <Play size={14}/> : <Pause size={14}/>} {session.paused ? 'Reanudar sesión' : 'Pausar sesión'}</button><p>Lee con calma. <br/>Relaciona antes de responder.</p></section><section className="session-progress-card"><div className="rail-heading"><Target size={16}/>Esta sesión<span>{Math.round(session.answers.length / session.ids.length * 100)}%</span></div><div className="progress-amount"><strong>{session.answers.length}</strong><span>/ {session.ids.length} preguntas</span></div><ProgressBar value={session.answers.length / session.ids.length * 100}/><p>{session.ids.length - session.answers.length} por responder</p><div className="session-mini-stats"><div><strong>{session.mode === 'exam' ? '—' : sessionCorrect}</strong><span>correctas</span></div><div><strong>{session.mode === 'exam' ? 'Al finalizar' : `${session.answers.length ? Math.round(sessionCorrect / session.answers.length * 100) : 0}%`}</strong><span>precisión</span></div></div></section><div className="study-note"><span>UNA IDEA PARA ESTUDIAR</span><p>Antes de elegir, relaciona la estructura con su función y su inervación.</p></div></aside></div>}
        {view === 'study' && done && <section className="results-view"><div className="results-card"><div className="result-icon"><CheckCheck size={30}/></div><div className="eyebrow">SESIÓN COMPLETADA</div><h2>Hoy sabes un poco más.</h2><p>Revisa tus respuestas y vuelve sobre lo que necesita otro encuentro.</p><div className="result-metrics"><div><strong>{sessionCorrect}<small> / {session.ids.length}</small></strong><span>respuestas correctas</span></div><div><strong>{Math.round(sessionCorrect / session.ids.length * 100)}<small>%</small></strong><span>precisión en esta sesión</span></div></div><div className="result-actions"><button className="primary" onClick={() => start(session.answers.filter(a => !a.correct).map(a => byId[a.id]), session.ids.length - sessionCorrect, 'practice')} disabled={sessionCorrect === session.ids.length}><RotateCcw size={16}/>Repasar errores ({session.ids.length - sessionCorrect})</button><button className="secondary" onClick={() => newSession()}>Configurar otra sesión<ArrowRight size={16}/></button></div></div><div className="section-heading"><h2>Tu sesión, pregunta por pregunta.</h2><span className="result-legend">Abre cada pregunta para revisar su fundamento.</span></div><div className="review-list">{session.answers.map((a, i) => <details key={a.id} className="review-item"><summary><span className={`review-status ${a.correct ? 'correct' : 'incorrect'}`}>{a.correct ? <Check size={16}/> : <X size={16}/>}</span><span><small>{pad(i + 1)} · {byId[a.id].topic}{a.timeout ? ' · Tiempo agotado' : ''}</small>{byId[a.id].question}</span><ChevronRight size={17}/></summary><div className="review-content">{byId[a.id].image && <QuestionFigure key={a.id} question={byId[a.id]} onZoom={() => enlargeFigure(byId[a.id])} compact/>}<p><strong>Tu respuesta:</strong> {a.selected === null ? 'Sin respuesta (tiempo agotado)' : byId[a.id].options[a.selected]}</p><p><strong>Respuesta correcta:</strong> {byId[a.id].options[byId[a.id].correctIndex]}</p><p>{byId[a.id].explanation}</p><SourceLink question={byId[a.id]}/></div></details>)}</div></section>}
        {view === 'library' && <section className="library-view"><div className="library-toolbar"><div className="library-tabs">{[['all', 'Todas', questions.length], ['saved', 'Guardadas', bookmarks.length], ['errors', 'Por corregir', questions.filter(q => progress[q.id]?.attempts && !progress[q.id]?.lastCorrect).length]].map(([id, name, count]) => <button className={libraryFilter === id ? 'selected' : ''} key={id} onClick={() => setLibraryFilter(id)}>{name}<span>{count}</span></button>)}</div><button className="primary" disabled={!library.length} onClick={() => start(library, Math.min(20, library.length), 'practice')}><Play size={15}/>Practicar selección</button></div><div className="search-controls"><label className="search-field"><Search size={18}/><input aria-label="Buscar preguntas" placeholder="Busca un concepto, una estructura o un tema…" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button className="icon-button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}><X size={15}/></button>}</label><label className="topic-filter"><ListFilter size={16}/><select aria-label="Filtrar banco por tema" value={topic} onChange={e => setTopic(e.target.value)}>{['Todos los temas', ...topics].map(t => <option key={t}>{t}</option>)}</select></label><label className="format-filter"><ImageIcon size={16}/><select aria-label="Filtrar banco por formato" value={format} onChange={e => setFormat(e.target.value)}><option value="all">Todos los formatos</option><option value="images">Con imagen ({imageCount})</option><option value="text">Solo texto ({questions.length - imageCount})</option></select></label></div><p className="library-count">{library.length} {library.length === 1 ? 'pregunta' : 'preguntas'} en esta selección</p><div className="library-grid">{library.map(q => <article className="library-card" key={q.id}><div className="library-card-top"><span className="question-id">{q.id.replace('q', '#')}</span><span className={`status-dot ${getQuestionStatus(progress, q.id)}`}/><span className="library-status">{{ new: 'Por descubrir', learning: 'En práctica', learned: 'Aprendida', due: 'Para repasar' }[getQuestionStatus(progress, q.id)]}</span><button className={`icon-button ${bookmarks.includes(q.id) ? 'bookmarked' : ''}`} aria-label={`${bookmarks.includes(q.id) ? 'Quitar de guardadas' : 'Guardar'} pregunta ${q.id}`} aria-pressed={bookmarks.includes(q.id)} onClick={() => toggleBookmark(q.id)}><Bookmark size={17} fill={bookmarks.includes(q.id) ? 'currentColor' : 'none'}/></button></div>{q.image && <QuestionFigure key={q.id} question={q} onZoom={() => enlargeFigure(q)} compact/>}<span className="question-subtopic">{q.topic} · {q.subtopic}</span><h3>{q.question}</h3><div className="library-meta"><span>{q.difficulty}</span><span>{q.type}</span></div>{revealed.includes(q.id) && <div className="library-answer"><strong>{q.options[q.correctIndex]}</strong><p>{q.explanation}</p><SourceLink question={q}/></div>}<div className="library-card-footer"><button className="text-button" aria-expanded={revealed.includes(q.id)} onClick={() => setRevealed(ids => ids.includes(q.id) ? ids.filter(id => id !== q.id) : [...ids, q.id])}>{revealed.includes(q.id) ? 'Ocultar respuesta' : 'Ver respuesta'}<ChevronRight size={14}/></button><button className="text-button" onClick={() => start([q], 1, 'practice')}>Practicar<ArrowUpRight size={14}/></button></div></article>)}</div>{!library.length && <EmptyState title="Aquí todavía no hay preguntas." text="Prueba otra búsqueda o guarda preguntas desde una sesión para encontrarlas aquí."/>}</section>}
        {view === 'progress' && <section className="progress-view"><div className="metric-grid"><Metric icon={<CheckCheck size={19}/>} value={`${stats.mastered} / ${questions.length}`} label="Preguntas aprendidas" detail="Última respuesta correcta"/><Metric icon={<Target size={19}/>} value={stats.answered ? `${stats.accuracy}%` : '—'} label="Precisión acumulada" detail="Sobre todos tus intentos"/><Metric icon={<RotateCcw size={19}/>} value={stats.due} label="Repasos pendientes" detail="Vencidas o en aprendizaje"/><Metric icon={<Layers size={19}/>} value={stats.answered} label="Intentos registrados" detail="Cada práctica suma"/></div><div className="progress-content"><div className="topic-progress"><span className="eyebrow">TU MAPA DE APRENDIZAJE</span><h2>Un tema a la vez.</h2><p>Preguntas con la última respuesta correcta, por área.</p>{topics.map(t => { const all = questions.filter(q => q.topic === t); const learned = all.filter(q => progress[q.id]?.lastCorrect).length; return <div className="topic-progress-row" key={t}><div><strong>{t}</strong><span>{learned}<small> / {all.length}</small></span></div><ProgressBar value={learned / all.length * 100}/></div>; })}</div><div className="review-panel"><span className="review-symbol"><RotateCcw size={30}/></span><div className="eyebrow">RECORDAR ES VOLVER</div><h2>El siguiente repaso <br/>hace la diferencia.</h2><p>Las respuestas correctas se programan para repasar en 1, 3, 7, 14 y 30 días. Las incorrectas quedan disponibles para volver a practicar.</p><button className="primary" disabled={!stats.due} onClick={() => newSession('review')}><RotateCcw size={16}/>Repasar pendientes{stats.due > 0 ? ` (${stats.due})` : ''}</button><button className="text-button" onClick={() => newSession('all')}>Comenzar una sesión nueva<ArrowRight size={14}/></button><div className="local-note"><ShieldCheck size={17}/><p>Tu progreso se guarda solo en este navegador. No se sincroniza entre dispositivos.</p></div></div></div><div className="progress-bottom"><span>Las guardadas y el progreso se conservan al recargar.</span><button className="text-button danger-text" onClick={() => openModal('reset')}>Reiniciar mi progreso</button></div></section>}
        {view === 'study' && !session && transferPanel()}
        {view === 'progress' && <><SessionHistory history={history}/>{transferPanel()}</>}
        <footer className="page-footer"><span><Layers size={14}/>Aguante los Medchones USS<span className="footer-dot">·</span><strong>developed by vizdiego</strong></span><span>Recurso de estudio independiente · Sin afiliación institucional</span></footer>
      </main>
    </div>
    {notice && <div className="toast" role="status"><Check size={18}/><span>{notice}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={16}/></button></div>}
    {modal === 'discard-saved' && <Modal title="¿Descartar la sesión guardada?" onClose={() => setModal(null)}><p className="modal-intro">Podrás comenzar otra sesión. Los intentos que ya respondiste se conservarán en tu progreso.</p><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Conservar sesión</button><button className="primary" onClick={discardSavedSession}>Descartar sesión</button></div></Modal>}
    {modal === 'replace-saved' && <Modal title="Tienes una sesión sin terminar." onClose={() => { pendingStartRef.current = null; setModal(null); }}><p className="modal-intro">Iniciar otra reemplazará la sesión guardada. Los intentos enviados se conservarán. También puedes volver y retomarla.</p><div className="modal-actions"><button className="secondary" onClick={() => { pendingStartRef.current = null; setModal(null); }}>Volver</button><button className="primary" onClick={() => { const pending = pendingStartRef.current; pendingStartRef.current = null; if (pending) start(pending.selection, pending.count, pending.chosenMode, true); }}>Iniciar otra sesión</button></div></Modal>}
    {modal === 'import' && importPreview && <Modal title="¿Restaurar esta copia de progreso?" onClose={() => { setImportPreview(null); setModal(null); }}><p className="modal-intro">La copia contiene {Object.keys(importPreview.progress).length} preguntas practicadas, {importPreview.bookmarks.length} guardadas y {importPreview.history.length} sesiones completadas. Reemplazará el progreso, la actividad y los ajustes de este navegador; la sesión en curso se cerrará.</p><div className="modal-actions"><button className="secondary" onClick={() => { setImportPreview(null); setModal(null); }}>Conservar mis datos</button><button className="primary" onClick={confirmImport}>Restaurar esta copia</button></div></Modal>}
    {zoomQuestion && <Modal wide onClose={closeZoom} title="Imagen de la pregunta"><QuestionFigure key={zoomQuestion.id} question={zoomQuestion} enlarged/><p className="zoom-pause-note">{session && !done ? <><Pause size={14}/>El reloj está detenido. Al cerrar, reanuda la sesión cuando quieras continuar.</> : <><Maximize2 size={14}/>Usa los controles para ampliar y desliza para observar los detalles.</>}</p></Modal>}
    {['help', 'reset', 'restart'].includes(modal) && <Modal onClose={() => setModal(null)} title={modal === 'help' ? 'Una forma de estudiar mejor.' : modal === 'reset' ? '¿Reiniciar tu progreso?' : '¿Comenzar una sesión nueva?'}>{modal === 'help' ? <><p className="modal-intro">{questions.length} preguntas originales, incluidas {imageCount} con imágenes, para practicar la anatomía del miembro superior a partir del material de Control II que proporcionaste.</p><ol className="help-steps"><li><span>01</span><div><h3>Elige qué repasar</h3><p>Filtra por área y por formato: preguntas con imagen, solo texto o una mezcla. Elige cuántas quieres e inicia una sesión aleatoria sin repeticiones.</p></div></li><li><span>02</span><div><h3>Relaciona y responde</h3><p>Tienes 1 minuto y 30 segundos por pregunta. Elige una de cuatro alternativas y confirma. Pausar oculta la pregunta y su figura, y detiene el reloj. Ampliar una imagen también pausa la sesión; reanúdala cuando termines de observar.</p></div></li><li><span>03</span><div><h3>Comprende el fundamento</h3><p>En práctica guiada, la explicación aparece al responder; en simulacro, al finalizar. Puedes avanzar aunque falles y luego repetir tus errores.</p></div></li><li><span>04</span><div><h3>Continúa y conserva tus avances</h3><p>La sesión se guarda en este navegador y puedes retomarla en pausa al volver. Descarga una copia de tu progreso para restaurarlo en otro navegador.</p></div></li></ol><div className="help-note"><FileText size={19}/><p>Cada pregunta enlaza las páginas del PDF que la fundamentan. Las preguntas son material de práctica creado para este recurso; no corresponden a una evaluación oficial ni tienen afiliación institucional.</p></div><a className="secondary full-width" href={new URL('sources.html', document.baseURI).href} target="_blank" rel="noreferrer">Ver fuentes y criterios del banco<ArrowUpRight size={16}/></a><button className="primary full-width" onClick={() => setModal(null)}>Volver al estudio<ArrowRight size={16}/></button></> : modal === 'reset' ? <><p className="modal-intro">Se eliminarán los intentos, la precisión, la actividad y el historial de sesiones de este navegador. Tus preguntas guardadas y tu meta se conservan.</p><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Conservar progreso</button><button className="primary danger-button" onClick={resetProgress}>Reiniciar progreso</button></div></> : <><p className="modal-intro">Cerrarás la sesión actual. Los intentos ya registrados se conservarán en tu progreso.</p><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Continuar aquí</button><button className="primary" onClick={() => newSession()}>Nueva sesión<ArrowRight size={15}/></button></div></>}</Modal>}
  </div>;
}

function QuestionFigure({ question, onZoom, onReady, onUnavailable, compact = false, enlarged = false }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [ratio, setRatio] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const embedded = window.__MORFO_IMAGES__?.[question.image];
  const source = embedded || new URL(question.image, document.baseURI).href;
  const src = attempt && !embedded ? `${source}${source.includes('?') ? '&' : '?'}image-retry=${attempt}` : source;
  const markers = Array.isArray(question.imageMarkers) ? question.imageMarkers : [];
  const image = <div className="figure-image-wrap figure-canvas" style={compact ? { maxWidth: ratio ? Math.min(340, 215 * ratio) : 215 } : enlarged ? { width: `${zoomScale * 100}%`, maxWidth: 'none' } : undefined}>
    <img src={src} alt={question.imageAlt || 'Figura anatómica del material de Control II.'} loading={compact ? 'lazy' : 'eager'} decoding="async" onLoad={e => { setLoaded(true); setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight); onReady?.(); }} onError={() => { setFailed(true); onUnavailable?.(); }}/>
    {loaded && markers.map((marker, i) => <span key={`${marker.label}-${i}`} className={`figure-marker ${marker.x > 85 ? 'marker-label-left' : ''} ${marker.y < 10 ? 'marker-label-below' : ''}`} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} aria-hidden="true"><i/><b>{marker.label}</b></span>)}
  </div>;
  return <figure className={`question-figure ${compact ? 'compact-figure' : ''} ${enlarged ? 'enlarged-figure' : ''}`}>
    {enlarged && !failed && <div className="figure-zoom-controls"><div><button className="secondary" aria-label="Reducir zoom" disabled={zoomScale <= 1} onClick={() => setZoomScale(value => Math.max(1, value - .5))}>−</button><span aria-live="polite">{Math.round(zoomScale * 100)}%</span><button className="secondary" aria-label="Aumentar zoom" disabled={zoomScale >= 3} onClick={() => setZoomScale(value => Math.min(3, value + .5))}>+</button></div><p>Desliza para recorrer la imagen ampliada.</p></div>}
    {failed ? <div className="figure-error" role="status"><ImageIcon size={25}/><strong>No pudimos cargar esta figura.</strong><p>Necesitas verla para responder. Reintenta o consulta la página del material.</p>{attempt < 1 && <button className="secondary" onClick={() => { setFailed(false); setLoaded(false); setAttempt(1); }}><RotateCcw size={14}/>Reintentar imagen</button>}<SourceLink question={question}/></div> : onZoom ? <button type="button" className="figure-stage" onClick={onZoom} aria-label="Ampliar imagen de la pregunta" data-question-id={question.id}>{image}<span className="figure-expand"><Maximize2 size={14}/>{compact ? 'Ampliar' : 'Ampliar imagen'}</span></button> : <div className="figure-stage">{image}</div>}
    <figcaption><span>{question.imageCaption || 'Figura del material de estudio de Control II.'}</span>{question.imageCredit && <small>{question.imageCredit}</small>}</figcaption>
  </figure>;
}

function Brand() { return <div className="brand medchones-brand"><span className="brand-mark"><Layers size={25}/></span><span>Aguante los<strong>Medchones USS<span className="brand-dot">.</span></strong></span></div>; }
function SourceLink({ question }) { return <a className="question-source" href={sourceUrl(question.sourcePages[0])} target="_blank" rel="noreferrer"><FileText size={14}/>Material de estudio · {question.sourcePages.length === 1 ? 'página' : 'páginas'} {question.sourcePages.join(', ')} del PDF<ArrowUpRight size={13}/></a>; }
function ProgressBar({ value }) { return <div className="progress-track" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso"><span style={{ width: `${value}%` }}/></div>; }
function Metric({ icon, value, label, detail }) { return <div className="metric-card"><span>{icon}</span><strong>{value}</strong><h3>{label}</h3><p>{detail}</p></div>; }
function EmptyState({ title, text }) { return <div className="empty-state"><BookOpen size={35}/><h2>{title}</h2><p>{text}</p></div>; }
function ShuffleMark() { return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5h2c4 0 5 10 9 10h3m-3-3 3 3-3 3M3 15h2c2 0 3-2 4-5m2-3c1-1 2-2 3-2h3m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function AnatomyIllustration() { return <svg className="anatomy-svg" viewBox="0 0 300 235" fill="none" aria-hidden="true"><defs><pattern id="art-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0v20" stroke="#c8d0bb" strokeWidth=".5"/></pattern><linearGradient id="bone-fill" x1="96" y1="20" x2="213" y2="210" gradientUnits="userSpaceOnUse"><stop stopColor="#fafbf5"/><stop offset="1" stopColor="#d5ddc6"/></linearGradient></defs><rect width="300" height="235" fill="url(#art-grid)" opacity=".5"/><circle cx="154" cy="106" r="88" stroke="#b9c7a3" strokeDasharray="3 6"/><circle cx="154" cy="106" r="68" stroke="#d5ddc8"/><path d="M51 61c19-11 32-15 56-11 15 3 28 9 42 8 18 0 31-7 43-1 6 3 7 8 2 11-10 4-24 0-39 2-22 2-32-9-50-10-17-1-34 8-49 9-8 1-13-3-5-8Z" fill="url(#bone-fill)" stroke="#8c9f75" strokeWidth="1.4"/><path d="m94 68-15 8c-10 11-8 37-11 54-2 18-6 35 2 46 6 6 10 0 16-7l64-69c6-7 1-20-6-23l-14-8c-12-5-24-6-36-1Z" fill="url(#bone-fill)" stroke="#8c9f75" strokeWidth="1.4"/><path d="m78 90 52-12-44 55m4-52-6 80m42-82c-7 12-21 20-29 35" stroke="#a8b996" strokeWidth="1.2"/><path d="M138 69c8-10 21-10 29-3l9 10c5 6 2 16-2 24-5 10-7 23-5 36l9 49c3 8 8 10 8 17 0 5-4 8-8 8-6 0-8-6-12-5-5 1-7 6-12 4-5-1-6-8-3-13l6-10-3-49c-1-18-6-26-14-39-7-10-9-18-2-29Z" fill="url(#bone-fill)" stroke="#8c9f75" strokeWidth="1.4"/><path d="M140 72c5 4 13 6 22 4m-18 14 16 4m-6 6c9 17 9 36 11 57l5 31m-12 6 12 3m-11 2 13 3" stroke="#a8b996" strokeWidth="1.1"/><path d="M105 49V28h-37m111 71h52v-9m-62 69h55v21M83 148H45v-19" stroke="#a4b18f" strokeWidth=".8"/><circle cx="105" cy="49" r="2" fill="#829565"/><circle cx="179" cy="99" r="2" fill="#829565"/><circle cx="169" cy="159" r="2" fill="#829565"/><circle cx="83" cy="148" r="2" fill="#829565"/><text x="39" y="23" fontSize="8" fill="#869474" letterSpacing="1.2">CINTURA ESCAPULAR</text><text x="218" y="84" fontSize="8" fill="#869474" letterSpacing="1.2">HOMBRO</text><text x="214" y="192" fontSize="8" fill="#869474" letterSpacing="1.2">BRAZO</text><text x="22" y="122" fontSize="8" fill="#869474" letterSpacing="1.2">ESCÁPULA</text><text x="234" y="222" fontSize="7" fill="#a8b297" letterSpacing="1">FIG. 01</text></svg>; }
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const handle = e => {
      if (e.key !== 'Tab') return;
      const nodes = [...ref.current.querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"]')];
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handle);
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handle); document.body.style.overflow = old; previous?.focus?.(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section ref={ref} className={`modal ${wide ? 'figure-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}><header><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Cerrar diálogo" onClick={onClose}><X size={20}/></button></header>{children}</section></div>;
}
