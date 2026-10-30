import { ArrowRight, ArrowUpRight, BookOpen, Check, Clock3, Image as ImageIcon, Play, RotateCcw, Target, TrendingUp } from 'lucide-react';
import '../learning.css';

const number = value => Math.max(0, Number(value) || 0);
const plural = (value, singular, multiple) => `${value} ${value === 1 ? singular : multiple}`;
const formatDate = value => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(date) : 'Sesión anterior';
};

export function LearningDashboard({
  plan = {}, activity = {}, goal = 20, onGoalChange, onRecommended, onReview, onImages,
  onWeakTopic, savedSession, onResume, onDiscardSession, history,
}) {
  const recommendationCount = Array.isArray(plan.questions) ? plan.questions.length : 0;
  const pendingCount = number(plan.dueCount) + number(plan.errorCount);
  const today = number(activity.todayCount);
  const currentGoal = Math.max(1, number(goal) || 20);
  const goalPercent = Math.min(100, Math.round(today / currentGoal * 100));
  const completedGoal = today >= currentGoal;
  const weakTopics = (Array.isArray(plan.weakTopics) ? plan.weakTopics : []).filter(topic => number(topic.attempts) >= 3).slice(0, 3);
  const days = Array.isArray(activity.last7Days) ? activity.last7Days : [];
  const maximum = Math.max(1, ...days.map(day => number(day.count)));
  const goalOptions = [...new Set([10, 20, 30, 50, currentGoal])].sort((a, b) => a - b);

  return <section className="learning-dashboard" aria-label="Tu plan de estudio">
    {savedSession && <section className="resume-study-card" aria-label="Sesión guardada">
      <span className="resume-study-icon"><BookOpen size={21}/></span>
      <div className="resume-study-copy"><span className="learning-eyebrow">TU SESIÓN ESTÁ GUARDADA</span><h2>Retoma donde quedaste.</h2><p>{savedSession.mode === 'exam' ? 'Simulacro' : 'Práctica guiada'}<span aria-hidden="true"> · </span>Pregunta {Math.min(number(savedSession.index) + 1, savedSession.ids.length)} de {savedSession.ids.length}<span aria-hidden="true"> · </span>El reloj espera en pausa.</p></div>
      <div className="resume-study-actions"><button className="primary" onClick={onResume}><Play size={15}/>Retomar sesión</button><button className="learning-quiet-button" onClick={onDiscardSession}>Descartar sesión guardada</button></div>
    </section>}

    <div className="learning-first-row">
      <section className="learning-recommendation" aria-label="Repaso recomendado">
        <div className="learning-recommendation-top"><span className="learning-eyebrow">TU SIGUIENTE PASO</span><span className="learning-method-label"><span/>Repaso recomendado</span></div>
        <h2>{pendingCount ? 'Vuelve a lo que más importa.' : 'Una sesión con dirección.'}</h2>
        <p className="learning-recommendation-description">{pendingCount ? 'Empieza por los repasos pendientes y las respuestas por corregir. Después, incorpora contenido nuevo.' : number(plan.unseenCount) ? 'Empieza por reconocer las estructuras y relacionarlas con su función. Tu práctica incorpora contenido nuevo.' : 'Repasa las estructuras que ya has practicado y mantén frescas sus relaciones, funciones y nervios.'}</p>
        <div className="learning-plan-counts" aria-label="Estado de tu banco">
          <div><span className="learning-plan-dot due"/><strong>{number(plan.dueCount)}</strong><span>por repasar</span></div>
          <div><span className="learning-plan-dot learning"/><strong>{number(plan.errorCount)}</strong><span>por corregir</span></div>
          <div><span className="learning-plan-dot new"/><strong>{number(plan.unseenCount)}</strong><span>{number(plan.unseenCount) === 1 ? 'nueva' : 'nuevas'}</span></div>
        </div>
        <div className="learning-recommendation-actions"><button className="primary" onClick={onRecommended} disabled={!recommendationCount}>Iniciar repaso recomendado<ArrowRight size={17}/></button><span><Clock3 size={14}/>{plural(recommendationCount, 'pregunta', 'preguntas')}<span aria-hidden="true"> · </span>1:30 por pregunta</span></div>
        <div className="learning-shortcuts"><button onClick={onReview} disabled={!pendingCount}><RotateCcw size={14}/>Repasar pendientes<ArrowUpRight size={13}/></button><button onClick={onImages}><ImageIcon size={14}/>Práctica visual<ArrowUpRight size={13}/></button></div>
      </section>

      <section className="goal-card" aria-label="Tu meta de hoy">
        <div className="goal-card-heading"><span className="learning-eyebrow">UN HÁBITO, A TU RITMO</span><Target size={18}/></div>
        <div className={`goal-ring ${completedGoal ? 'goal-complete' : ''}`} style={{ '--goal-progress': `${goalPercent}%` }} role="progressbar" aria-label="Avance de la meta diaria" aria-valuemin={0} aria-valuemax={currentGoal} aria-valuenow={Math.min(today, currentGoal)} aria-valuetext={`${today} de ${currentGoal} intentos hoy`}><div><strong>{today}<small>/{currentGoal}</small></strong><span>intentos hoy</span></div></div>
        <h2>{completedGoal ? <><Check size={16}/>Meta completada</> : 'Tu meta de hoy.'}</h2>
        <p>{completedGoal ? 'Ya cumpliste lo que te propusiste. Puedes seguir a tu ritmo.' : 'Un objetivo pequeño hace más fácil volver mañana.'}</p>
        <label className="goal-select-label">Meta diaria<select aria-label="Meta diaria de intentos" value={currentGoal} onChange={event => onGoalChange?.(Number(event.target.value))}>{goalOptions.map(value => <option value={value} key={value}>{value} intentos</option>)}</select></label>
        <small className="goal-count-note">Cada respuesta cuenta como un intento, aunque repitas una pregunta.</small>
      </section>
    </div>

    <div className="learning-second-row">
      <section className="activity-week" aria-label="Actividad de los últimos siete días">
        <div className="learning-card-heading"><div><span className="learning-eyebrow">LA CONSTANCIA SE CONSTRUYE</span><h2>Tu semana de práctica.</h2></div><span className="activity-total"><strong>{number(activity.weekTotal)}</strong> {number(activity.weekTotal) === 1 ? 'intento' : 'intentos'}</span></div>
        <div className="activity-chart" role="img" aria-label={days.length ? days.map(day => `${day.label}: ${plural(number(day.count), 'intento', 'intentos')}${day.isToday ? ', hoy' : ''}`).join('; ') : 'Todavía no hay actividad registrada.'}>
          {days.map(day => <div className={`activity-day ${day.isToday ? 'activity-today' : ''}`} key={day.date}><span className="activity-value">{number(day.count)}</span><div className="activity-bar-track"><span style={{ height: `${day.count ? Math.max(8, number(day.count) / maximum * 100) : 0}%` }}/></div><span className="activity-day-label">{day.isToday ? 'Hoy' : day.label}</span></div>)}
        </div>
        <div className="activity-week-note"><span>{number(activity.activeDays) ? plural(number(activity.activeDays), 'día con práctica', 'días con práctica') : 'Tu próxima respuesta inaugura este registro.'}</span><span>Últimos 7 días</span></div>
      </section>

      <section className="insight-topics" aria-label="Áreas para reforzar">
        <div className="learning-card-heading"><div><span className="learning-eyebrow">ENFOCA TU PRÓXIMO REPASO</span><h2>Un poco más de atención.</h2></div><TrendingUp size={19}/></div>
        {weakTopics.length ? <><p className="insight-description">Áreas con menor precisión, entre las que ya tienen al menos tres intentos.</p><div className="insight-topic-list">{weakTopics.map(topic => <button className="insight-topic-button" key={topic.topic} onClick={() => onWeakTopic?.(topic.topic)} aria-label={`Practicar ${topic.topic}`}><span className="insight-topic-main"><strong>{topic.topic}</strong><small>{plural(number(topic.attempts), 'intento', 'intentos')}</small></span><span className="insight-topic-accuracy">{Math.round(number(topic.accuracy))}<small>%</small></span><ArrowUpRight size={16}/></button>)}</div></> : <div className="insight-empty"><span><TrendingUp size={24}/></span><h3>Tu mapa se construye con la práctica.</h3><p>Cuando tengas al menos tres intentos en un área, podrás ver dónde conviene dedicar otro repaso.</p></div>}
      </section>
    </div>
    {Array.isArray(history) && history.length > 0 && <SessionHistory history={history} limit={3}/>}
  </section>;
}

