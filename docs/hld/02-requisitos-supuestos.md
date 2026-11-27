# 2. Requisitos y supuestos

## 2.1 Requisitos funcionales

| Requisito | Estado |
|---|---|
| Agendar una cita | Implementado |
| Listar las citas | Implementado (sin datos personales del cliente) |
| Cancelar una cita | No implementado |
| Consultar una cita con datos completos | Solo diseño, exige inicio de sesión del personal |
| Recordatorios por correo | Solo diseño |

## 2.2 Requisitos no funcionales

Son los que fija el profesor. Usamos tres estados: **implementado**, **solo diseño** y **no demostrado**.

| Requisito | Estado | Detalle |
|---|---|---|
| Costo máximo de USD 150 al mes en producción | Solo diseño | Estimamos USD 15,63 al mes. Producción no está construida. |
| Disponibilidad de 99,5 % en horario comercial | No demostrado | El plan Free de dev no tiene SLA. No medimos la disponibilidad. |
| HTTPS | Implementado | Lo gestiona Static Web Apps. Cosmos DB exige TLS 1.2. |
| Secretos fuera del código | Implementado | Token en GitHub Secrets. Cadena de Cosmos inyectada por el Bicep. |
| Mínimo privilegio | Implementado en parte | Token de un solo recurso y `permissions: contents: read`. La identidad administrada es solo diseño. |
| Respaldo con RPO de 24 h | Implementado, sin probar la restauración | Copias cada 4 horas con retención de 7 días. |
| RTO de 4 h | No demostrado | La restauración la solicita soporte de Azure. No la prometemos. |
| Soportar 3 veces la carga | No demostrado | No hicimos prueba de carga. |
| Logs centralizados | Implementado | Log Analytics, retención de 30 días. |
| Métricas | Implementado | Application Insights. |
| Al menos una alerta | Implementado, sin probar que dispare | `alerta-errores-api-dev`. Ver la sección 6. |

## 2.3 Supuestos

- Patitas tiene una sola sede.
- Calculamos unas 40 citas diarias y hasta 120 en temporada alta.
- Atendemos de lunes a sábado, de 7:00 a 19:00, con citas cada 30 minutos. La última es a las 18:30.
- Un 99,5 % de disponibilidad equivale a unas 1,5 horas de caída tolerada al mes. Es un cálculo propio.
- Guardamos datos mínimos: nombre, teléfono, correo, mascota y fecha. No pedimos cédula ni historia clínica.

## 2.4 Datos personales

Aplicamos **medidas de protección de datos** frente a la Ley 1581 de 2012. No afirmamos cumplimiento legal, porque no hicimos una revisión legal. El detalle está en la sección 4.2.
