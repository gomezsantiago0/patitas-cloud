# ADR-002: Cosmos DB for NoSQL frente a Azure SQL Database

**Estado:** aceptado.

## Contexto

Patitas necesita guardar citas: fecha, hora, datos del cliente y de la mascota, y estado. El MVP solo agenda y lista citas. Calculamos unas 40 citas diarias, hasta 120 en temporada alta, con tráfico bajo e irregular. El presupuesto máximo es de USD 150 al mes y el equipo tiene pocas horas para construir y operar la solución.

Una regla del negocio es importante: no pueden existir dos citas en la misma franja. Además, queremos que el servicio no exija administrar servidores.

## Alternativas evaluadas

**A. Azure Cosmos DB for NoSQL, modo sin servidor.**
Base de datos de documentos administrada. Se paga por las operaciones que se usan y por el almacenamiento.

**B. Azure SQL Database.**
Base de datos relacional administrada. Ofrece tablas, restricciones y transacciones con SQL estándar.

## Decisión

Elegimos la alternativa A, Cosmos DB for NoSQL en modo sin servidor, con una cuenta por ambiente.

## Justificación

- **Costo bajo y proporcional al uso.** En la calculadora, el escenario MVP con Cosmos sin servidor en Mexico Central cuesta USD 1,65 al mes y el de producción USD 4,675 al mes. No cotizamos Azure SQL, así que no comparamos precios y no afirmamos que Cosmos sea más barato.
- **Modelo simple para este caso.** Una cita es un documento independiente. No hay relaciones entre tablas en el MVP.
- **Unicidad de la franja.** El identificador de cada cita es `fecha_hora`, por ejemplo `2026-11-26_0930`. Cosmos rechaza un segundo documento con el mismo identificador dentro de la misma partición y la API lo traduce en una respuesta 409. Esto funciona incluso con solicitudes simultáneas.
- **Integración sencilla con la API.** Las Azure Functions usan el SDK de Cosmos con una cadena de conexión que inyecta el Bicep.
- **Sin servidores que administrar.** El modo sin servidor asigna capacidad según la demanda.

## Consecuencias

**Costo.** Es el que muestra el Excel de costos. No incluye el respaldo continuo ni la exportación diaria a Blob Storage.

**Beneficios.**
- Poco trabajo de configuración y operación.
- El costo sigue la carga real.

**Riesgos y trade-offs.**
- **Recuperación de datos.** Con el respaldo periódico, la restauración se solicita a soporte de Azure y no es autoservicio. Por eso no prometemos un RTO de 4 horas. Creemos que Azure SQL ofrece restauración a un punto en el tiempo por cuenta propia, pero **no lo verificamos** y lo revisaríamos antes de una migración.
- **Consultas.** La clave de partición es `/fecha`. Listar las citas desde hoy puede consultar varias particiones. Con el volumen esperado lo consideramos aceptable, pero **no lo medimos**.
- **Reportes.** Si la veterinaria necesitara reportes con uniones y agregaciones complejas, un modelo relacional sería más cómodo.
- **Dependencia del proveedor.** El modelo de documentos y el SDK de Cosmos hacen más costosa una migración futura.
- **Acceso de red.** La cuenta tiene el acceso público habilitado y la API usa una clave. Lo tratamos en las secciones 4 y 7 del HLD.
- **Límite de este ADR.** Es una comparación cualitativa. No cotizamos ni probamos Azure SQL.

## Qué revisaríamos en producción

Valoraríamos Azure SQL si el negocio crece hacia reportes, facturación o historia clínica, o si la restauración por cuenta propia pesa más que el costo.