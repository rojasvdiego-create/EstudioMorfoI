import { readFile, writeFile } from 'node:fs/promises';
import { normalizeShortAnswer, SHORT_ANSWER_MAX_LENGTH } from '../src/lib/answers.js';
import { STUDY_SECTIONS, STUDY_SOURCES } from '../src/lib/sections.js';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const source = STUDY_SOURCES.blood12;
const figureList = await readJson('../content/blood-gimkana-figures.json');
const rows = await readJson('../content/gimkana-sangre.json');
const figures = new Map();

for (const figure of figureList) {
  const fromClass = figure.source === 'class';
  if (!figure.figureId || figures.has(figure.figureId) || !/^[a-z0-9-]+\.jpg$/.test(figure.file)
    || !figure.alt?.trim() || !figure.cell?.trim()
    || !Number.isInteger(figure.page) || figure.page < 1 || figure.page > (fromClass ? source.pages : 10)) {
    throw new Error(`Figura de sangre inválida: ${figure.figureId}`);
  }
  const image = `figures/blood/${figure.file}`;
  const jpeg = await readFile(new URL(`../public/${image}`, import.meta.url));
  if (jpeg[0] !== 255 || jpeg[1] !== 216) throw new Error(`JPEG inválido: ${image}`);
  const markers = figure.markers ?? [];
  if (!Array.isArray(markers) || markers.some(marker => !marker.label || ![marker.x, marker.y].every(value => Number.isFinite(value) && value > 0 && value < 100))) {
    throw new Error(`Marcador inválido: ${figure.figureId}`);
  }
  figures.set(figure.figureId, { ...figure, image, fromClass, markers });
}

const expected = STUDY_SECTIONS.bloodGimkana.questionCount;
if (!Array.isArray(rows) || rows.length !== expected) throw new Error(`La gimkana debe tener ${expected} preguntas.`);
const seen = new Set();
const used = new Set();
const bank = rows.map((row, index) => {
  const figure = figures.get(row.figureId);
  const stem = row.question?.trim();
  const key = `${figure?.cell}:${normalizeShortAnswer(stem ?? '')}`;
  if (!figure || row.id !== `q${String(index + 1).padStart(3, '0')}`
    || !stem || seen.has(key) || !row.topic?.trim() || !row.subtopic?.trim() || !row.explanation?.trim()) {
    throw new Error(`Enunciado inválido, duplicado o sin figura: ${row.id}`);
  }
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.length || row.acceptedAnswers.some(answer =>
    typeof answer !== 'string' || answer.length > SHORT_ANSWER_MAX_LENGTH || !normalizeShortAnswer(answer))) {
    throw new Error(`Respuestas aceptadas inválidas: ${row.id}`);
  }
  if (!Array.isArray(row.sourcePages) || !row.sourcePages.length || row.sourcePages.some(page =>
    !Number.isInteger(page) || page < 1 || page > source.pages)) {
    throw new Error(`Páginas de estudio inválidas: ${row.id}`);
  }
  seen.add(key);
  used.add(figure.image);
  return {
    ...row,
    type: 'Respuesta escrita',
    sourceId: 'blood12',
    image: figure.image,
    imageAlt: figure.alt,
    imageCaption: figure.fromClass
      ? `Clase 12 HE · página ${figure.page}`
      : `Pauta ilustrada · página ${figure.page}`,
    ...(figure.markers.length ? { imageMarkers: figure.markers } : {}),
  };
});
if (new Set(bank.map(q => q.topic)).size < 4 || used.size < 15) {
  throw new Error('La gimkana debe cubrir varios temas y microfotografías de la pauta.');
}
await writeFile(new URL('../public/data/gimkana-sangre.json', import.meta.url), JSON.stringify(bank, null, 2) + '\n');
console.log(`Gimkana histología de la sangre: ${bank.length} preguntas de respuesta escrita y ${used.size} microfotografías.`);
