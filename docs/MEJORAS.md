# Aguante los Medchones USS: mejoras del espacio de estudio

Se contrastaron patrones de estudio en fuentes oficiales actuales, consultadas el 30 de octubre de 2026 desde sus repositorios públicos. El acceso directo a páginas comerciales de AMBOSS, Kenhub y Anki fue bloqueado por la política de red; no se afirma haber inspeccionado su interfaz actual.

- Anki, manual oficial, revisión `91f7485236db2a89d2a8abaed618976caf971de2`: [organización del estudio](https://github.com/ankitects/anki-manual/blob/91f7485236db2a89d2a8abaed618976caf971de2/src/studying.md), [orden de repasos](https://github.com/ankitects/anki-manual/blob/91f7485236db2a89d2a8abaed618976caf971de2/src/deck-options.md#review-sort-order) y [copias de seguridad](https://github.com/ankitects/anki-manual/blob/91f7485236db2a89d2a8abaed618976caf971de2/src/backups.md).
- Moodle, revisión `0580991669815767026aea115a2053e2040378af`: [guardado y continuación de intentos](https://github.com/moodle/moodle/blob/0580991669815767026aea115a2053e2040378af/public/mod/quiz/lang/en/quiz.php).

De estas fuentes se tomaron patrones funcionales: separar lo nuevo de lo pendiente, facilitar la continuación del trabajo y respaldar el progreso. No se copiaron páginas ni preguntas de esas plataformas.

La implementación conserva los 300 ítems del banco, sus 100 preguntas visuales, los 90 segundos por pregunta y las claves existentes del almacenamiento local. El motor mantiene sus intervalos fijos; no se presenta como FSRS ni como inteligencia artificial adaptativa. Las recomendaciones eligen preguntas según registros reales de repaso y errores. Las áreas para reforzar requieren al menos tres intentos para mostrarse.

La actividad de siete días representa respuestas realmente enviadas desde la actualización. Una respuesta repetida cuenta como otro intento. La meta diaria es una preferencia editable y no una estimación científica de tiempo o dominio.

Las sesiones guardadas se restauran en pausa con el tiempo restante; las copias JSON se validan antes de reemplazar datos y necesitan confirmación dentro del producto. La reanudación y las estadísticas no añaden cuentas ni sincronización remota.

Validación: 14 pruebas de lógica y banco, 12 escenarios de estudio y 8 escenarios nuevos de reanudación, recomendaciones, copias e importación con confirmación. Se revisó la portada a 1440, 390 y 320 píxeles y la exportación portable con la red desactivada.
