# ADR-004: Gestión de secretos

**Estado:** aceptado.

## Contexto

El pipeline necesita permiso para publicar en Azure y la API necesita una cadena de conexión para llegar a Cosmos DB. Ninguno de los dos secretos puede estar en el repositorio, que es público. El plazo era corto y dev tiene un solo ambiente.

## Alternativas evaluadas

**A. Token del Static Web App en GitHub Secrets y cadena de Cosmos inyectada por el Bicep.**
El token vive en el secreto `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`. El Bicep inyecta la cadena como configuración del Static Web App.

**B. OIDC con identidad federada entre GitHub y Azure.**
GitHub Actions se autentica en Azure sin guardar un secreto de larga duración.

**C. Key Vault con identidad administrada.**
La cadena de conexión se guarda en Key Vault y la API la lee con su identidad.

## Decisión

Elegimos la alternativa A. Las alternativas B y C quedan como migración para producción.

## Justificación

- **Alcance limitado.** El token sirve para un solo recurso, el Static Web App de dev. No da acceso al resto de la suscripción.
- **La cadena no pasa por el repositorio.** El Bicep la inyecta como configuración. Tampoco pasa por el pipeline.
- **Por qué no OIDC todavía.** Exige crear un registro de aplicación en el directorio y configurar credenciales federadas. Para un solo ambiente y un token de alcance limitado, no compensaba el riesgo de plazo.
- **Por qué no Key Vault todavía.** Requiere Functions propias en plan Standard. El MVP usa las Functions administradas del Static Web App, que no permiten esta opción.

## Consecuencias

**Costo.** No añade costo. Key Vault no está incluido en la estimación de dev.

**Beneficios.**
- Sin credenciales en el repositorio.
- Configuración simple que ya funciona en dev.

**Riesgos y trade-offs.**
- El token es un secreto de larga duración. Si se filtra, se regenera en el portal y se actualiza el secreto.
- Hay un solo token de despliegue.
- La cadena de Cosmos usa una clave. Si se filtra, da acceso a toda la cuenta.
- La cadena queda como configuración del Static Web App y no en un almacén de secretos con auditoría.
- Los dos secretos se rotan a mano. No probamos una rotación.

## Qué revisaríamos en producción

Migraríamos el pipeline a OIDC. Guardaríamos la cadena en Key Vault y la API la leería con una identidad administrada, con Functions propias en plan Standard. Esto también cambia el costo, que habría que recalcular. Ver la sección 4.4 del HLD.
