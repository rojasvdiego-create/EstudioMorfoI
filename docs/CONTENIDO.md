# Criterios del banco de preguntas

Se generaron 200 preguntas originales a partir del PDF aportado de 50 páginas. Las referencias `sourcePages` usan el índice físico de ese PDF, no sus folios impresos. Cada entrada contiene cuatro alternativas, una respuesta, tema, subtema, tipo de razonamiento, dificultad y explicación.

Distribución: Osteología 25; Artrología 25; Axila y plexo braquial 20; Hombro y brazo 30; Antebrazo 54; Muñeca y mano 34; Integración clínica 12.

Las fuentes editables viven en `content/`. `npm run build:data` valida y genera `public/data/questions.json`, permutando de forma reproducible las alternativas para eliminar patrones de posición del proceso de redacción. No edites solo el JSON generado.

Revisión: cotejo contra el texto del PDF y los anexos, revisión cruzada anatómica y sustitución de preguntas redundantes por límites, piso, techo y contenido de fosa cubital. Se conservan precisiones docentes, no se mezclan respuestas de marcos distintos (p. ej. humerorradial). No equivale a certificación docente.

Modelos públicos: OpenStax Anatomy and Physiology 2e, repositorio oficial `https://github.com/openstax/osbooks-anatomy-physiology`, commit `5ae32b3f4bc24ed003e91dc38bf47dba80751044`, módulos m46374, m46368, m46398, m46495. Se estudiaron los formatos de selección múltiple y razonamiento; no se transcribieron enunciados ni se importaron datos. Consultado 2026-10-29. El acceso directo a páginas externas de OpenStax y BlueLink fue bloqueado por el proxy; OpenStax pudo consultarse desde GitHub. No se declara haber revisado BlueLink.

La identidad visual sigue como referencia la página Lámina compartida por el usuario. Se implementa una aplicación nueva, con colores verdes, fondos claros y una presentación más sobria. El PDF original conserva las atribuciones que contiene; no se presentan sus figuras como obra propia.
