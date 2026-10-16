# SIGRA — integración de datos por rol

## Vistas entregadas

- `/profesor/asignaturas` carga `GET /api/v1/asignaturas/mias` con el Bearer de la sesión.
- `/estudiante/materias` usa el mismo endpoint y no recibe un UUID de estudiante desde la interfaz.
- El profesor puede seleccionar una asignatura, consultar sus RA mediante
  `GET /api/v1/asignaturas/{id}/resultados-aprendizaje` y abrir `/profesor/matricula` con la
  asignatura preseleccionada.
- `/profesor/matricula` solo acepta la preselección si el ID está en el catálogo autorizado que el
  backend devolvió para ese profesor. La consulta real siempre exige asignatura y semestre.

## Datos mostrados

Las tarjetas muestran código, nombre, programa, estado, cantidad de RA activos, cantidad de
estudiantes activos y profesores responsables, todos provenientes de `MiAsignaturaDTO`.

El contrato actual de `/asignaturas/mias` no incluye semestre de matrícula. La vista de estudiante
no pinta un semestre inventado ni consulta `/estudiantes/{id}/asignaturas` con un UUID arbitrario.

## Estados de interfaz

Las vistas tienen estados explícitos de carga, error, colección vacía y contenido. Los errores `401`,
`403` y `5xx` pasan por el traductor común de errores; no se muestra el cuerpo técnico del servidor.
Las rutas siguen protegidas por guard de autenticación y rol, y el interceptor adjunta JWT solo a la
API propia.

## Validación local

```text
npm run build
npm test -- --watch=false
```

La prueba completa debe ejecutarse también con el backend y PostgreSQL QA disponibles para cubrir
E2E y contratos HTTP reales. Los módulos de evaluaciones, notas, estadísticas, reportes e historial
siguen pendientes porque no existe soporte backend completo para ellos.
