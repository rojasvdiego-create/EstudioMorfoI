# Criterios del banco de preguntas

El banco contiene 400 preguntas originales (300 de texto y 100 con imágenes) a partir del PDF aportado de 50 páginas. Las referencias `sourcePages` usan el índice físico de ese PDF, no sus folios impresos. Cada entrada contiene cuatro alternativas, una respuesta, tema, subtema, tipo de razonamiento, dificultad y explicación.

Distribución original de las 200 preguntas de texto: Osteología 25; Artrología 25; Axila y plexo braquial 20; Hombro y brazo 30; Antebrazo 54; Muñeca y mano 34; Integración clínica 12.

Las fuentes editables viven en `content/`. `npm run build:data` valida y genera `public/data/questions.json`, permutando de forma reproducible las alternativas para eliminar patrones de posición del proceso de redacción. No edites solo el JSON generado.

Revisión: cotejo contra el texto del PDF y los anexos, revisión cruzada anatómica y sustitución de preguntas redundantes por límites, piso, techo y contenido de fosa cubital. Se conservan precisiones docentes, no se mezclan respuestas de marcos distintos (p. ej. humerorradial). No equivale a certificación docente.

Modelos públicos: OpenStax Anatomy and Physiology 2e, repositorio oficial `https://github.com/openstax/osbooks-anatomy-physiology`, commit `5ae32b3f4bc24ed003e91dc38bf47dba80751044`, módulos m46374, m46368, m46398, m46495. Se estudiaron los formatos de selección múltiple y razonamiento; no se transcribieron enunciados ni se importaron datos. Consultado 2026-10-29. El acceso directo a páginas externas de OpenStax y BlueLink fue bloqueado por el proxy; OpenStax pudo consultarse desde GitHub. No se declara haber revisado BlueLink.

La identidad visual sigue como referencia la página Lámina compartida por el usuario. Se implementa una aplicación nueva, con colores verdes, fondos claros y una presentación más sobria. El PDF original conserva las atribuciones que contiene; no se presentan sus figuras como obra propia.

## Ampliación visual

Se agregan q201–q300. Cada una remite a una figura real del documento del control, con atribución y página de procedencia. Los originales q001–q200 y sus IDs se conservan para respetar el progreso existente. El validador exige 400 preguntas, 100 con imágenes locales, claves completas y marcadores dentro de los límites.

Los manifiestos `scripts/figures-*.json` registran las coordenadas en píxeles de los JPEG originales incrustados en el PDF. `scripts/extract-figures.py` convierte correctamente la escala de 96 dpi del JPEG al sistema de coordenadas de PyMuPDF. Los recortes no añaden anatomía; las marcas porcentuales se superponen en la interfaz y se conservan al ampliar.

Se revisan las claves de identificación y los señalamientos, evitando que los listados de soluciones queden dentro de los recortes. En ilustraciones con rótulos se evalúan funciones, relaciones o nervios en vez de transcribir un nombre visible. Las preguntas pueden compartir figura, pero evalúan objetivos distintos. La versión HTML portable incorpora también estos JPEG para conservar las preguntas visuales sin conexión.

Validación de la ampliación: 7 pruebas de lógica/banco y 12 escenarios de Chromium aprobados; se verificaron zoom, posición proporcional de las marcas, pausa, recuperación de imagen fallida, filtros, progreso previo y HTML portable con imágenes sin red. Las 50 preguntas visuales de huesos/hombro tuvieron un cotejo independiente de 17 recortes; las 50 de antebrazo/mano se contrastaron con sus figuras originales.

Edición de estilo: las preguntas y sus explicaciones se redactan como anatomía integrada, sin citar clases o tablas docentes en el enunciado. La atribución de imágenes y las páginas fuente se mantienen por separado. Se revisan también la ortografía, los espacios y la concordancia singular/plural de la portada.

## Ampliación de texto q301–q400

Se incorporan 100 preguntas de aplicación en `content/additional.json`, redactadas a partir de `public/source.pdf`: osteología (12), artrología (16), axila y plexo (12), hombro y brazo (16), antebrazo (20), muñeca y mano (14) e integración clínica (10). Cada entrada incluye cuatro alternativas, explicación y página física del PDF. Se mantienen las 100 preguntas visuales y los IDs q001–q300, sus respuestas y los formatos de progreso previos. No se agregan inserciones musculares, mapas cutáneos ni irrigación/inervación articular excluidas por la fuente. Las sesiones completas admiten 400 preguntas.
