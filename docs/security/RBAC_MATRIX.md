# Matriz RBAC del frontend

| Prefijo | Rol permitido |
| --- | --- |
| `/admin/**` | `ADMINISTRADOR` |
| `/profesor/**` | `PROFESOR` |
| `/estudiante/**` | `ESTUDIANTE` |
| `/login` | visitante sin sesión; una sesión vigente va a su inicio |
| `/acceso-denegado` | ruta de presentación de `403` |

La matriz solo controla navegación y experiencia. El backend debe validar JWT, rol, propiedad y
alcance en cada petición.

