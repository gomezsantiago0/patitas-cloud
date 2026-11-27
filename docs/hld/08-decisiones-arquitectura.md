# 8. Decisiones de arquitectura

Registramos cada decisión importante como un ADR, que es un registro de decisión de arquitectura. Los ADR están en la carpeta `docs/adr/`. Cada uno explica el contexto, las alternativas que evaluamos, la decisión con su justificación y las consecuencias, con su costo, sus riesgos y sus trade-offs.

Documentamos cuatro decisiones, y el mínimo que pide el profesor es tres.

| ADR | Tema | Decisión |
|---|---|---|
| ADR-001 | Static Web Apps con Functions frente a App Service | Elegimos Static Web Apps con Functions administradas. |
| ADR-002 | Cosmos DB frente a Azure SQL | Elegimos Cosmos DB for NoSQL en modo sin servidor. |
| ADR-003 | Bicep frente a Terraform | Elegimos Bicep. |
| ADR-004 | Secretos: GitHub Secrets frente a OIDC y Key Vault | Elegimos un token en GitHub Secrets y la cadena de conexión inyectada por Bicep. OIDC y Key Vault quedan como migración a producción. |

## Cómo se relacionan

Las cuatro decisiones cubren la plataforma de aplicación (ADR-001), los datos (ADR-002), la infraestructura como código (ADR-003) y el manejo de secretos (ADR-004).

## Una aclaración sobre las cifras

En el ADR-001 comparamos Static Web Apps Standard, que cuesta USD 9 al mes, con App Service Basic B1, que cuesta USD 54,75 al mes. Las dos cifras salen de la calculadora de Azure, pero la comparación mezcla regiones y sistemas operativos distintos. Por eso la usamos como orden de magnitud y no como una comparación exacta.

El texto completo de cada ADR sigue a esta sección.