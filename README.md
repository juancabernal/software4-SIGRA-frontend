# SIGRA — Frontend

**Software Integral de Gestión de Resultados de Aprendizaje**
Universidad Católica de Oriente · Ingeniería de Software 4 · Equipo B · 2026

Aplicación web responsive en Angular que consume la API de [SIGRA Backend](https://github.com/juancabernal/software4-SIGRA-backend).

---

## 1. Integrantes

| Nombre | Rol en el proyecto | Correo |
| --- | --- | --- |
| Juan Camilo Bernal Carmona | Project Manager, Arquitecto y Desarrollador Backend | juan.bernal8928@uco.net.co |
| Jean Paul Ortiz Restrepo | Líder Técnico y Analista de Requisitos | jean.ortiz1424@uco.net.co |
| José Alejandro Valencia | Desarrollador Backend y Base de Datos | jose.valencia1373@uco.net.co |
| Simón Tabares Arias | Analista de Requisitos y Calidad (QA) | simon.tabares2225@uco.net.co |
| Juan José Narváez Marín | Ingeniero de Pruebas (QA/Testing) | juan.narvaez9044@uco.net.co |
| Santiago Torres Castaño | Diseñador UX/UI y Desarrollador Frontend | santiago.torres0381@uco.net.co |
| Andrés Felipe Vélez Alcaraz | Desarrollador Frontend | andres.velez5136@uco.net.co |

Docente y cliente del proyecto: **Luz Mery Ríos Alzate**.

---

## 2. Propósito

Este repositorio contiene la **interfaz de usuario** de SIGRA: una aplicación web responsive, accesible desde navegador en escritorio y móvil, sin aplicación nativa.

Su propósito es ofrecer **tres experiencias diferenciadas según el rol** del usuario autenticado:

| Rol | Qué hace en la aplicación |
| --- | --- |
| **Administrador** | Gestiona el catálogo base (profesores, programas, asignaturas, RA y semestres), asigna profesores a asignaturas y consulta los reportes de supervisión y el historial de auditoría |
| **Profesor** | Crea evaluaciones por RA, registra notas y observaciones, consulta estadísticas y conclusiones de sus asignaturas, y registra acciones de mejora |
| **Estudiante** | Consulta en modo lectura sus propias notas, observaciones, RA y niveles de logro |

El frontend no contiene reglas de negocio: valida la entrada para dar una buena experiencia, pero toda decisión de autorización y todo cálculo se resuelven en el backend. **Ocultar una opción del menú nunca es el mecanismo de control de acceso** (RF-05, RNF-13).

Requisitos de experiencia que el frontend debe cumplir:

- Carga completa de página en menos de 3 segundos en el 95 % de los casos, con conexión de al menos 5 Mbps (RNF-08).
- Accesibilidad WCAG 2.1 nivel AA: contraste mínimo 4.5:1, navegación completa por teclado en los formularios de notas y observaciones, y etiquetas descriptivas (`label` / ARIA) en todos los campos (RNF-21).
- Funcionamiento correcto en las dos últimas versiones estables de Chrome, Edge y Firefox, en escritorio y Android (RNF-19).

---

## 3. Funcionalidad por integrante

Las vistas se construyen en paralelo con el módulo backend correspondiente. Cada integrante entrega la pantalla de la funcionalidad que implementa.

### Sprint 1 — Catálogo y seguridad (30/09/2026 – 05/10/2026)

| Integrante | Vistas y componentes | Requisitos |
| --- | --- | --- |
| José Alejandro Valencia | Pantalla de login con la identidad visual de los mockups; mensajes de error sin detalles técnicos | RF-04, RNF-17 |
| José Alejandro Valencia | Guards de rutas, interceptor HTTP que adjunta el token y menú lateral distinto por rol | RF-05 |
| Juan Camilo Bernal | Vista de administrador de asignaturas con badges de estado (texto + ícono) | RF-03 |
| Jean Paul Ortiz | Listado de profesores, formulario de registro y confirmación de inactivación | RF-01 |
| Juan José Narváez | Vista de RA dentro del detalle de la asignatura | RF-06 |
| Simón Tabares | Listado de programas académicos, formulario y confirmación | RF-02 |
| Santiago Torres | Listado y formulario de registro de semestres | RF-Semestre |
| Andrés Vélez | Vista de registro y listado de estudiantes para administrador y profesor | RF-09a |

### Sprint 2 — Operación académica (06/10/2026 – 12/10/2026)

| Integrante | Vistas y componentes | Requisitos |
| --- | --- | --- |
| Jean Paul Ortiz | Asignación docente con selección múltiple y resumen del resultado | RF-07 |
| Andrés Vélez | Vista de matrícula para administrador y profesor, con confirmación extra si hay calificaciones | RF-08, RF-09 |
| Juan José Narváez | Vista del profesor: evaluaciones por RA con el porcentaje acumulado visible | RF-10, RF-11 |
| Simón Tabares | Planilla de notas por evaluación, con el ícono ⚠ de registro fuera de fecha | RF-12, RF-13 |
| Santiago Torres | Badges de nivel de logro (texto, ícono y color) y vista de estadísticas del profesor | RF-14, RF-15 |
| Juan Camilo Bernal | Mensaje de conclusión en la vista de estadísticas, con opción de crear acción de mejora | RF-16 |
| José Alejandro Valencia | Reporte de historial de auditoría para administrador, con filtros y paginación | RF-19, RF-21c |

### Sprint 3 — Cierre del ciclo y reportes (13/10/2026 – 19/10/2026)

| Integrante | Vistas y componentes | Requisitos |
| --- | --- | --- |
| Juan Camilo Bernal | Registro de acción de mejora y conversión a evaluación, mostrando la evaluación generada | RF-17, RF-18 |
| Santiago Torres | Vista consolidada del profesor, reporte de RA por asignatura, reporte de logro por programa y vista del estudiante con «Sin evaluar» | RF-20, RF-21a/b, RF-22 |

### Responsabilidades transversales

| Integrante | Responsabilidad |
| --- | --- |
| Santiago Torres | Diseño UX/UI, guía visual y maquetación responsive del sistema |
| Andrés Vélez | Desarrollo frontend y manual de instalación |
| Santiago Torres | Manual de usuario (una sección por rol, con capturas) |
| Juan José Narváez | Accesibilidad con axe y Lighthouse, y compatibilidad en Chrome, Edge y Firefox |

---

## 4. Empaquetado

### Artefacto

Angular compila la aplicación a un conjunto de archivos estáticos (HTML, CSS y JavaScript) que se sirven desde cualquier servidor web o CDN:

```bash
npm run build
# → dist/<nombre-del-proyecto>/browser/
```

El nombre exacto de la carpeta de salida es el que esté declarado en `angular.json`, bajo `projects.<nombre>.architect.build.options.outputPath`. Todo lo que esté en `public/` se copia tal cual a esa carpeta.

El build de producción aplica *tree shaking*, minificación y *hashing* de nombres de archivo para el control de caché.

### Estructura del proyecto

```
software4-SIGRA-frontend/
├── .vscode/                  Configuración compartida del editor
├── public/                   Recursos servidos tal cual (favicon, imágenes, fuentes)
├── angular.json              Configuración del workspace y de los builds
├── package.json              Dependencias y scripts
├── tsconfig.json             Configuración de TypeScript
└── src/
    ├── index.html
    ├── main.ts               Punto de arranque y configuración de la aplicación
    ├── styles.css            Estilos globales y variables de la guía visual
    └── app/
        ├── app.routes.ts     Rutas raíz con carga diferida por módulo
        ├── core/             Infraestructura transversal: se instancia una sola vez
        │   ├── guards/       AuthGuard y RoleGuard
        │   ├── interceptors/ Token JWT y manejo global de errores
        │   ├── layout/       Shell, encabezado y menú lateral por rol
        │   ├── models/       Modelos transversales: Usuario, Rol, Sesión, respuestas de la API
        │   └── services/     Servicios transversales: sesión, almacenamiento, notificaciones
        ├── features/         Un módulo de negocio por carpeta
        │   ├── asignaturas/           RF-03 y gestión de semestres
        │   ├── auditoria/             RF-19, RF-21c
        │   ├── auth/                  RF-04
        │   ├── calificaciones/        RF-12, RF-13
        │   ├── estadisticas/          RF-14, RF-15, RF-16
        │   ├── estudiantes/           RF-08, RF-09
        │   ├── evaluaciones/          RF-10, RF-11
        │   ├── mejoras/               RF-17, RF-18
        │   ├── profesores/            RF-01, RF-07
        │   ├── programas/             RF-02
        │   ├── reportes/              RF-20, RF-21a/b, RF-22
        │   └── resultadosaprendizaje/ RF-06
        └── shared/           Reutilizable en toda la aplicación
            ├── components/   Piezas con lógica: tabla paginada, estado vacío, confirmación
            ├── pipes/        Transformaciones de presentación: nota, fecha, nivel de logro
            └── ui/           Piezas puramente visuales: botones, badges, campos, tarjetas
```

Cada carpeta de `features/` tiene siempre las mismas tres subcarpetas:

| Subcarpeta | Contenido |
| --- | --- |
| `components/` | Vistas y componentes de ese módulo (listados, formularios, detalles) |
| `models/` | Interfaces y tipos propios del módulo, alineados con los DTO del backend |
| `services/` | Servicios HTTP que consumen los endpoints de ese módulo |

Los nombres coinciden con los módulos del backend —`resultadosaprendizaje` en una sola palabra, y semestres dentro de `asignaturas`—, de modo que cada integrante trabaja en la carpeta del mismo nombre a ambos lados del proyecto.

### Convenciones

- **Un componente no llama a `HttpClient` directamente.** Siempre pasa por el servicio de su feature, en `features/<modulo>/services/`. Así, un cambio en un endpoint se corrige en un único archivo.
- **`core/` contra `features/<modulo>/`.** En `core/` va solo lo que usan varios módulos: la sesión del usuario, el rol, los interceptores, el shell. Lo que pertenece a un dominio concreto —`Asignatura`, `Calificacion`, `AsignaturaService`— vive dentro de su feature, no en `core/`.
- **`shared/ui/` contra `shared/components/`.** En `ui/` van las piezas sin lógica de negocio, que solo reciben entradas y emiten eventos (badge de nivel de logro, badge de estado, botón, campo de formulario). En `components/` van las que coordinan algo: tabla con paginación y filtros, diálogo de confirmación, bloque de estado vacío.
- **Ningún archivo de `shared/` o `core/` importa desde `features/`.** La dependencia va siempre en un sentido: `features → shared → core`.

---

## 5. Arquitectura

### Vista general

```
┌──────────────────────────────────────────────┐
│  Navegador                                   │
│  ┌────────────────────────────────────────┐  │
│  │  SIGRA Frontend (Angular SPA)          │  │
│  │                                        │  │
│  │  Guards ──▶ Rutas por rol              │  │
│  │  Interceptor ──▶ Authorization: Bearer │  │
│  │  Componentes ──▶ Servicios HTTP        │  │
│  └────────────────┬───────────────────────┘  │
└───────────────────┼──────────────────────────┘
                    │  HTTPS / JSON (TLS 1.2+)
         ┌──────────▼───────────┐
         │  SIGRA Backend       │
         │  API REST            │
         └──────────────────────┘
```

### Estilo arquitectónico

- **SPA (Single Page Application)** con enrutamiento del lado del cliente: la navegación entre vistas no recarga la página.
- **Arquitectura por features** con carga diferida (*lazy loading*): el administrador no descarga el código de las vistas del estudiante, lo que reduce el tiempo de carga inicial (RNF-08).
- **Separación estricta entre presentación y acceso a datos:** componente → servicio → API.

### Capas

| Capa | Responsabilidad |
| --- | --- |
| `core/layout` | Shell de la aplicación: encabezado, menú lateral por rol y área de contenido |
| `core` | Guards, interceptores, sesión y modelos transversales; se carga una sola vez |
| `features` | Vistas, modelos y servicios de cada módulo de negocio, organizados por RF |
| `shared` | Componentes, piezas de UI y pipes reutilizables (badges de nivel de logro, estados vacíos, diálogos de confirmación) |

### Seguridad en el cliente

| Mecanismo | Qué hace |
| --- | --- |
| `AuthGuard` | Bloquea las rutas privadas si no hay token válido |
| `RoleGuard` | Permite la ruta solo si el rol del usuario la tiene habilitada en la Matriz RBAC |
| Interceptor de token | Adjunta `Authorization: Bearer <jwt>` a cada petición saliente |
| Interceptor de errores | Ante `401` cierra la sesión y redirige al login; ante `403` muestra la pantalla de acceso no autorizado |
| Cierre de sesión | Elimina el token almacenado en el cliente (RNF-15) |

> Estos controles son de experiencia de usuario, no de seguridad. La autorización real la impone el backend en cada endpoint.

### Decisiones de interfaz

- **Estados vacíos explicativos** en lugar de pantallas en blanco: «Aún no tienes asignaturas asignadas» (RF-20), «Aún no tienes asignaturas matriculadas» (RF-22).
- **«Sin evaluar»** cuando un RA no tiene calificaciones, y **«sin datos suficientes para calcular»** cuando hay menos de 3 (RF-14, RF-15).
- **El color nunca va solo.** Los badges de nivel de logro y de estado combinan color, texto e ícono, para no depender de la percepción cromática (RNF-21).
- **Mensajes de error en lenguaje de usuario**, sin trazas ni detalles técnicos (RNF-17).

### Stack

| Componente | Tecnología |
| --- | --- |
| Framework | Angular |
| Lenguaje | TypeScript |
| Estilos | CSS global con variables, o SCSS según lo declarado en `angular.json` |
| Cliente HTTP | `HttpClient` de Angular |
| Formularios | Reactive Forms con validación |
| Enrutamiento | Angular Router con lazy loading |
| Pruebas unitarias | Karma + Jasmine |
| Accesibilidad | axe DevTools y Lighthouse |
| Gestor de paquetes | npm |

---

## 6. Cómo ejecutar el proyecto

### Requisitos previos

| Herramienta | Versión mínima | Verificación |
| --- | --- | --- |
| Node.js | 20 LTS | `node -v` |
| npm | 10 | `npm -v` |
| Angular CLI | 17 o superior | `ng version` |
| Git | 2.30 | `git --version` |

Instalación de Angular CLI, si hace falta:

```bash
npm install -g @angular/cli
```

### 1. Clonar el repositorio

```bash
git clone https://github.com/juancabernal/software4-SIGRA-frontend.git
cd software4-SIGRA-frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar la URL del backend

Si la carpeta `src/environments/` todavía no existe, créala una sola vez con el CLI:

```bash
ng generate environments
```

Luego edita `src/environments/environment.ts` para desarrollo local:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

Y `src/environments/environment.production.ts` para producción:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://<dominio-del-backend>/api'
};
```

Ningún servicio escribe la URL del backend a mano: todos la leen de `environment.apiUrl`.

### 4. Levantar el backend

El frontend no funciona por sí solo. Antes de arrancarlo, deja corriendo el [backend](https://github.com/juancabernal/software4-SIGRA-backend) en `http://localhost:8080`. Comprueba que responda:

```bash
curl http://localhost:8080/actuator/health
```

### 5. Ejecutar en modo desarrollo

```bash
npm start
# equivalente a: ng serve
```

La aplicación queda en **http://localhost:4200** y recarga sola al guardar cambios.

Para exponerla en la red local y probar desde un celular:

```bash
ng serve --host 0.0.0.0 --port 4200
```

### 6. Ejecutar las pruebas

```bash
npm test                        # Pruebas unitarias con Karma
ng test --code-coverage         # Pruebas con reporte de cobertura
ng lint                         # Análisis estático
```

### 7. Compilar para producción

```bash
npm run build
# → dist/<nombre-del-proyecto>/browser/
```

Para servir el resultado y verificarlo localmente:

```bash
npx http-server dist/<nombre-del-proyecto>/browser -p 8081
```

En el servidor web definitivo, configura el *fallback* a `index.html` para que el enrutamiento de Angular funcione al recargar una ruta interna. En Nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Error de CORS en la consola | El backend no autoriza el origen `http://localhost:4200` | Agrega el origen a la configuración CORS del backend |
| `ng: command not found` | Angular CLI no está instalado globalmente | `npm install -g @angular/cli` o usa `npx ng` |
| Todas las peticiones devuelven `401` | Token ausente, vencido o interceptor mal registrado | Vuelve a iniciar sesión y revisa el interceptor en `core/interceptors/` |
| Una vista devuelve `403` | El rol no tiene ese permiso en la Matriz RBAC | Verifica el rol contra el Apéndice 4.1 del SRS |
| Al recargar una ruta interna aparece `404` | Falta el fallback a `index.html` | Configura `try_files` en el servidor web |
| `ERESOLVE` al instalar | Conflicto de versiones entre paquetes | Borra `node_modules` y `package-lock.json`, y vuelve a ejecutar `npm install` |

---

## Estado actual del repositorio

El workspace de Angular ya está generado y la estructura de carpetas descrita en la sección 4 está creada: `core/` con sus guards, interceptores, layout, modelos y servicios; las doce carpetas de `features/`, cada una con `components`, `models` y `services`; y `shared/` con `components`, `pipes` y `ui`.

Quedan por entregar, en este orden:

1. **Guards e interceptores de `core/`.** Bloquean al resto del equipo, así que conviene cerrarlos primero: `AuthGuard`, `RoleGuard`, el interceptor que adjunta el token y el que maneja `401` y `403`.
2. **Shell de `core/layout/`** con el menú lateral distinto por rol, según los mockups.
3. **Archivos de entorno** con `apiUrl`, generados con `ng generate environments`.
4. **Piezas de `shared/ui/`** que usan casi todas las vistas: badge de nivel de logro, badge de estado, botón y campo de formulario.
5. **Piezas de `shared/components/`**: tabla paginada con filtros, bloque de estado vacío y diálogo de confirmación.
6. **Guía de estilos visual** (colores y tipografías), que sigue **pendiente de aprobación del cliente** según el Apéndice 4.4 del SRS y debe respetar los mínimos de accesibilidad de RNF-21. Mientras no se apruebe, define los colores como variables CSS en `styles.css` para poder cambiarlos en un solo lugar.

Las carpetas de `features/` se llenan en paralelo, cada integrante en la suya, según el reparto de la sección 3.

---

## Documentación del proyecto

| Documento | Ubicación |
| --- | --- |
| Especificación de Requisitos de Software (IEEE 830) | Documento del equipo, versión 2.0 corregida |
| Matriz RBAC | Apéndice 4.1 del SRS |
| Matriz de compatibilidad de navegadores | Apéndice 4.2 del SRS |
| Mockups y guía visual | Documentación de diseño del equipo |
| Plan de pruebas | TestLink |

---

## Flujo de trabajo con Git

```bash
git checkout -b feature/RF-XX-nombre-corto
# ... desarrollo ...
git commit -m "RF-XX: descripción del cambio"
git push origin feature/RF-XX-nombre-corto
```

Toda rama se integra a `main` mediante Pull Request revisado por al menos otro integrante. `main` debe permanecer siempre estable y desplegable.
