# 6. Observabilidad y operación

## 6.1 Telemetría y logs

| Componente | Función | Estado |
|---|---|---|
| Application Insights (`appi-patitas-dev`) | Recibe la telemetría de la API | Implementado |
| Log Analytics (`log-patitas-dev`) | Guarda los logs. Retención de 30 días y tope de 1 GB al día | Implementado |

Los dos recursos se declaran en `infra/main.bicep`. Application Insights envía sus datos a Log Analytics.

## 6.2 Alerta de métrica

| Parámetro | Valor |
|---|---|
| Nombre | `alerta-errores-api-dev` |
| Métrica | `requests/failed` |
| Condición | Mayor que 5 |
| Evaluación | Cada 5 minutos, con retrospectiva de 15 minutos |
| Gravedad | 2 |
| Aviso | Correo electrónico |
| Estado | Habilitada |

La alerta está configurada y habilitada. **No probamos que dispare ni que llegue el correo.** La creamos en el portal de Azure y no está en el Bicep. La captura está en `docs/evidencias/05-alerta-errores-api.png`.

## 6.3 Alerta de presupuesto

Hay un presupuesto de USD 30 al mes, con avisos al 50 % (USD 15) y al 90 % (USD 27) sobre el coste real. También lo creamos en el portal. La captura está en `docs/evidencias/04-presupuesto-alertas.png`.

## 6.4 Operación

- **Pipeline y smoke test.** Cada push a `develop` pasa por Build, Pruebas, Deploy y Smoke test. El detalle está en `docs/diseno-despliegue.md`.
- **Ruta `/api/health`.** Consulta la base de datos. Responde 200 si está bien y 503 si no. El smoke test la usa.
- **Rollback.** Revertimos el cambio con `git revert` y un PR, y el pipeline despliega de nuevo. Lo ensayamos el 25/11/2026. Cubre el código y no los datos. Ver `docs/diseno-despliegue.md`, sección 7.

## 6.5 Lo que no tenemos

- No hay un panel (dashboard).
- No hay alertas de disponibilidad.
- No probamos que la alerta de errores dispare ni que llegue el correo.
- No hay alertas sobre Cosmos DB.
- La alerta de errores y el presupuesto no están en el Bicep.
