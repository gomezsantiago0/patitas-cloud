# 3. Arquitectura propuesta y servicios por capa

## 3.1 Visión general

Patitas Cloud es una aplicación web sin servidores propios. El cliente usa un navegador, el sitio y la API viven dentro de un mismo servicio de Azure y los datos se guardan en una base de datos administrada. Elegimos servicios que cobran por uso o tienen plan gratuito, porque el negocio es pequeño, tiene unas 40 citas diarias y el presupuesto máximo es de USD 150 al mes.

Hoy está desplegado el ambiente dev. El ambiente de producción está diseñado y costeado, pero no lo construimos. Cada vez que describimos algo indicamos si está implementado o solo diseñado.

Los diagramas de apoyo están en `docs/diagramas/`: `red-seguridad.png` (zonas, flujos e identidades) y `pipeline.png` (despliegue).

## 3.2 Servicios por capa

| Capa | Servicio | Estado | Para qué lo usamos |
|---|---|---|---|
| Presentación | Azure Static Web Apps, plan Free en dev | Implementado | Sirve el sitio estático (HTML, CSS y JavaScript sin framework) por HTTPS. |
| Lógica | Azure Functions administradas de Static Web Apps, Node.js 22 | Implementado | API con `/api/health` y `/api/citas`. |
| Datos | Azure Cosmos DB for NoSQL, modo sin servidor | Implementado | Guarda las citas. Base `patitas`, contenedor `citas`, clave de partición `/fecha`. |
| Observabilidad | Application Insights y Log Analytics | Implementado | Telemetría, logs centralizados y una alerta de métrica. |
| Entrega | GitHub Actions y Bicep | Implementado | Pipeline de despliegue e infraestructura como código. |
| Producción | Static Web Apps Standard, Key Vault | Solo diseño | Plan con SLA y manejo de secretos. No están construidos. |

## 3.3 Capa de presentación

El sitio muestra un formulario para agendar la cita y una agenda por día. Escribimos los textos con `textContent`, sin `innerHTML`, y sin scripts ni estilos en línea, para que la política de seguridad de contenido pueda ser estricta.

Elegimos Static Web Apps porque sirve el sitio y la API en el mismo origen, y eso evita configurar CORS. También incluye HTTPS gestionado por la plataforma. El plan Free no tiene SLA, y eso lo tratamos en la sección 5.

## 3.4 Capa de lógica

La API tiene dos funciones, con el modelo v3 de Azure Functions (`function.json`):

- `GET /api/health` comprueba que la base de datos responde. Devuelve 200 o 503.
- `/api/citas` acepta `POST` para agendar y `GET` para listar. Otros métodos reciben 405.

La API valida cada dato antes de guardarlo. Las reglas son: fecha real, sin domingos, franjas de 30 minutos entre las 7:00 y las 18:30, y fecha y hora futuras según la hora de Colombia. El cliente debe aceptar el tratamiento de datos para que la cita se guarde.

El identificador de cada cita es la fecha y la hora, por ejemplo `2026-11-26_0930`. Así Cosmos DB rechaza una segunda cita en la misma franja, incluso si dos solicitudes llegan al mismo tiempo. La API traduce ese rechazo en una respuesta 409.

Las respuestas y el listado solo devuelven fecha, hora, nombre de la mascota, especie, estado e identificador. El nombre, el teléfono y el correo del cliente se guardan, pero la API nunca los devuelve. Los errores internos devuelven 500 sin detalles.

## 3.5 Capa de datos

Usamos Cosmos DB for NoSQL en modo sin servidor, con una cuenta por ambiente. La cuenta de dev está en Mexico Central.

| Parámetro | Valor |
|---|---|
| Consistencia | Session |
| Versión mínima de TLS | 1.2 |
| Clave de partición | `/fecha` |
| Respaldo | Periódico, cada 240 minutos, retención de 168 horas (7 días), almacenamiento con redundancia de zona |
| Acceso de red | Público habilitado, sin reglas de IP ni endpoint privado |

Elegimos el modo sin servidor porque la carga es baja e irregular. Se paga por las operaciones que se usan y no por capacidad reservada. La comparación de costos está en el Excel de costos.

Dos limitaciones que reconocemos:

- La cuenta tiene una sola región y `isZoneRedundant` está en falso. Lo que tiene redundancia de zona es el almacenamiento del respaldo.
- El acceso de red público queda habilitado. Cerrarlo exigiría una red privada, que supera el presupuesto y el alcance del MVP.

## 3.6 Observabilidad

Application Insights recibe la telemetría de la API y Log Analytics guarda los logs, con retención de 30 días y un tope de 1 GB al día. Hay una alerta de métrica llamada `alerta-errores-api-dev` sobre `requests/failed`. El detalle está en la sección 6.

## 3.7 Entrega y configuración

La infraestructura se declara en Bicep (`infra/main.bicep`) y dev y prod salen del mismo archivo. La desplegamos a mano con `az deployment group create`, fuera del pipeline.

El código se despliega con GitHub Actions: Build, Pruebas, Deploy y Smoke test. Los detalles están en `docs/diseno-despliegue.md`.

La cadena de conexión de Cosmos y la de Application Insights las inyecta el Bicep como configuración del Static Web App, y no aparecen en el repositorio.

## 3.8 Regiones

| Componente | Región | Motivo |
|---|---|---|
| Static Web Apps | East US 2 | Es una de las pocas regiones donde existe el servicio. La política de la suscripción rechazó Central US. |
| Cosmos DB, Application Insights y Log Analytics | Mexico Central | Es la región permitida más cercana a los usuarios. |

La API corre en East US 2 y la base de datos está en Mexico Central. Esa distancia añade latencia a cada consulta. No la medimos.

## 3.9 Escalabilidad

El requisito pide soportar tres veces la carga en temporada alta, es decir, unas 120 citas diarias. Cosmos DB sin servidor y las funciones administradas asignan capacidad según la demanda, así que no hay servidores que ampliar a mano. En la estimación de costos usamos 15 millones de unidades de solicitud al mes para producción.

**No hicimos una prueba de carga.** Decimos que la arquitectura está pensada para ese crecimiento, pero no lo demostramos.

## 3.10 Qué queda solo como diseño de producción

- Static Web Apps en plan Standard, que es el que trae SLA. Cuesta USD 9 al mes.
- Key Vault para los secretos, con una identidad administrada de la API. Requiere Functions propias en plan Standard.
- Exportación diaria del respaldo a Blob Storage.
- Recordatorios por correo con una función programada.
- Inicio de sesión del personal.

Ninguno de estos elementos está implementado ni incluido en la estimación de costos de dev. Los dibujamos en la zona gris del diagrama de red y seguridad.