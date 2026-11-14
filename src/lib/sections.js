import { DURATION } from './study.js';

export const STUDY_SOURCES = {
  control2: { name: 'Material de estudio', file: 'source.pdf', pages: 50, embedded: '__MORFO_SOURCE__' },
  solemne2: { name: 'Compilado de anatomía', file: 'source-solemne2.pdf', pages: 97, embedded: '__MORFO_SOLEMNE_SOURCE__' },
  histo: { name: 'Clase 10 · Histología', file: 'source-histo.pdf', pages: 56, embedded: '__MORFO_HISTO_SOURCE__' },
  blood12: { name: 'Clase 12 HE · Histología de sangre', file: 'source-blood12.pdf', pages: 49, embedded: '__MORFO_BLOOD12_SOURCE__' },
  vascular12: { name: 'Clase AN12 · Organización vascular', file: 'source-vascular12.pdf', pages: 45, embedded: '__MORFO_VASCULAR12_SOURCE__' },
  embrio: { name: 'Clase 11 · Embriología', file: 'source-embrio.pdf', pages: 50, embedded: '__MORFO_EMBRIO_SOURCE__' },
};

export const STUDY_SECTIONS = {
  control2: { name: 'Control II · Miembro superior', questionCount: 400, prefix: 'morfo.uss.v1.', duration: DURATION, hash: '#control-ii', sourceIds: ['control2'] },
  solemne2: { name: 'Solemne 2 Morfo', questionCount: 100, prefix: 'morfo.uss.solemne2.v1.', duration: 120, hash: '#solemne-2-morfo', sourceIds: ['solemne2'] },
  histoembrio: { name: 'histo-embrio', hub: true, questionCount: 200, immediateFeedback: true, prefix: 'morfo.uss.histoembrio.v1.', duration: 120, hash: '#histo-embrio', sourceIds: ['histo', 'embrio'] },
  histo10: { name: 'Clase 10 · Histología', questionCount: 100, immediateFeedback: true, parentId: 'histoembrio', prefix: 'morfo.uss.histo10.v1.', duration: 120, hash: '#histo-embrio-clase-10', sourceIds: ['histo'], filterSource: 'histo' },
  nextExam: { name: 'Próxima prueba', hub: true, questionCount: 140, immediateFeedback: true, prefix: 'morfo.uss.nextExam.v1.', duration: 120, hash: '#proxima-prueba', sourceIds: ['blood12', 'vascular12'] },
  blood12: { name: 'Clase 12 HE · Histología de sangre', shortTitle: 'Histología de sangre', classLabel: 'CLASE 12 HE', buttonLabel: 'Estudiar sangre', description: 'Plasma, eritrocitos, leucocitos, plaquetas y sus relaciones de estructura y función.', questionCount: 70, immediateFeedback: true, parentId: 'nextExam', prefix: 'morfo.uss.blood12.v1.', duration: 120, hash: '#proxima-prueba-sangre', sourceIds: ['blood12'], chapters: [['Plasma', 3], ['Eritrocitos', 12], ['Leucocitos', 25], ['Plaquetas', 44]] },
  vascular12: { name: 'Clase AN12 · Organización vascular', shortTitle: 'Organización vascular', classLabel: 'CLASE AN12', buttonLabel: 'Estudiar organización vascular', description: 'Organización de la circulación, vasos principales y relaciones de irrigación y drenaje.', questionCount: 70, immediateFeedback: true, parentId: 'nextExam', prefix: 'morfo.uss.vascular12.v1.', duration: 120, hash: '#proxima-prueba-vascular', sourceIds: ['vascular12'], chapters: [['Circulación', 3], ['Arco aórtico', 7], ['Aorta torácica', 13], ['Aorta abdominal', 18]] },
  embrio11: { name: 'Clase 11 · Embriología', questionCount: 100, immediateFeedback: true, parentId: 'histoembrio', prefix: 'morfo.uss.embrio11.v1.', duration: 120, hash: '#histo-embrio-clase-11', sourceIds: ['embrio'], filterSource: 'embrio' },
};

export const sectionFromHash = hash => Object.keys(STUDY_SECTIONS).find(id => STUDY_SECTIONS[id].hash === hash) || 'control2';
