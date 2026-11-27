# 4. Seguridad e identidad

## 4.1 Enfoque

Aplicamos tres principios del enunciado: HTTPS, secretos fuera del código y mínimo privilegio. También recogemos pocos datos personales, porque la veterinaria maneja información de sus clientes. Hablamos de **medidas de protección de datos**. No afirmamos que cumplimos la Ley 1581 de 2012, porque eso exigiría una revisión legal que no hicimos.

Separamos lo que está implementado en dev de lo que queda solo como diseño de producción.

## 4.2 Protección de los datos personales

| Medida | Estado |
|---|---|
| Recogemos solo nombre, teléfono, correo, mascota y fecha. No pedimos cédula ni historia clínica. | Implementado |
| El formulario exige marcar la autorización de tratamiento de datos. La API rechaza la cita si el valor no es `true`. | Implementado |
| La API nunca devuelve nombre, teléfono ni correo. El listado solo muestra fecha, hora, mascota, especie, estado e identificador. | Implementado |
| Los errores internos devuelven 500 sin detalles. | Implementado |
| La API valida longitud y formato de cada campo antes de guardar. | Implementado |

Una consecuencia de lo anterior: como la API no devuelve los datos del cliente, el personal tampoco puede consultarlos desde la aplicación. Resolverlo exige autenticación, que se describe en 4.5.

## 4.3 Comunicación y navegador

- El acceso al sitio es por HTTPS, gestionado por Static Web Apps.
- Cosmos DB exige TLS 1.2 como mínimo.
- El archivo `staticwebapp.config.json` define cabeceras de seguridad:

| Cabecera | Efecto |
|---|---|
| Content-Security-Policy | Solo permite scripts, estilos, imágenes y conexiones del mismo origen. Bloquea marcos externos. |
| X-Content-Type-Options: nosniff | Evita que el navegador adivine tipos de archivo. |
| X-Frame-Options: DENY | Impide que otro sitio incruste la página. |
| Referrer-Policy: no-referrer | No envía la dirección de origen a otros sitios. |

- El sitio escribe los textos con `textContent`, sin `innerHTML`, y no usa scripts ni estilos en línea. Así la política de contenido puede ser estricta.

## 4.4 Secretos y mínimo privilegio

**Implementado**

- No hay credenciales en el repositorio. El `.gitignore` excluye `.env`, `local.settings.json`, `*.pem`, `.azure/`, `node_modules/` y los logs.
- El token de despliegue vive en GitHub Secrets (`AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`) y solo sirve para un recurso: el Static Web App de dev.
- La cadena de conexión de Cosmos y la de Application Insights las inyecta el Bicep como configuración del Static Web App. No pasan por el repositorio ni por el pipeline.
- Los workflows usan `permissions: contents: read`. El análisis de CodeQL añade solo `security-events: write` y `actions: read`.
- ESLint y CodeQL revisan el código. No bloquean el despliegue.

**Alternativas evaluadas**

| Alternativa | Por qué no la usamos hoy |
|---|---|
| OIDC con identidad federada entre GitHub y Azure | Exige crear y configurar una identidad en el tenant. Para un solo ambiente y un token de alcance limitado no compensaba el riesgo de plazo. Es la migración prevista para producción. |
| Key Vault con identidad administrada | Requiere Functions propias en plan Standard, y el MVP usa las administradas. Está en el diseño de producción. |

## 4.5 Identidad y acceso

**Hoy no hay autenticación.** Las funciones están configuradas con nivel de autorización `anonymous`, así que cualquier persona con la dirección puede agendar y listar citas. Aceptamos esta limitación para el MVP, porque lo que se expone se limita a fecha, hora y mascota.

Para producción proponemos inicio de sesión para el personal, de modo que solo ellos vean los datos completos de las citas. No lo implementamos ni lo incluimos en la estimación de costos.

| Identidad | Qué puede hacer | Estado |
|---|---|---|
| Cliente anónimo | Agendar una cita y ver la agenda sin datos personales | Implementado |
| GitHub Actions | Desplegar al Static Web App de dev con el token | Implementado |
| Administrador de Azure | Gestionar los recursos del grupo `rg-patitas-dev` | Implementado |
| Personal de la veterinaria | Ver los datos completos de las citas | Solo diseño |
| Identidad administrada de la API | Leer secretos de Key Vault | Solo diseño |

## 4.6 Limitaciones de seguridad

1. Cosmos DB tiene el acceso de red público habilitado, sin reglas de IP ni endpoint privado. La conexión usa una clave. Lo mitigamos con TLS 1.2 y con una cadena que no aparece en el repositorio. Cerrar el acceso exigiría red privada, que supera el presupuesto y el alcance.
2. La API usa una cadena de conexión con clave y no una identidad administrada. Si la clave se filtra, da acceso a toda la cuenta.
3. No hay autenticación del personal.
4. No hay límite de solicitudes ni firewall de aplicaciones web. Un cliente podría llenar la agenda de citas falsas. Lo documentamos como riesgo en la sección 7.
5. No hicimos pruebas de penetración. El análisis estático es el de CodeQL y ESLint.
6. Las acciones de GitHub usan versiones por etiqueta y no por commit fijo.