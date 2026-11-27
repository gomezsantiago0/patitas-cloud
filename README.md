# Patitas Cloud

Agenda de citas para la veterinaria "Patitas". Proyecto de la materia PENU, Escuela Colombiana de Ingeniería Julio Garavito. Desarrollamos un MVP que agenda y lista citas, lo desplegamos en Azure con un pipeline de GitHub Actions y documentamos la arquitectura completa.

Sitio de dev: https://delightful-mud-0d353af0f.8.azurestaticapps.net

## Qué hace el MVP

- Agenda una cita (fecha, hora, mascota y datos del cliente).
- Lista las citas por día, sin mostrar datos personales del cliente.
- Rechaza una segunda cita en la misma franja con una respuesta 409.

Atendemos de lunes a sábado, con citas cada 30 minutos entre las 7:00 a. m. y las 6:30 p. m. El MVP no tiene autenticación. Es una limitación que declaramos en el HLD.

## Arquitectura

| Capa | Servicio |
|---|---|
| Frontend | Azure Static Web Apps (HTML, CSS y JavaScript sin framework) |
| API | Azure Functions administradas de Static Web Apps, Node.js 22 |
| Datos | Azure Cosmos DB for NoSQL, modo sin servidor |
| Observabilidad | Application Insights y Log Analytics |
| Infraestructura | Bicep |
| Entrega | GitHub Actions |

La web está en East US 2 y los datos en Mexico Central. Los diagramas están en `docs/diagramas/`:

- `pipeline.png`: etapas del despliegue.
- `red-seguridad.png`: zonas, flujos e identidades.

## Estructura del repositorio

- `web/`: frontend estático y `staticwebapp.config.json` con las cabeceras de seguridad.
- `api/`: funciones de Azure (`health` y `citas`), lógica en `api/src/` y pruebas en `api/tests/`.
- `infra/`: `main.bicep` y los parámetros `dev.bicepparam` y `prod.bicepparam`.
- `.github/workflows/`: `deploy.yml` (build, pruebas, despliegue y smoke test) y `ci.yml` (ESLint y CodeQL).
- `docs/`: diseño de despliegue, costos, diagramas, evidencias, HLD y ADR.

## API

| Método y ruta | Respuestas |
|---|---|
| `GET /api/health` | 200 si la base de datos responde, 503 si no |
| `POST /api/citas` | 201 creada, 400 datos inválidos, 409 horario ocupado, 500 error interno |
| `GET /api/citas` | Lista desde hoy (hora de Colombia) o de una fecha con `?fecha=AAAA-MM-DD`. 400 si la fecha es inválida |

Campos del `POST`: `nombreCliente`, `telefono`, `correo`, `nombreMascota`, `especie` (perro, gato u otro), `fecha`, `hora`, `motivo` (opcional) y `aceptaTratamientoDatos` (debe ser `true`).

La API guarda el nombre, el teléfono y el correo, pero nunca los devuelve.

## Pruebas y calidad

Desde la carpeta `api/`:

```
npm install
npm test
npm run lint
```

`npm test` ejecuta las 21 pruebas unitarias con el ejecutor de Node. Usan un repositorio simulado y no necesitan conexión a Azure. No documentamos una ejecución local completa de la API contra una base de datos, porque no la probamos.

## Despliegue

El código se despliega con GitHub Actions. Un cambio sigue este recorrido: Push o PR, Build, Pruebas, Deploy y Smoke test.

- Un push a `develop` despliega a dev. Si falla una etapa, las siguientes no corren.
- Un PR a `develop` o `main` solo ejecuta Build y Pruebas.
- Si se lanza el workflow a mano con Run workflow, solo corren Build y Pruebas.
- El token de despliegue está en GitHub Secrets (`AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`). No hay credenciales en el repositorio.

La infraestructura se declara en `infra/main.bicep` y se despliega a mano, fuera del pipeline, con Azure CLI sobre un grupo de recursos existente. Revisar `infra/dev.bicepparam` antes de ejecutarlo:

```
az deployment group create --resource-group rg-patitas-dev --parameters infra/dev.bicepparam
```

La cadena de conexión de Cosmos y la de Application Insights las inyecta el Bicep como configuración del Static Web App.

Los detalles, incluido el rollback, están en `docs/diseno-despliegue.md`.

## Costos

| Escenario | Costo mensual | Costo anual |
|---|---|---|
| MVP (dev, desplegado) | USD 3,30 | USD 39,60 |
| Producción (solo diseño) | USD 15,63 | USD 187,50 |

El Excel y las exportaciones de la calculadora están en `docs/costos/`. Los volúmenes son supuestos nuestros y el estimado no incluye los recordatorios por correo, la exportación diaria del respaldo ni la autenticación del personal.

## Qué está implementado y qué no

**Implementado y probado en dev:** agendar y listar citas, el 409 por horario ocupado, el pipeline con pruebas que bloquean el despliegue, el smoke test, ESLint y CodeQL, y el ensayo de rollback con `git revert`.

**Implementado sin probar:** la alerta `alerta-errores-api-dev` (métrica `requests/failed` mayor que 5, con aviso por correo). Está configurada y habilitada, pero no comprobamos que dispare.

**Solo diseño, no construido:** el ambiente de producción, Key Vault con identidad administrada, el plan Standard de Static Web Apps, la exportación diaria del respaldo, los recordatorios por correo y el inicio de sesión del personal.

**Sin demostrar:** la disponibilidad de 99,5 %, la restauración del respaldo y la carga de tres veces el volumen normal. No hicimos pruebas de carga ni de restauración, y no prometemos un RTO de 4 horas con el respaldo periódico de Cosmos DB.

## Documentación

- HLD: `docs/hld/`
- Decisiones de arquitectura: `docs/adr/`
- Diseño de despliegue: `docs/diseno-despliegue.md`
- Costos: `docs/costos/`
- Diagramas: `docs/diagramas/`
- Evidencias: `docs/evidencias/`

## Seguridad

La política de contenido y las demás cabeceras están en `web/staticwebapp.config.json`. El `.gitignore` excluye `.env`, `local.settings.json` y los archivos `*.pem`. Si se publica una credencial por error, hay que rotarla en Azure y no solo borrarla del historial.