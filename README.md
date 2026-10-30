# U San Esteban

Aplicación de práctica de anatomía del miembro superior. [Abrir la página pública](https://rojasvdiego-create.github.io/EstudioMorfoI/). **developed by vizdiego**.

300 preguntas originales (200 de texto y 100 con imágenes) basadas en el material de Control II aportado: cuatro alternativas, explicación razonada y página del PDF. Interfaz en español inspirada en Lámina, con una presentación académica más sobria.

## Uso

- Sesiones aleatorias de 10, 20, 50, 100 o 300 preguntas, sin repetición dentro de la sesión. Los filtros pequeños ajustan la cantidad disponible.
- **90 segundos (1:30) por pregunta**. Pausar oculta el enunciado y las alternativas, y conserva exactamente el tiempo restante.
- Práctica guiada con explicación inmediata; simulacro con corrección al finalizar.
- Biblioteca con búsqueda, filtros por tema y formato (con imagen / solo texto), favoritas y repaso de errores.
- 100 preguntas visuales sobre estructuras reales del PDF, con señalamiento o numeración original, ampliación y atribución. Al ampliar la figura se pausa el reloj; al reanudar se oculta la ampliación. Las figuras se incluyen también en la versión portable.
- Progreso local y repaso espaciado de 1, 3, 7, 14 y 30 días tras aciertos consecutivos. Un error reinicia esa secuencia.
- Las sesiones se guardan automáticamente y pueden retomarse en pausa al volver. El progreso, las guardadas, la meta diaria y el historial permanecen en este navegador. No hay cuenta ni sincronización automática.

## Desarrollo

Node.js 22.12+ (validado con Node 24) y npm. Usar el checkout existente en `/workspace/Vizdiego`; las tareas de nube ya están aisladas y no necesitan otro worktree.

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

`npm run build` valida las 300 preguntas, compila `dist/` y genera:

- `releases/U-San-Esteban.html`: aplicación autocontenida con fuentes y banco integrados. Se abre sin servidor ni Internet.
- `releases/U-San-Esteban-portable.zip`: HTML, material PDF y fuentes para abrir localmente. Descomprime todos sus archivos antes de usar.
- `releases/U-San-Esteban-web.zip`: sitio completo listo para hosting estático. Las rutas relativas permiten desplegarlo en subdirectorios.

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
