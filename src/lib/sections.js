import { DURATION } from './study.js';

export const STUDY_SOURCES = {
  control2: { name: 'Material de estudio', file: 'source.pdf', pages: 50, embedded: '__MORFO_SOURCE__' },
  solemne2: { name: 'Compilado de anatomía', file: 'source-solemne2.pdf', pages: 97, embedded: '__MORFO_SOLEMNE_SOURCE__' },
  histo: { name: 'Clase 10 · Histología', file: 'source-histo.pdf', pages: 56, embedded: '__MORFO_HISTO_SOURCE__' },
  embrio: { name: 'Clase 11 · Embriología', file: 'source-embrio.pdf', pages: 50, embedded: '__MORFO_EMBRIO_SOURCE__' },
};

export const STUDY_SECTIONS = {
  control2: { name: 'Control II · Miembro superior', prefix: 'morfo.uss.v1.', duration: DURATION, hash: '#control-ii', sourceIds: ['control2'] },
  solemne2: { name: 'Solemne 2 Morfo', prefix: 'morfo.uss.solemne2.v1.', duration: 120, hash: '#solemne-2-morfo', sourceIds: ['solemne2'] },
  histoembrio: { name: 'histo-embrio', prefix: 'morfo.uss.histoembrio.v1.', duration: 120, hash: '#histo-embrio', sourceIds: ['histo', 'embrio'] },
};

export const sectionFromHash = hash => Object.keys(STUDY_SECTIONS).find(id => STUDY_SECTIONS[id].hash === hash) || 'control2';
