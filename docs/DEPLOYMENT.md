# Publicar en GitHub Pages

El workflow `.github/workflows/pages.yml` valida el banco, ejecuta las pruebas, compila la aplicación y publica el contenido de `dist/`. Se ejecuta al enviar cambios a `main` o manualmente desde GitHub Actions.

Requisito del repositorio: en **Settings → Pages → Build and deployment → Source**, seleccionar **GitHub Actions**. GitHub Pages debe estar habilitado y el plan y la visibilidad del repositorio deben permitir un sitio público. El workflow comprueba la configuración existente; no la habilita automáticamente.

El trabajo de compilación solo puede leer el código y la configuración de Pages. Únicamente el trabajo de despliegue obtiene permisos `pages: write` e `id-token: write`. El entorno de GitHub Actions se llama `github-pages`; el URL publicado queda en su registro de despliegue.

En el repositorio `rojasvdiego-create/Vizdiego`, el enlace previsto es `https://rojasvdiego-create.github.io/Vizdiego/`, salvo que GitHub configure un dominio personalizado. Debe comprobarse la publicación y abrirse ese enlace antes de afirmar que está disponible.

Las rutas de Vite son relativas, por lo que la aplicación admite la subruta `/Vizdiego/`. La carpeta publicada incluye el banco de preguntas, las fuentes y el PDF de estudio. La configuración del entorno de Codex es independiente de esta publicación web.
