# Diseño de despliegue – Patitas Cloud

Proyecto PENU, Escuela Colombiana de Ingeniería Julio Garavito. Este documento describe cómo llevamos el código del repositorio hasta el sitio publicado en Azure, qué comprobaciones se ejecutan por el camino y cómo volvemos atrás si algo sale mal.

## 1. Resumen

Todo cambio sigue el mismo recorrido: **Push o Pull Request → Build → Pruebas → Deploy → Smoke test**. Lo automatizamos con GitHub Actions y la infraestructura se declara en Bicep. En la última ejecución completa, el recorrido terminó en unos 2 minutos.

Hoy tenemos **un ambiente desplegado de verdad (dev)**. El ambiente de producción está **diseñado y costeado, pero no construido**. Más adelante explicamos por qué.

## 2. Etapas del pipeline

El flujo está en `.github/workflows/deploy.yml`. Cada etapa depende de la anterior: si una falla, las siguientes no se ejecutan.

| Etapa | Qué hace | Qué pasa si falla |
|---|---|---|
| Push / PR | Un push a `develop`, un Pull Request hacia `develop` o `main`, o una ejecución manual dispara el workflow | No aplica |
| Build | Instala las dependencias de la API con `npm ci` y revisa la sintaxis de todo el JavaScript con `node --check` | Se detiene el pipeline; no se prueba ni se despliega |
| Pruebas | Ejecuta las 21 pruebas unitarias con `npm test` (validación de citas y manejadores HTTP, con una base de datos simulada) | **Bloquea el despliegue**; el sitio publicado sigue con la versión anterior |
| Deploy | Publica `web/` y `api/` en Azure Static Web Apps. Solo corre en un push a `develop`: no se ejecuta en un PR ni en una ejecución manual | El sitio queda con la versión anterior |
| Smoke test | Consulta el sitio desplegado hasta 18 veces, cada 10 segundos: la portada debe contener "Patitas" y `/api/health` debe responder que el estado es `ok` (esa ruta consulta Cosmos DB) | El pipeline queda en rojo y avisa que el despliegue no quedó sano |

El workflow usa un grupo de concurrencia por rama, de modo que dos ejecuciones de la misma rama no corren al mismo tiempo y los despliegues no se pisan.

Además hay un segundo workflow, `ci.yml` ("Calidad y seguridad"), con ESLint sobre la API y CodeQL (análisis de seguridad del código JavaScript). Corre en push a `develop` y `main`, en los PR y también se puede lanzar a mano. **Importante:** este workflow es independiente y **no bloquea el despliegue**; lo usamos para detectar problemas y revisarlos. Además, ESLint solo cubre la carpeta `api/`, no `web/`.

## 3. Ambientes

| | dev | prod |
|---|---|---|
| Estado | **Desplegado y en uso** | **Diseñado, no desplegado** |
| Rama | `develop` | `main` |
| Grupo de recursos | `rg-patitas-dev` (Mexico Central) | `rg-patitas-prod` (diseño) |
| Web y API | `swa-patitas-dev`, plan Gratis, East US 2 | Static Web Apps plan Standard, que incluye SLA |
| Base de datos | `cosmos-patitas-dev-xbo7og`, Cosmos DB sin servidor, Mexico Central | Cuenta propia de Cosmos DB sin servidor, con la misma configuración |
| Observabilidad | Application Insights y Log Analytics (tope de 1 GB por día) | Igual, con la misma configuración |
| Parámetros de infraestructura | `infra/dev.bicepparam` | `infra/prod.bicepparam` |

Los dos ambientes salen del **mismo archivo** `infra/main.bicep`; solo cambia el parámetro `entorno`. Así nos aseguramos de que producción sea una copia fiel de dev y no una configuración distinta hecha a mano.

**Por qué no construimos prod:** nos quedaban tres días y priorizamos que el ambiente de dev estuviera completo, probado y con el pipeline funcionando. Construir un segundo ambiente habría consumido tiempo que necesitábamos para los documentos. El diseño y la estimación de costos de producción están completos y son coherentes con lo que ya desplegamos. Según nuestra estimación, producción costaría unos USD 15,63 al mes (ver el documento de costos).

## 4. Ramas y disparadores

| Rama | Para qué sirve | Qué ejecuta |
|---|---|---|
| `feature/*`, `fix/*`, `docs/*` | Trabajo de cada integrante | Al abrir un PR hacia `develop`: Build, Pruebas, ESLint y CodeQL. **No despliega** |
| `develop` | Integración; corresponde al ambiente dev | Al fusionar un PR: Build, Pruebas, Deploy a dev y Smoke test |
| `main` | Versión estable; corresponde al ambiente prod | En el diseño: se actualiza solo mediante un PR desde `develop`. Hoy `main` sigue en el commit inicial del repositorio |

Regla de trabajo: nadie sube directamente a `develop` ni a `main`; todo entra por Pull Request.

## 5. Gestión de secretos

**Qué hacemos hoy:**

