# 7. Riesgos y mitigaciones

Estos son riesgos reales de lo que construimos. La mitigación de hoy indica lo que ya existe. La propuesta de producción es solo diseño.

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| 1 | Cosmos DB tiene el acceso de red público habilitado, sin reglas de IP ni endpoint privado. | Quien obtenga la clave podría conectarse desde internet. | Hoy: TLS 1.2 y cadena fuera del repositorio. Producción: evaluar red privada, que supera el presupuesto actual. |
| 2 | La API usa una cadena de conexión con clave y no una identidad administrada. | Si la clave se filtra, da acceso a toda la cuenta. | Hoy: la cadena la inyecta el Bicep y no está en el repositorio. Producción: Key Vault con identidad administrada. |
| 3 | El MVP no autentica al personal. | Cualquier persona con la dirección puede agendar y listar citas. | Hoy: la API solo devuelve fecha, hora y mascota. Producción: inicio de sesión del personal. |
| 4 | Static Web Apps en plan Free no tiene SLA. | No podemos respaldar el 99,5 % con dev. | Producción: plan Standard, que incluye SLA y cuesta USD 9 al mes. |
| 5 | La restauración del respaldo la hace soporte de Azure, sin RTO garantizado. | Una pérdida de datos podría tardar más de 4 horas en resolverse. | Hoy: copias cada 4 horas con retención de 7 días. Producción: revisar el respaldo continuo si está disponible. |
| 6 | No hicimos prueba de carga de 3 veces el volumen. | No sabemos si el sistema soporta la temporada alta. | Producción: prueba de carga antes de lanzar. |
| 7 | Hay un solo token de despliegue. | Si se filtra, permite publicar en el Static Web App. | Hoy: sirve para un solo recurso y se regenera en el portal. Producción: OIDC con identidad federada. |
| 8 | No hay límite de solicitudes. | Alguien podría llenar la agenda con citas falsas. | Hoy: validación de datos y rechazo de franjas ocupadas. Producción: límite de solicitudes o un firewall de aplicaciones web. |
| 9 | No hicimos pruebas de penetración. | Pueden existir fallos que el análisis estático no detecta. | Hoy: ESLint y CodeQL. Producción: pruebas de penetración. |
| 10 | La infraestructura se despliega a mano. | Un error manual puede dejar dev y producción distintos. | Hoy: ambos salen del mismo `main.bicep`. Producción: desplegar el Bicep desde el pipeline. |
