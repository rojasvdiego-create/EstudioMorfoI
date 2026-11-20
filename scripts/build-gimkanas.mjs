import { readFile, writeFile } from 'node:fs/promises';
import { normalizeShortAnswer, SHORT_ANSWER_MAX_LENGTH } from '../src/lib/answers.js';
import { GIMKANA_SECTIONS, STUDY_SOURCES } from '../src/lib/sections.js';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

async function buildGimkana(section) {
  const { bank, figures: collection, pautaPages, classLabel } = section.gimkana;
  const [sourceId] = section.sourceIds;
  const source = STUDY_SOURCES[sourceId];
  const [figureList, rows] = await Promise.all([
    readJson(`../content/${collection}-gimkana-figures.json`),
    readJson(`../content/${bank}.json`),
  ]);
  const figures = new Map();

  for (const figure of figureList) {
    const fromClass = figure.source === 'class';
    if (!figure.figureId || figures.has(figure.figureId) || !/^[a-z0-9-]+\.jpg$/.test(figure.file)
      || !figure.alt?.trim() || !figure.cell?.trim()
      || !Number.isInteger(figure.page) || figure.page < 1 || figure.page > (fromClass ? source.pages : pautaPages)) {
      throw new Error(`Figura inválida en ${bank}: ${figure.figureId}`);
    }
    const image = `figures/${collection}/${figure.file}`;
    const jpeg = await readFile(new URL(`../public/${image}`, import.meta.url));
    if (jpeg[0] !== 255 || jpeg[1] !== 216) throw new Error(`JPEG inválido: ${image}`);
    const markers = figure.markers ?? [];
    if (!Array.isArray(markers) || markers.some(marker => !marker.label
      || ![marker.x, marker.y].every(value => Number.isFinite(value) && value > 0 && value < 100))) {
      throw new Error(`Marcador inválido en ${bank}: ${figure.figureId}`);
    }
    figures.set(figure.figureId, { ...figure, image, fromClass, markers });
  }

  const expected = section.questionCount;
  if (!Array.isArray(rows) || rows.length !== expected) {
    throw new Error(`${section.name} debe tener ${expected} preguntas.`);
  }
  const seen = new Set();
  const used = new Set();
  const questions = rows.map((row, index) => {
    const figure = figures.get(row.figureId);
    const stem = row.question?.trim();
    const key = `${figure?.cell}:${normalizeShortAnswer(stem ?? '')}`;
    if (!figure || row.id !== `q${String(index + 1).padStart(3, '0')}`
      || !stem || seen.has(key) || !row.topic?.trim() || !row.subtopic?.trim() || !row.explanation?.trim()) {
      throw new Error(`Enunciado inválido, duplicado o sin figura en ${bank}: ${row.id}`);
    }
    if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.length || row.acceptedAnswers.some(answer =>
      typeof answer !== 'string' || answer.length > SHORT_ANSWER_MAX_LENGTH || !normalizeShortAnswer(answer))) {
      throw new Error(`Respuestas aceptadas inválidas en ${bank}: ${row.id}`);
    }
    if (!Array.isArray(row.sourcePages) || !row.sourcePages.length || row.sourcePages.some(page =>
      !Number.isInteger(page) || page < 1 || page > source.pages)) {
      throw new Error(`Páginas de estudio inválidas en ${bank}: ${row.id}`);
    }
    seen.add(key);
    used.add(figure.image);
    return {
      ...row,
      type: 'Respuesta escrita',
      sourceId,
      image: figure.image,
      imageAlt: figure.alt,
      imageCaption: `${figure.fromClass ? classLabel : 'Pauta ilustrada'} · página ${figure.page}`,
      ...(figure.markers.length ? { imageMarkers: figure.markers } : {}),
    };
  });

  await writeFile(new URL(`../public/data/${bank}.json`, import.meta.url), JSON.stringify(questions, null, 2) + '\n');
  console.log(`${section.name}: ${questions.length} preguntas de respuesta escrita y ${used.size} microfotografías.`);
}

for (const [, section] of GIMKANA_SECTIONS) await buildGimkana(section);
