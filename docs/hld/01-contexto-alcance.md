# 1. Contexto y alcance

## 1.1 Quién es Patitas

Patitas es una veterinaria pequeña con una sola sede. Este documento es parte del proyecto PENU de la Escuela Colombiana de Ingeniería Julio Garavito. Diseñamos la arquitectura en la nube de su sistema de citas y construimos un MVP para comprobarla.

## 1.2 El problema

Hoy la veterinaria agenda citas por llamada o en papel. Eso quita tiempo al personal y deja los datos de los clientes sin protección clara. Queremos que el cliente agende por internet, sin llamadas ni papel, y que sus datos queden protegidos.

## 1.3 Qué incluye el MVP

El MVP está desplegado en el ambiente dev: https://delightful-mud-0d353af0f.8.azurestaticapps.net

- Agendar una cita.
- Listar las citas por día.

Además, rechaza una segunda cita en la misma franja con una respuesta 409. La API guarda el nombre, el teléfono y el correo del cliente, pero nunca los devuelve.

## 1.4 Qué queda fuera

| Fuera del alcance | Dónde lo tratamos |
|---|---|
| Cancelar citas | Sección 2 |
| Consultar las citas con datos completos | Secciones 2 y 4.5 |
| Recordatorios por correo | Secciones 2 y 3.10 |
| Respaldo diario exportado | Sección 5.3 |
| Inicio de sesión del personal | Sección 4.5 |
| Ambiente de producción real | Sección 3.10 |

El personal de la veterinaria hoy usa la misma página que el cliente, sin inicio de sesión.

## 1.5 Cómo leer este documento

Cada vez que describimos algo indicamos si está **implementado**, **solo diseño** o **no demostrado**.

| Sección | Tema |
|---|---|
| 1 | Contexto y alcance |
| 2 | Requisitos y supuestos |
| 3 | Arquitectura y servicios |
| 4 | Seguridad e identidad |
| 5 | Disponibilidad, respaldo y recuperación |
| 6 | Observabilidad y operación |
| 7 | Riesgos y mitigaciones |

Los diagramas están en `docs/diagramas/`: `c4-contexto.png` (personas y sistemas), `arquitectura-cloud.png` (servicios de Azure), `red-seguridad.png` y `pipeline.png`.
