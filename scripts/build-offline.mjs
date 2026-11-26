import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { GIMKANA_SECTIONS } from '../src/lib/sections.js';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const release = resolve(root, 'releases');
await mkdir(release, { recursive: true });
let html = await readFile(resolve(dist, 'index.html'), 'utf8');
const questions = JSON.parse(await readFile(resolve(dist, 'data/questions.json'), 'utf8'));
const solemne = JSON.parse(await readFile(resolve(dist, 'data/solemne2.json'), 'utf8'));
const histoembrio = JSON.parse(await readFile(resolve(dist, 'data/histoembrio.json'), 'utf8'));
const nextExam = JSON.parse(await readFile(resolve(dist, 'data/proxima-prueba.json'), 'utf8'));
const hematopoyesis = JSON.parse(await readFile(resolve(dist, 'data/hematopoyesis.json'), 'utf8'));
const gimkanaBanks = Object.fromEntries(await Promise.all(GIMKANA_SECTIONS.map(async ([id, section]) => [
  id,
  JSON.parse(await readFile(resolve(dist, 'data', `${section.gimkana.bank}.json`), 'utf8')),
])));
const images = {};
for (const path of new Set([...questions, ...hematopoyesis, ...Object.values(gimkanaBanks).flat()].filter(q => q.image).map(q => q.image))) {
  images[path] = `data:image/jpeg;base64,${(await readFile(resolve(dist, path))).toString('base64')}`;
}
const inline = value => value.replaceAll('</script', '<\\/script');
for (const [tag, file] of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(resolve(dist, file), 'utf8');
  html = html.replace(tag, () => `<script type="module">${inline(js)}</script>`);
}
// Vite uses relative assets; fonts are embedded so file:// needs no network.
const styleTags = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)];
for (const [tag, file] of styleTags) {
  let css = await readFile(resolve(dist, file), 'utf8');
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)];
  for (const [declaration, raw] of urls) {
    const asset = raw.replace(/^['"]|['"]$/g, '');
    if (asset.startsWith('data:') || /^https?:/.test(asset)) continue;
    const data = await readFile(resolve(dirname(resolve(dist, file)), asset));
    const type = asset.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
    css = css.replace(declaration, `url(data:${type};base64,${data.toString('base64')})`);
  }
  html = html.replace(tag, () => `<style>${css}</style>`);
}
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');
html = html.replace('<head>', () => `<head><script>window.__MORFO_QUESTIONS__=${JSON.stringify(questions).replaceAll('<','\\u003c')};window.__MORFO_SOLEMNE_QUESTIONS__=${JSON.stringify(solemne).replaceAll('<','\\u003c')};window.__MORFO_HISTOEMBRIO_QUESTIONS__=${JSON.stringify(histoembrio).replaceAll('<','\\u003c')};window.__MORFO_NEXTEXAM_QUESTIONS__=${JSON.stringify(nextExam).replaceAll('<','\\u003c')};window.__MORFO_HEMATOPOYESIS_QUESTIONS__=${JSON.stringify(hematopoyesis).replaceAll('<','\\u003c')};window.__MORFO_GIMKANA_BANKS__=${JSON.stringify(gimkanaBanks).replaceAll('<','\\u003c')};window.__MORFO_BLOOD12_SOURCE__='./Clase-12-Histologia-Sangre.pdf';window.__MORFO_VASCULAR13_SOURCE__='./Clase-AN13-Vascularizacion-Extremidades.pdf';window.__MORFO_VASCULAR12_SOURCE__='./Clase-AN12-Organizacion-Vascular.pdf';window.__MORFO_HEMATO14_SOURCE__='./Clase-14-Hematopoyesis.pdf';window.__MORFO_HISTO13_SOURCE__='./Clase-13-Histologia-Vascular.pdf';window.__MORFO_HISTO_SOURCE__='./Clase-10-Histologia.pdf';window.__MORFO_EMBRIO_SOURCE__='./Clase-11-Embriologia.pdf';window.__MORFO_SOLEMNE_SOURCE__='./Compilado-Anatomia-Solemne-2.pdf';window.__MORFO_IMAGES__=${JSON.stringify(images)};window.__MORFO_SOURCE__='./Material-de-estudio.pdf';</script>`);
await writeFile(resolve(release, 'Aguante-los-Medchones-USS.html'), html);
await copyFile(resolve(dist, 'source.pdf'), resolve(release, 'Material-de-estudio.pdf'));
await copyFile(resolve(dist, 'source-solemne2.pdf'), resolve(release, 'Compilado-Anatomia-Solemne-2.pdf'));
await copyFile(resolve(dist, 'source-histo.pdf'), resolve(release, 'Clase-10-Histologia.pdf'));
await copyFile(resolve(dist, 'source-embrio.pdf'), resolve(release, 'Clase-11-Embriologia.pdf'));
await copyFile(resolve(dist, 'source-blood12.pdf'), resolve(release, 'Clase-12-Histologia-Sangre.pdf'));
await copyFile(resolve(dist, 'source-vascular12.pdf'), resolve(release, 'Clase-AN12-Organizacion-Vascular.pdf'));
await copyFile(resolve(dist, 'source-histo13.pdf'), resolve(release, 'Clase-13-Histologia-Vascular.pdf'));
await copyFile(resolve(dist, 'source-vascular13.pdf'), resolve(release, 'Clase-AN13-Vascularizacion-Extremidades.pdf'));
await copyFile(resolve(dist, 'source-hemato14.pdf'), resolve(release, 'Clase-14-Hematopoyesis.pdf'));
const sources = (await readFile(resolve(dist, 'sources.html'), 'utf8')).replaceAll('source-solemne2.pdf', 'Compilado-Anatomia-Solemne-2.pdf').replaceAll('source-hemato14.pdf', 'Clase-14-Hematopoyesis.pdf').replaceAll('source-histo13.pdf', 'Clase-13-Histologia-Vascular.pdf').replaceAll('source-histo.pdf', 'Clase-10-Histologia.pdf').replaceAll('source-embrio.pdf', 'Clase-11-Embriologia.pdf').replaceAll('source-blood12.pdf', 'Clase-12-Histologia-Sangre.pdf').replaceAll('source-vascular12.pdf', 'Clase-AN12-Organizacion-Vascular.pdf').replaceAll('source-vascular13.pdf', 'Clase-AN13-Vascularizacion-Extremidades.pdf');
await writeFile(resolve(release, 'sources.html'), sources);
// Small standard ZIP writer (DEFLATE + CRC32) keeps packaging dependency-free.
const crcTable = Array.from({length:256}, (_, n) => {
  let c = n;
  for (let k=0;k<8;k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
async function zip(files, destination) {
  const parts = [], directory = [];
  let offset = 0;
  for (const {path, name} of files) {
    const data = await readFile(path), compressed = deflateRawSync(data), filename = Buffer.from(name);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);
    local.writeUInt32LE(checksum,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
    parts.push(local, filename, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);
    central.writeUInt32LE(checksum,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);
    directory.push(central, filename);offset += local.length + filename.length + compressed.length;
  }
  const centralData = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centralData.length,12);end.writeUInt32LE(offset,16);
  await writeFile(destination, Buffer.concat([...parts, centralData, end]));
}
async function collect(path, prefix='') {
  const files=[];
  for (const entry of await readdir(path, {withFileTypes:true})) {
    const name = prefix + entry.name, full = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await collect(full, name + '/'));
    else if (entry.isFile()) files.push({path:full,name});
  }
  return files;
}
await zip(['Aguante-los-Medchones-USS.html','Material-de-estudio.pdf','Compilado-Anatomia-Solemne-2.pdf','Clase-10-Histologia.pdf','Clase-11-Embriologia.pdf','Clase-12-Histologia-Sangre.pdf','Clase-AN12-Organizacion-Vascular.pdf','Clase-13-Histologia-Vascular.pdf','Clase-14-Hematopoyesis.pdf','Clase-AN13-Vascularizacion-Extremidades.pdf','sources.html'].map(name=>({path:resolve(release,name),name})),resolve(release,'Aguante-los-Medchones-USS-portable.zip'));
await zip(await collect(dist),resolve(release,'Aguante-los-Medchones-USS-web.zip'));
console.log('Exportación portable HTML + PDF y ZIP para hosting generados en releases/.');