export function SessionHistory({ history = [], limit = 6 }) {
  const sessions = Array.isArray(history) ? history.slice(0, limit) : [];
  return <section className="learning-session-history" aria-label="Sesiones recientes">
    <div className="learning-card-heading"><div><span className="learning-eyebrow">TU PRÁCTICA, EN PERSPECTIVA</span><h2>Sesiones recientes.</h2></div><BookOpen size={19}/></div>
    {sessions.length ? <div className="learning-history-list">{sessions.map(session => <article className="learning-history-item" key={session.id}><span className="learning-history-icon">{session.mode === 'exam' ? <Target size={17}/> : <BookOpen size={17}/>}</span><div><strong>{session.mode === 'exam' ? 'Simulacro' : 'Práctica guiada'}</strong><span>{formatDate(session.completedAt)}<span aria-hidden="true"> · </span>{plural(number(session.questionCount), 'pregunta', 'preguntas')}</span></div><div className="learning-history-score"><strong>{number(session.accuracy)}<small>%</small></strong><span>{plural(number(session.correct), 'correcta', 'correctas')}</span></div></article>)}</div> : <div className="learning-history-empty"><p>Tus próximas sesiones completas aparecerán aquí.</p><span>El progreso que ya tenías se conserva; este historial empieza con las nuevas sesiones.</span></div>}
  </section>;
}

export default LearningDashboard;
