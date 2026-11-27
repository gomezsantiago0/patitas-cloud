# 5. Disponibilidad, respaldo y recuperación

## 5.1 Objetivos del enunciado

| Requisito | Objetivo |
|---|---|
| Disponibilidad | 99,5 % en horario comercial |
| RPO (pérdida máxima de datos) | 24 horas |
| RTO (tiempo máximo de recuperación) | 4 horas |
| Escalabilidad | Soportar 3 veces la carga en temporada alta |

Separamos lo que la arquitectura ofrece de lo que **demostramos**. No medimos la disponibilidad ni probamos una restauración.

## 5.2 Disponibilidad

**Horario comercial.** Suponemos atención de lunes a sábado de 7:00 a 19:00, es decir, 72 horas a la semana. Un 99,5 % sobre ese horario equivale a unas 1,5 horas de caída tolerada al mes. Es un cálculo propio y hay que afinarlo.

**Lo que sustenta la disponibilidad.** Static Web Apps, las funciones administradas y Cosmos DB son servicios administrados: Microsoft opera los servidores y no tenemos nada que parchar.

**Lo que no podemos afirmar.**

- El plan Free de Static Web Apps **no tiene SLA**. Solo el plan Standard (USD 9 al mes) trae SLA. Por eso dev no sirve como evidencia de un 99,5 %.
- Para producción proponemos el plan Standard. Esa decisión está costeada y no construida.
- La cuenta de Cosmos DB usa una sola región y `isZoneRedundant` en falso. Una caída de esa región dejaría la API sin base de datos.
- Dividir la web (East US 2) y los datos (Mexico Central) añade una dependencia entre regiones.
- No hay prueba de disponibilidad medida. Hoy solo contamos con el smoke test del pipeline y la ruta `/api/health`, que consulta la base de datos.

## 5.3 Respaldo

| Parámetro | Valor (dev, configurado en el Bicep) |
|---|---|
| Modo | Periódico |
| Frecuencia | Cada 240 minutos (4 horas) |
| Retención | 168 horas (7 días) |
| Redundancia del almacenamiento del respaldo | Zona |

Cosmos DB guarda las copias de forma automática. Subimos la retención de 8 horas, que es el valor por defecto de Azure, a 7 días.

**RPO.** Con copias cada 4 horas, la pérdida máxima esperada es de unas 4 horas, dentro del objetivo de 24 horas. Es lo que indica la configuración y no lo verificamos con una restauración.

**Exportación diaria a Blob Storage.** El enunciado de la veterinaria pide respaldo diario. Lo diseñamos como una exportación programada, pero **no está implementada ni incluida en la estimación de costos**.

## 5.4 Recuperación

| Escenario | Cómo se recupera | Estado |
|---|---|---|
| Código defectuoso | `git revert` y un PR. El pipeline vuelve a desplegar en unos 2 minutos. | Ensayado el 25/11/2026 |
| Infraestructura dañada | Se vuelve a ejecutar el Bicep desde el historial de Git. | Documentado, no ensayado |
| Datos borrados o dañados | Restauración de Cosmos DB desde el respaldo periódico. | Documentado, no ensayado |

**El RTO de 4 horas no lo prometemos.** En el modo periódico, la restauración se solicita a soporte de Azure y no es autoservicio. No podemos garantizar su tiempo de respuesta.

**Alternativa.** El respaldo continuo permite restaurar por cuenta propia a un momento dado. No lo usamos porque no verificamos que esté disponible en Mexico Central con Cosmos DB sin servidor, y porque no se puede volver a modo periódico después de activarlo. Si en producción se confirma, es la opción que recomendamos para acercarnos al RTO.

El rollback del pipeline cubre solo el código. Los datos dependen del respaldo.

## 5.5 Escalabilidad

El requisito es soportar tres veces la carga, unas 120 citas diarias. Cosmos DB sin servidor y las funciones administradas asignan capacidad según la demanda.

**No hicimos prueba de carga.** Tampoco medimos el listado con muchas citas. Una limitación concreta: Cosmos DB sin servidor tiene un tope de rendimiento por contenedor, que no verificamos contra este caso. Con 120 citas diarias lo consideramos poco probable, pero es una suposición.

## 5.6 Resumen de cumplimiento

| Requisito | Qué ofrece el diseño | Qué demostramos |
|---|---|---|
| Disponibilidad 99,5 % | Servicios administrados; Standard con SLA en producción | Nada medido |
| RPO 24 h | Copias cada 4 horas | Configuración revisada, sin restauración |
| RTO 4 h | No se promete en modo periódico | No aplica |
| Escalabilidad 3x | Capacidad según demanda | Sin prueba de carga |
| Respaldo diario | Exportación a Blob Storage | No implementado |