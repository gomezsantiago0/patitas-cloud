# ADR-001: Azure Static Web Apps frente a Azure App Service

**Estado:** aceptado.

## Contexto

Patitas necesita publicar un sitio web con una API pequeña. Calculamos unas 40 citas diarias, hasta 120 en temporada alta. El presupuesto máximo es de USD 150 al mes y el equipo tiene pocas horas para construir y operar la solución. Queremos HTTPS y no queremos administrar servidores.

## Alternativas evaluadas

**A. Azure Static Web Apps.**
Sirve el sitio estático y una API con Azure Functions administradas. En producción proponemos el plan Standard, que cuesta USD 9 al mes. En dev usamos el plan Free.

**B. Azure App Service, plan Basic B1.**
Servicio de aplicaciones web con un servidor dedicado. Con Windows, región West US, 1 instancia y 730 horas al mes, cuesta USD 54,75 al mes, es decir, USD 657 al año.

**Aclaración.** La comparación mezcla región y sistema operativo distintos. La alternativa A la calculamos para nuestra configuración y la B con Windows en West US. Sirve como orden de magnitud y no como comparación exacta.

## Decisión

Elegimos la alternativa A, Azure Static Web Apps. Usamos el plan Free en dev y proponemos el plan Standard para producción.

## Justificación

- **Mismo origen.** El sitio y la API comparten la misma dirección. No configuramos CORS.
- **HTTPS incluido.** La plataforma lo gestiona.
- **Sin servidor que administrar.** No parchamos ni dimensionamos máquinas.
- **Costo menor en la comparación.** USD 9 al mes frente a USD 54,75 al mes, con la aclaración anterior.
- **Se integra con GitHub Actions.** El pipeline publica `web/` y `api/` con un token.

## Consecuencias

**Costo.** Dev usa el plan Free. Producción costaría USD 9 al mes en el plan Standard, que no construimos.

**Beneficios.**
- Poco trabajo de configuración y operación.
- Despliegue simple desde el pipeline.

**Riesgos y trade-offs.**
- **Sin SLA en dev.** El plan Free no tiene SLA. Por eso dev no sirve como evidencia de una disponibilidad de 99,5 %. Solo el plan Standard trae SLA.
- **Funciones administradas.** No permiten usar una identidad administrada con Key Vault. Para eso haría falta traer Functions propias en plan Standard. Lo tratamos en el ADR-004.
- **Menos control.** No elegimos el sistema operativo ni el tamaño del servidor.
- **Regiones.** El servicio solo existe en pocas regiones. La web está en East US 2 y los datos en Mexico Central, y esa distancia añade latencia que no medimos.
- **Precio de App Service.** Es el que obtuvimos en la calculadora de Azure. No lo probamos con un despliegue real.

## Qué revisaríamos en producción

Confirmaríamos el plan Standard y su SLA. Revisaríamos App Service si necesitáramos un servidor propio, procesos largos o identidad administrada sin cambiar de servicio.