- **Token de despliegue en GitHub Secrets.** El secreto `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` guarda el token que permite publicar en `swa-patitas-dev`. Ese token solo sirve para ese recurso y no da acceso al resto de la suscripción. Si se filtra, se regenera en el portal de Azure y se actualiza el secreto.
- **Cadena de conexión de la base de datos fuera del código.** La infraestructura (Bicep) la inyecta directamente como configuración del Static Web App. No aparece en el repositorio ni en el código; la API la lee de variables de entorno.
- **Nada de credenciales en el repositorio.** El `.gitignore` excluye `.env`, `local.settings.json` y `*.pem`.
- **Permisos mínimos en el pipeline.** Los dos workflows declaran `permissions: contents: read`. El job de CodeQL añade `actions: read` y `security-events: write`, que CodeQL necesita para registrar sus resultados, y solo ese job los tiene.

**Alternativas que evaluamos y por qué no las usamos:**

- **OIDC con identidad federada.** Permite que GitHub Actions se autentique en Azure sin guardar ningún secreto de larga duración. Es la opción más segura, pero requiere crear un registro de aplicación en el directorio de la universidad y configurar credenciales federadas, y no queríamos arriesgar el plazo. Para un entorno real, lo recomendaríamos como mejora.
- **Key Vault.** Guardaría la cadena de conexión y la entregaría a la API mediante una identidad administrada. Está en el diseño de producción, pero no lo implementamos: las Functions administradas del Static Web App no permiten esta opción y habría que usar Functions propias en el plan Standard.

## 6. Promoción de cambios

1. Cada integrante trabaja en una rama propia y abre un **Pull Request hacia `develop`**.
2. Al abrir el PR corren Build, Pruebas, ESLint y CodeQL. Si algo falla, se corrige antes de continuar.
3. El otro integrante revisa el PR. Al fusionarlo, el pipeline despliega a dev y ejecuta el smoke test.
4. Con dev estable, se abre un **PR de `develop` hacia `main`** (promoción a producción). En el diseño de prod, este paso exigiría una aprobación manual mediante un entorno protegido de GitHub antes de desplegar.

## 7. Rollback

Hay tres formas de volver a una versión anterior, de la más a la menos frecuente.

**a) Revertir el cambio en Git (camino normal).** Se ejecuta `git revert` sobre el commit o el merge problemático y se abre un PR con la reversión. Al fusionarlo, el pipeline despliega de nuevo el estado anterior. Tarda lo mismo que cualquier despliegue (unos 2 minutos) y deja registro de qué se revirtió y por qué.

**b) Repetir una ejecución anterior que salió bien.** En la pestaña Actions se elige una ejecución exitosa anterior y se usa *Re-run all jobs*. GitHub vuelve a desplegar el código de ese commit. Es rápido, pero no deja el repositorio coherente con lo publicado, por eso la usamos solo como emergencia.

**c) Infraestructura.** Se vuelve a ejecutar `az deployment group create` con la versión anterior del Bicep, tomada desde el historial de Git.

**Ensayo del rollback.** Ensayamos el camino a) la noche del 25 de noviembre de 2026. Cambiamos el título de la página con el PR #9 y el pipeline lo desplegó (ejecución #13, con Build, Pruebas, Deploy y Smoke test en verde). Después revertimos ese merge con `git revert -m 1` en un segundo PR. El pipeline volvió a desplegar y el sitio quedó con el título original. No ensayamos las formas b) ni c).

**Límites que debemos reconocer:**

- El rollback del pipeline cubre el **código**, no los **datos**. Si hay que recuperar citas borradas o dañadas, la base de datos tiene un respaldo periódico (cada 4 horas, con retención de 7 días), pero en este modo la restauración se solicita a soporte de Azure y no podemos garantizar el tiempo de respuesta. Por eso **no prometemos un RTO de 4 horas** con esta configuración. El respaldo continuo permitiría restaurar por cuenta propia, pero no verificamos que esté disponible en la región elegida con Cosmos DB sin servidor.
- Un despliegue de infraestructura en modo incremental no elimina los recursos que ya existen.

## 8. Verificaciones que dan confianza al despliegue

- **Pruebas que bloquean el despliegue:** el job de Deploy depende del de Pruebas. Una prueba en rojo impide la publicación.
- **Smoke test contra el sitio real:** comprueba la portada y la ruta de salud, que a su vez consulta la base de datos.
- **Análisis de código:** ESLint y CodeQL en un workflow aparte (informativo).

## 9. Limitaciones y mejoras

- Solo el ambiente dev está desplegado. Producción está diseñada y costeada, no construida.
- El despliegue usa un token en GitHub Secrets; en producción lo cambiaríamos por OIDC.
- ESLint y CodeQL no bloquean el despliegue, y ESLint no revisa `web/`.
- No hay aprobación manual antes de desplegar, porque dev no la necesita.
- Si se lanza el workflow a mano desde la pestaña Actions, solo corren Build y Pruebas; el despliegue exige un push a `develop`.
- GitHub muestra avisos de que Node.js 20 quedará obsoleto en las acciones `checkout` y `setup-node`; son informativos y no afectan el resultado.
- El MVP no tiene autenticación; en producción el personal vería los datos completos con inicio de sesión.

## 10. Evidencias

En `docs/evidencias/` están las capturas del pipeline con las cuatro etapas en verde (`02-pipeline-dev-cuatro-etapas-verde.png`) y de la prueba del horario ocupado (`03-horario-ocupado-409.png`). El diagrama del pipeline está en `docs/diagramas/` (`pipeline.drawio` y `pipeline.png`). La alerta de errores del API (`alerta-errores-api-dev`, métrica `requests/failed` mayor que 5) está en `05-alerta-errores-api.png`. La alerta está configurada y habilitada, pero no probamos que dispare.
