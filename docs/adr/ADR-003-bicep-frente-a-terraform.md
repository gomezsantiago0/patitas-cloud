# ADR-003: Bicep frente a Terraform para la infraestructura como código

**Estado:** aceptado.

## Contexto

Necesitamos declarar la infraestructura de Patitas en código para poder repetirla en dev y en producción sin hacer clics en el portal. El equipo son dos estudiantes, el plazo es corto y toda la infraestructura está en Azure. El enunciado pide infraestructura como código pero no obliga a una herramienta concreta.

## Alternativas evaluadas

**A. Bicep.**
Lenguaje declarativo propio de Azure que se compila a plantillas ARM. Se despliega con Azure CLI.

**B. Terraform.**
Herramienta de HashiCorp con soporte para muchas nubes. Guarda un archivo de estado que hay que conservar y proteger.

## Decisión

Elegimos la alternativa A, Bicep, con un solo archivo `infra/main.bicep` y un parámetro `entorno` (dev o prod). Dev y producción salen del mismo archivo con archivos de parámetros distintos.

## Justificación

- **Solo usamos Azure.** No necesitamos la portabilidad entre nubes de Terraform.
- **Sin archivo de estado propio.** Azure Resource Manager conoce el estado de los recursos. Con Terraform tendríamos que guardar y proteger un archivo de estado, y ese archivo puede contener secretos.
- **Menos herramientas.** Bicep se despliega con `az deployment group create`, que ya tenemos instalado. No añadimos otro programa ni otro proveedor al pipeline.
- **Cobertura inmediata.** Bicep soporta los recursos de Azure desde que existen. Usamos Static Web Apps, Cosmos DB, Application Insights y Log Analytics sin problemas.
- **Plazo.** Para un equipo de dos personas con pocos días, la opción más simple reduce el riesgo de errores.

## Consecuencias

**Costo.** Bicep no tiene costo de licencia ni de servicio. No aparece en la estimación de costos.

**Beneficios.**
- Un solo archivo describe toda la infraestructura de un ambiente.
- Dev y producción comparten la misma definición.

**Riesgos y trade-offs.**
- **Dependencia de Azure.** Si el negocio migrara a otra nube, habría que reescribir la infraestructura.
- **Despliegue manual.** La infraestructura se despliega a mano con `az deployment group create`, fuera del pipeline. Un cambio en `main.bicep` no se aplica solo. Lo aceptamos porque la infraestructura cambia poco, pero es una limitación.
- **Cadena de conexión en la configuración.** El Bicep lee la cadena de Cosmos y la inyecta como configuración del Static Web App. Esa cadena queda en el resultado del despliegue de Azure, no en el repositorio.
- **Menos comunidad.** Terraform tiene más ejemplos y módulos públicos. No evaluamos qué tan grande es esa diferencia.
- **Límite de este ADR.** No probamos Terraform en este proyecto. La comparación es cualitativa.

## Qué revisaríamos en producción

Pasaríamos el despliegue de la infraestructura al pipeline, con una aprobación manual antes de aplicar cambios. Si el equipo creciera o usara otras nubes, reevaluaríamos Terraform.