import { DURATION } from './study.js';

export const STUDY_SOURCES = {
  control2: { name: 'Material de estudio', file: 'source.pdf', pages: 50, embedded: '__MORFO_SOURCE__' },
  solemne2: { name: 'Compilado de anatomía', file: 'source-solemne2.pdf', pages: 97, embedded: '__MORFO_SOLEMNE_SOURCE__' },
  histo: { name: 'Clase 10 · Histología', file: 'source-histo.pdf', pages: 56, embedded: '__MORFO_HISTO_SOURCE__' },
  embrio: { name: 'Clase 11 · Embriología', file: 'source-embrio.pdf', pages: 50, embedded: '__MORFO_EMBRIO_SOURCE__' },
};

export const STUDY_SECTIONS = {
  control2: { name: 'Control II · Miembro superior', questionCount: 400, prefix: 'morfo.uss.v1.', duration: DURATION, hash: '#control-ii', sourceIds: ['control2'] },
  solemne2: { name: 'Solemne 2 Morfo', questionCount: 100, prefix: 'morfo.uss.solemne2.v1.', duration: 120, hash: '#solemne-2-morfo', sourceIds: ['solemne2'] },
  histoembrio: { name: 'histo-embrio', questionCount: 200, immediateFeedback: true, prefix: 'morfo.uss.histoembrio.v1.', duration: 120, hash: '#histo-embrio', sourceIds: ['histo', 'embrio'] },
  histo10: { name: 'Clase 10 · Histología', questionCount: 100, immediateFeedback: true, parentId: 'histoembrio', prefix: 'morfo.uss.histo10.v1.', duration: 120, hash: '#histo-embrio-clase-10', sourceIds: ['histo'], filterSource: 'histo' },
  embrio11: { name: 'Clase 11 · Embriología', questionCount: 100, immediateFeedback: true, parentId: 'histoembrio', prefix: 'morfo.uss.embrio11.v1.', duration: 120, hash: '#histo-embrio-clase-11', sourceIds: ['embrio'], filterSource: 'embrio' },
};

export const sectionFromHash = hash => Object.keys(STUDY_SECTIONS).find(id => STUDY_SECTIONS[id].hash === hash) || 'control2';
