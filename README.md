# Aguante los Medchones USS

Aplicación de práctica de anatomía del miembro superior. [Abrir la página pública](https://rojasvdiego-create.github.io/EstudioMorfoI/). **developed by vizdiego**.

400 preguntas originales (300 de texto y 100 con imágenes) basadas en el material de Control II aportado: cuatro alternativas, explicación razonada y página del PDF. Interfaz en español inspirada en Lámina, con una presentación académica más sobria.

## Uso

- Sesiones aleatorias de 10, 20, 50, 100 o 400 preguntas, sin repetición dentro de la sesión. Los filtros pequeños ajustan la cantidad disponible.
- **90 segundos (1:30) por pregunta**. Pausar oculta el enunciado y las alternativas, y conserva exactamente el tiempo restante.
- Práctica guiada con explicación inmediata; simulacro con corrección al finalizar.
- Biblioteca con búsqueda, filtros por tema y formato (con imagen / solo texto), favoritas y repaso de errores.
- 100 preguntas visuales sobre estructuras reales del PDF, con señalamiento o numeración original, ampliación y atribución. Al ampliar la figura se pausa el reloj; al reanudar se oculta la ampliación. Las figuras se incluyen también en la versión portable.
- Progreso local y repaso espaciado de 1, 3, 7, 14 y 30 días tras aciertos consecutivos. Un error reinicia esa secuencia.
- Las sesiones se guardan automáticamente y pueden retomarse en pausa al volver. El progreso, las guardadas, la meta diaria y el historial permanecen en este navegador. No hay cuenta ni sincronización automática.

## Desarrollo

Node.js 22.12+ (validado con Node 24) y npm. Usar el checkout existente en `/workspace/EstudioMorfoI`; las tareas de nube ya están aisladas y no necesitan otro worktree.

```sh
npm ci
npm run build:data
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

`npm run build` valida las 400 preguntas, compila `dist/` y genera:

- `releases/Aguante-los-Medchones-USS.html`: aplicación autocontenida con fuentes y banco integrados. Se abre sin servidor ni Internet.
- `releases/Aguante-los-Medchones-USS-portable.zip`: HTML, material PDF y fuentes para abrir localmente. Descomprime todos sus archivos antes de usar.
- `releases/Aguante-los-Medchones-USS-web.zip`: sitio completo listo para hosting estático. Las rutas relativas permiten desplegarlo en subdirectorios.

La versión web no instala un service worker. La versión portable sí funciona sin conexión desde el primer uso; algunos navegadores limitan la persistencia bajo `file://`, por lo que se recomienda la web para progreso más estable.

## Comprobación en navegador

Con Python Playwright y Chromium instalados, iniciar `npm run dev -- --port 5173` y ejecutar `python test/e2e.py`. Incluye sesión, reloj, pausa, corrección, simulacro, guardadas, persistencia y móvil. Las nuevas funciones se comprueban con `python test/learning_e2e.py`. Tras compilar, `python test/export.py` verifica los ZIP y el HTML autocontenido con la red desactivada. La política del Chromium del entorno bloquea `file://`; esa prueba carga los mismos bytes HTML en memoria y no equivale a abrir un archivo local en este navegador administrado.

## Contenido y fuentes

Ver [docs/CONTENIDO.md](docs/CONTENIDO.md) y `public/sources.html`. Las preguntas son originales, no provienen de pruebas oficiales USS. OpenStax se consultó como modelo público de formato. El PDF original, de uso personal, mantiene sus atribuciones. No hay afiliación institucional ni garantía de coincidencia con un examen real.

No se publica ni se envían cambios a GitHub automáticamente. Para publicar posteriormente, desplegar el contenido de `dist/` en un hosting estático autorizado.

## Regenerar figuras

Los JPEG del control ya están incluidos en `public/figures/`; no hace falta Python para compilar el sitio. Para volver a extraerlos del PDF original, instalar PyMuPDF en un entorno de desarrollo y ejecutar `python scripts/extract-figures.py`. Los cuatro manifiestos `scripts/figures-*.json` registran página, objeto del PDF y rectángulo de recorte en píxeles originales. Las marcas se dibujan en la interfaz sobre la imagen; no se genera ni sustituye anatomía con IA.

## Nuevo espacio de estudio

La portada propone un repaso de hasta 20 preguntas priorizando repasos vencidos, errores y contenido nuevo. La actividad diaria cuenta intentos reales desde esta actualización; no se inventa un calendario histórico a partir de datos anteriores. La meta es editable y no representa una predicción de rendimiento.

Una sesión sin terminar conserva su orden, respuestas, selección y tiempo. Se guarda al responder, cada cinco segundos y al salir; al regresar se retoma en pausa. Un cierre abrupto del proceso puede perder los segundos posteriores al último autoguardado. La última selección registrada se conserva y el simulacro sigue ocultando la corrección hasta terminar.

“Descargar progreso” exporta un archivo JSON con progreso, preguntas guardadas, meta, actividad y sesiones completadas. “Restaurar progreso” valida todos los registros y solicita confirmar que el archivo reemplazará los datos del navegador. No incluye la sesión en curso; esa sesión se guarda localmente.

Ver [docs/MEJORAS.md](docs/MEJORAS.md) para las referencias de diseño consultadas.

## Solemne 2 Morfo

Nueva sección accesible desde el selector lateral o desde `#solemne-2-morfo`. Añade 100 preguntas escritas originales (35 casos clínicos), con cuatro alternativas, explicación y páginas del compilado de 97 páginas aportado por el estudiante. Cubre bases de miología, Dorso I-II y Miembro Superior e Inferior I-II. Los modelos fotográficos aportados orientan el formato de selección única; el temario se basa en el compilado, sin irrigación.

Dispone de **120 segundos por pregunta**, práctica guiada y simulacro con corrección al finalizar. La portada permite iniciar las 100 preguntas (hasta 3 h 20 min), o configurar sesiones de 10, 20, 50 o 100. Cada sección conserva su duración, fuente PDF, progreso, guardadas y sesión en curso. Cambiar de sección pausa y guarda la sesión; las claves originales `morfo.uss.v1.*` y el banco de Control II se conservan. Las copias indican la sección para evitar mezclar preguntas con igual número.

`content/solemne2.json` contiene el banco editable y `public/data/solemne2.json` su versión con alternativas permutadas de forma estable. `public/source-solemne2.pdf` conserva las 97 páginas y el texto del documento aportado. El PDF y ambos bancos también se incluyen en la edición portable. Ejecutar `python test/solemne_e2e.py` con el servidor activo para validar el reloj, las 100 preguntas, corrección, persistencia, separación de secciones y móvil.

## histo-embrio

La sección `#histo-embrio` se organiza en clases con **100 preguntas cada una**, cuatro alternativas, explicación y páginas de su PDF original. Para repasar las primeras clases, entra en **Clase 10 · Histología** (`#histo-embrio-clase-10`) o **Clase 11 · Embriología** (`#histo-embrio-clase-11`). Se mantienen 120 segundos por pregunta.

La respuesta correcta y el fundamento aparecen **al confirmar cada respuesta**, incluidos errores y tiempos agotados. Los botones de ambas clases inician práctica con corrección inmediata y permiten sesiones de 10, 20, 50 o 100. Las sesiones guardadas antiguamente como simulacro se convierten al retomarlas sin cambiar orden, selección o reloj; los intentos que aún no se habían incorporado al progreso se registran una sola vez.

El banco editable `content/histoembrio.json` contiene 300 preguntas y `public/data/histoembrio.json` la versión con alternativas permutadas. Las 100 originales conservan sus IDs y claves; las nuevas usan q101–q150 para histología y q151–q200 para embriología. Los PDF originales y el banco completo también se incluyen en la edición portable.

`src/lib/sections.js` centraliza nombres, enlaces, duración, cantidades y claves de las secciones y subsecciones. Cada clase conserva guardadas, progreso y sesión propios. Al abrir por primera vez una clase se copian sus respuestas y guardadas del banco conjunto anterior sin modificar ese registro. Las copias de progreso identifican su subsección y no se mezclan entre clases.

Ejecutar `python test/histoembrio_e2e.py` con el servidor activo para comprobar las dos sesiones completas de 100 preguntas, feedback inmediato, referencias, reloj, recuperación de sesiones anteriores, preservación del progreso y móvil.

**Clase 13 HE · Histología vascular** (`#histo-embrio-clase-13`) añade 100 preguntas de práctica con corrección inmediata y referencias al PDF de 56 páginas. Usa los IDs q201–q300 y guarda su progreso por separado.

## Próxima prueba

Nueva sección `#proxima-prueba`, independiente de Control II, Solemne 2 e histo-embrio. Contiene **240 preguntas repartidas en tres clases**.

- `#proxima-prueba-sangre`: Clase 12 HE · Histología de sangre, 70 preguntas, 49 páginas.
- `#proxima-prueba-vascular`: Clase AN12 · Organización vascular y vascularización de columna, 70 preguntas, 45 páginas.
- `#proxima-prueba-vascularizacion-extremidades`: Clase AN13 · Vascularización de extremidades, 100 preguntas, 93 páginas.

Cuatro alternativas, una respuesta correcta, 120 segundos por pregunta y solución inmediata al confirmar, incluso al equivocarse o agotarse el tiempo. Cada clase tiene su propio prefijo de almacenamiento, progreso, guardadas, sesiones y copias. La biblioteca permite buscar todos los enunciados. Durante la práctica se omite el subtema que podría revelar la respuesta.

`content/proxima-prueba.json` conserva los 240 enunciados editables (q001–q070 sangre, q071–q140 AN12 y q141–q240 AN13). `scripts/build-data.mjs` valida el banco y permuta las alternativas conservando claves. `src/lib/next-exam.js` verifica integridad, referencias y cobertura por clase. Para añadir futuras clases se amplían fuentes, metadatos, temas y banco manteniendo IDs anteriores.

Los PDFs se incluyen en web y edición portable. La fuente vascular reúne las páginas 1–22 y 22–45, eliminando la página 22 duplicada, sin renumerar las referencias. El estilo se orienta por la retroalimentación de Solemne II; los contenidos y explicaciones se apoyan en los nuevos PDFs. Se distingue el origen ventricular de aorta y tronco pulmonar ante la redacción inconsistente de la diapositiva 3.

También se corrigieron las alternativas de Clase 11 q068 para que correspondan a su enunciado sobre musculatura epaxial: intrínsecos del dorso y ramos posteriores espinales.

## Gimkana histología de la sangre

Acceso directo en `#gimkana-histologia-de-la-sangre`. El banco tiene 100 preguntas con microfotografías, respuestas breves y 90 segundos por pregunta. Las sesiones se ordenan al azar. La corrección al confirmar muestra la clave, la explicación y la página de la Clase 12 HE.

`content/gimkana-sangre.json` contiene los enunciados y las variantes aceptadas. `content/blood-gimkana-figures.json` registra la procedencia de las imágenes de la pauta ilustrada y de la Clase 12. El generador valida las figuras, las referencias y la cantidad de preguntas antes de publicar. La edición portable incluye estas imágenes y conserva las referencias al PDF de la clase.

## Gimkana histología de vasos

Acceso directo en `#gimkana-histologia-de-vasos`. Contiene 100 preguntas breves con microfotografías, orden aleatorio y 90 segundos por pregunta. Al confirmar, se muestra la respuesta esperada, su explicación y la página de la Clase 13 HE.

El banco editable se guarda en `content/gimkana-vasos.json` y la procedencia de las figuras en `content/vasos-gimkana-figures.json`. El generador de gimkanas prepara los bancos validados para la edición web y la portable.

## Hematopoyesis

Acceso directo en `#hematopoyesis`. Reúne 50 preguntas de selección única, incluidas cuatro con microfotografías de la Clase 14 HE. Las sesiones dan dos minutos por pregunta y muestran la solución y la referencia al confirmar.

`content/hematopoyesis.json` contiene el banco editable. Las explicaciones se vinculan al PDF de la Clase 14, incluido en web y en la edición portable. Los énfasis de la transcripción orientan la selección de temas.
