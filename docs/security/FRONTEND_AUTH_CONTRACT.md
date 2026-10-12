# Contrato de autenticación del frontend

Este documento fija lo que el frontend consume. La autoridad de autenticación y autorización es
Spring Boot; Angular no verifica firmas JWT ni decide propiedad de recursos.

## Login

- `POST /api/v1/auth/login`
- Request: `{ "correoInstitucional": string, "contrasena": string }`.
- El correo se recorta y normaliza a minúsculas; la contraseña se envía intacta.
- Response `200`: `{ token: string, tipo: "Bearer", expiraEn: number, usuario: { id, nombreCompleto, correoInstitucional, rol } }`.
- `expiraEn` está expresado en segundos desde la respuesta; el JWT debe incluir `exp` en segundos.
- Roles admitidos: `ADMINISTRADOR`, `PROFESOR`, `ESTUDIANTE`.

## Política de sesión

`SessionService` exige un JWT de tres segmentos, un `exp` finito y futuro, `tipo: Bearer`, TTL
positivo y un usuario con rol conocido. Esto es validación de forma y caducidad para evitar estado
incoherente en la interfaz; no constituye verificación criptográfica. Nunca se comparte un secreto
HS256 con el navegador.

La sesión se guarda solo en `sessionStorage` y nunca contiene contraseñas. El backend debe volver a
validar firma, expiración, rol, alcance y propiedad en cada endpoint.

## Estados HTTP

| Estado | Tratamiento de UI |
| --- | --- |
| `400` | Validación funcional del formulario o recurso |
| `401` | Login: credenciales inválidas. API privada: limpia solo la sesión cuyo token falló |
| `403` | El feature muestra error contextual; no se cierra sesión ni se navega globalmente |
| `413` | Contenido demasiado grande |
| `423` | Cuenta temporalmente bloqueada |
| `5xx` | Mensaje genérico sin cuerpo técnico |

El backend debería devolver `X-Request-Id` para soporte. El frontend lo puede mostrar como
identificador técnico, nunca como sustituto de la autorización.

## Estado de este contrato

Debe cotejarse con el SHA del backend usado por E2E antes de marcar la integración como PASS. Este
checkout no contiene ese backend ni sus migraciones/semillas.
