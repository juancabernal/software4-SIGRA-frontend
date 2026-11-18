# Guía de estilo y usabilidad de SIGRA

(Mantis 0000050, 0000051 y 0000042.)

Esta guía resume las reglas que debe seguir cualquier pantalla del frontend. Si vas a agregar una
pantalla, una pestaña o un diálogo nuevo, **usa esto en vez de inventar un estilo propio**: el
objetivo es que todos los módulos se vean y se comporten igual.

## 0. La regla de oro

> **Cada elemento de formato se define una sola vez, en `src/styles.scss`.** Un componente no copia
> ese estilo: usa la clase común. Si falta una variante, se agrega en `styles.scss`, no en el
> componente.

Por qué: cuando cada módulo copia sus estilos, con el tiempo se desvían (otro ancho, otro tamaño de
título, otra forma de mostrar un filtro) y el sistema se ve como si lo hubieran hecho personas
distintas. Eso fue justo lo que corrigió el Mantis 0000042.

**Antes de escribir CSS en un componente, pregúntate:** ¿ya existe una clase común para esto? Si
la respuesta es sí, úsala. Si el `.scss` del componente repite una regla de esta guía, bórrala.

---

# Parte A. Botones

## A1. Un solo sistema de clases

Todas las clases de botón viven en `src/styles.scss`. No crees estilos de botón nuevos dentro de
un componente.

| Clase              | Uso                                                                |
| ------------------ | ------------------------------------------------------------------ |
| `.btn`             | Base. También es el estilo "neutro" (azul claro, borde navy).      |
| `.btn--primario`   | Acción principal de un formulario o diálogo (Registrar, Guardar).  |
| `.btn--secundario` | Acción secundaria dentro de un diálogo, y "Modificar" en las filas.|
| `.btn--cancelar`   | Específico para "Cancelar" (mismo azul neutro que `.btn`).         |
| `.btn--peligro`    | Acciones destructivas o de alto riesgo (**siempre rojo**).         |
| `.btn--exito`      | Activar / Reactivar (verde azulado).                               |
| `.btn-ghost`       | Consultar, Ver ficha y otras acciones de solo lectura en filas.    |
| `.btn--pequeno`    | Botones de acción por fila (Modificar, Inactivar, etc.).           |

**Regla de tamaño:** todos los botones tienen la misma altura, sin importar el color o la
variante. El ancho sí puede variar según el largo del texto (por eso `.btn--pequeno` y
`.btn-ghost` solo fijan un `min-width`). Nunca definas `padding` o `font-size` propios para un
botón.

Única excepción: un botón principal junto a campos de formulario altos (como "Iniciar sesión" en
login) puede fijar su propio `min-height` en el `.scss` **del componente**, nunca tocando
`.btn--primario` en `styles.scss`.

## A2. Colores y comportamiento

- **Inactivar / Desvincular / Desasignar siempre son rojos** (`btn btn--peligro btn--pequeno`),
  en todas las pantallas. No se usa `.btn-ghost` para acciones destructivas.
- **Hover único.** Todo botón azul (`.btn`, `.btn--secundario`, `.btn--cancelar`) pasa a
  `--sg-hover-suave` al pasar el cursor: un tono más intenso, con el texto navy siempre legible.
  No se mezcla con navy (el texto quedaría ilegible).
- **Registrar ≠ Modificar.** Si un mismo botón sirve para ambos (como en la planilla de notas),
  "Registrar" va en navy sólido (`btn--primario`) y "Modificar" en azul claro, además del icono
  (+ / lápiz). Nunca se ven iguales.

## A3. El texto de un botón nunca cambia (Mantis 0000051)

Un botón debe mostrar siempre el mismo texto mientras está visible. Nunca hagas esto:

```html
<!-- Mal: el texto cambia mientras el usuario mira el botón -->
<button [disabled]="guardando()">
  {{ guardando() ? 'Guardando…' : 'Guardar' }}
</button>
```

El botón se deshabilita (para evitar doble clic) y el estado de "procesando" se anuncia **aparte**
con el patrón `accion-estado`:

```html
<button type="submit" class="btn btn--primario" [disabled]="guardando()">Guardar</button>

@if (guardando()) {
  <span class="accion-estado" role="status" aria-live="polite">
    <span class="accion-estado__spinner" aria-hidden="true"></span>
    Guardando…
  </span>
}
```

Esto también aplica a un texto que dependa de *cómo salió* un intento anterior: el botón se decide
una sola vez según el contexto en que se abrió, y la aclaración de qué pasó va en un mensaje aparte
(un aviso), nunca en el botón.

Lo que **sí** se permite: un texto distinto **entre filas o pantallas** según el estado de los datos
(una fila inactiva dice "Activar", otra activa dice "Inactivar"). Lo que no se permite es que el
*mismo* botón, en el *mismo momento*, cambie su texto como consecuencia de la acción del usuario.

## A4. Nombre de la entidad: arriba sí, dentro del diálogo no

- El botón que **abre** el formulario de registro (el `+ Registrar` de cada listado) lleva el
  nombre de la entidad: "Registrar materia", "Registrar facultad", "Registrar profesor".
- El botón de **enviar/guardar dentro del diálogo** es genérico: "Registrar" al crear, "Guardar
  cambios" al editar.

```html
<!-- Listado: sí lleva el nombre -->
<button class="btn btn--primario" (click)="abrirRegistro()">
  <app-icono nombre="mas" [tamano]="16" />
  Registrar materia
</button>

<!-- Dentro del diálogo: genérico -->
<app-modal-crud [etiquetaEnviar]="modo() === 'crear' ? 'Registrar' : 'Guardar cambios'" ... />
```

## A5. Iconos y efectos

- Cada botón de acción lleva su `<app-icono>`, coherente con lo que hace (`mas` = agregar,
  `lapiz` = modificar, `prohibido` = inactivar/desvincular/desasignar, `check` = activar,
  `ojo` = ver). Un botón sin icono se ve inconsistente al lado de los demás.
- No se usan animaciones de celebración (confeti, etc.). Para reforzar que algo salió bien, usa el
  aviso de texto normal.

---

# Parte B. Estructura de una pantalla

## B1. Contenedor, título y cabecera

Toda pantalla es un `<section class="pagina">`. El ancho máximo (72 rem), la separación, el
relleno y el título (`h1`, 1,5 rem, navy, negrita) vienen de `styles.scss`: **no los redefinas**.

| Elemento | Clase | Qué hace |
|---|---|---|
| Contenedor | `section.pagina` | ancho máx. 72 rem, separación 1,25 rem |
| Título | `h1` dentro de `.pagina` | 1,5 rem, navy, negrita |
| Cabecera | `.cabecera` + `.cabecera__texto` | título y subtítulo a la izquierda, botón principal a la derecha |

Plantilla obligatoria de cabecera (siempre con `cabecera__texto`, aunque no haya botón):

```html
<section class="pagina" aria-labelledby="titulo-x">
  <header class="cabecera">
    <div class="cabecera__texto">
      <h1 id="titulo-x">Título</h1>
      <p>Subtítulo breve.</p>
    </div>
    <button type="button" class="btn btn--primario">Registrar algo</button>
  </header>

  <!-- contenido -->
</section>
```

Un solo `h1` por pantalla. Los títulos de las tarjetas son `h2`.

## B2. Avisos (éxito y error)

Los mensajes de resultado van en la zona de avisos, justo debajo de la cabecera:

```html
<div class="aviso-zona" role="status" aria-live="polite">
  @if (aviso(); as a) {
    <div class="aviso" [class.aviso--error]="a.tono === 'error'">
      <app-icono [nombre]="a.tono === 'ok' ? 'check' : 'advertencia'" [tamano]="16" />
      <span>{{ a.texto }}</span>
      <button type="button" class="aviso__cerrar" aria-label="Cerrar aviso" (click)="cerrarAviso()">
        <app-icono nombre="cerrar" [tamano]="14" />
      </button>
    </div>
  }
</div>
```

Las clases `.aviso`, `.aviso--error`, `.aviso__cerrar` y `.aviso-zona` ya existen: no las copies.

## B3. Cargando, vacío y error: una sola forma (`.estado-vista`)

Para cualquier estado sin datos se usa `.estado-vista`. Nunca inventes `.estado`, `.alerta`, `.vacio`
ni parecidos.

```html
<!-- Cargando -->
<p class="estado-vista" role="status">Cargando materias…</p>

<!-- Vacío: título + siguiente paso en una frase -->
<div class="estado-vista">
  <p class="estado-vista__titulo">No hay materias registradas</p>
  <p>Registra la primera materia del catálogo.</p>
</div>

<!-- Error: mensaje + Reintentar -->
<div class="estado-vista estado-vista--error" role="alert">
  <p>{{ error.mensaje }}</p>
  <button type="button" class="btn" (click)="reintentar()">Reintentar</button>
</div>
```

Un estado vacío **siempre dice qué hacer después** ("Elige una materia para ver sus RA", "Registra la
primera…"). Un error **siempre ofrece Reintentar**.

## B4. Pestañas

Para varias secciones en una pantalla (Catálogo, Reportes) se usa `.pestanas` y `.pestana` con
`role="tablist"` / `role="tab"`. Están en `styles.scss`; la pestaña activa va en navy.

## B5. Pantallas de detalle: enlace Volver

Toda pantalla de detalle empieza con el enlace Volver, en el mismo sitio y con el mismo estilo:

```html
<a class="volver" routerLink="/admin/estudiantes">
  <app-icono nombre="flecha-der" [tamano]="14" />
  Volver al listado
</a>
```

Debe verse también mientras carga, si hay error o si el elemento no existe.

---

# Parte C. Filtros

## C1. Una sola barra de filtros

Todas las pantallas filtran igual: **la etiqueta va arriba del control**, los campos se reparten el
ancho en una cuadrícula y el botón "Limpiar" queda al final. Dentro de una `.tarjeta`, la barra lleva
relleno y una línea inferior sola.

```html
<div class="tarjeta">
  <form class="filtros" (submit)="$event.preventDefault(); aplicarFiltros()">
    <div class="filtro">
      <label for="filtro-semestre">Semestre</label>
      <select id="filtro-semestre" class="selector">…</select>
    </div>
    <div class="filtro">
      <label for="filtro-facultad">Facultad</label>
      <select id="filtro-facultad" class="selector">…</select>
    </div>
    <button type="button" class="btn" (click)="limpiarFiltros()">Limpiar filtros</button>
  </form>
  <!-- resultado -->
</div>
```

Reglas:

- Toda etiqueta tiene su `for` enlazado al `id` del control.
- Los selectores dependientes se **deshabilitan** hasta que el anterior tenga valor, con un texto
  guía ("Elige primero una materia").
- Si hay filtros aplicados, ofrece **Limpiar filtros**.
- El orden de los filtros va de lo general a lo particular (semestre → facultad → programa →
  materia → RA).

## C2. Buscador

En listados largos se usa `.buscador` (icono + campo) junto a los selectores. El campo de búsqueda
filtra por nombre o código y no necesita un botón aparte.

---

# Parte D. Tablas y listas

## D1. Tablas

Usa `<table>` dentro de `.tabla-contenedor` (desplazamiento horizontal si no cabe). El relleno, el
encabezado en mayúsculas pequeñas y los bordes vienen de `styles.scss`: **no redefinas** `table`,
`thead th` ni `tbody td`.

- Toda tabla lleva `<caption class="solo-lectores">` y `scope` en los `th`.
- Los números y códigos van con la clase `tabular` (cifras de ancho fijo).
- Excepción permitida: las tablas de Reportes y de Asignación docente pueden ser más compactas
  (menos relleno) porque tienen muchas columnas.

## D2. Acciones de fila: siempre en una línea

Las acciones de cada fila (Ver / Modificar / Inactivar) van en una sola línea, con el mismo orden y
los mismos colores en todas las pantallas:

```html
<td>
  <div class="acciones">
    <a class="btn-ghost" [routerLink]="…"><app-icono nombre="ojo" [tamano]="16" /><span>Ver ficha</span></a>
    <button type="button" class="btn btn--secundario btn--pequeno">
      <app-icono nombre="lapiz" [tamano]="16" /><span>Modificar</span>
    </button>
    <button type="button" class="btn btn--peligro btn--pequeno">
      <app-icono nombre="prohibido" [tamano]="16" /><span>Inactivar</span>
    </button>
  </div>
</td>
```

Orden: **ver → modificar → inactivar/activar**. Dentro de un diálogo, `.acciones` alinea los botones
a la derecha (esa variante vive en el diálogo).

## D3. Paginación y listas largas

- Todo listado que puede crecer (cientos de filas) se **pagina** con `<app-paginador>`; la
  paginación la hace el backend cuando existe.
- Una lista de **tarjetas largas** (Reportes por asignatura, Mi progreso) usa tarjetas plegables:
  solo la primera va abierta y el resto se abre con un clic.

```html
<details class="tarjeta plegable" [open]="$first">
  <summary class="plegable__resumen"><h2 class="tarjeta__titulo">…</h2></summary>
  <!-- contenido -->
</details>
```

Usan `<details>`, así que funcionan con teclado y lector de pantalla. Meta: una pantalla no debe
obligar a hacer scroll sin fin; si pasa de unos 2.000 px con datos normales, páginala o pliégala.

---

# Parte E. Vocabulario y textos

- Dentro de **una misma pantalla** usa una sola palabra para cada cosa. El sistema mezcla "materia"
  y "asignatura" y "Matrícula" / "Matriculados" por decisión del equipo (Mantis 0000042); no los
  mezcles dentro de la misma pantalla y sigue el vocabulario del módulo en el que trabajas.
- Los títulos de pantalla son sustantivos cortos ("Estudiantes", "Evaluaciones por RA"). Los botones
  son verbos ("Registrar", "Modificar", "Inactivar").
- Los mensajes de error se escriben para el usuario, nunca con identificadores internos (UUID) ni
  trazas técnicas (Mantis 0000039).

---

# Parte F. Accesibilidad (RNF-21)

- El foco del teclado siempre es visible (ya viene de `styles.scss`; no lo quites con `outline: none`
  salvo dentro de un `.buscador`, que muestra el foco en el contenedor).
- Todo control de formulario tiene `label` enlazado.
- Los cambios que el usuario no ve (cargando, guardado) se anuncian con `role="status"` y
  `aria-live="polite"`; los errores, con `role="alert"`.
- El color nunca es el único indicador: los estados llevan texto (y, si aplica, icono).
- Los botones solo con icono llevan `aria-label`; los de fila incluyen el nombre del elemento
  (`aria-label="Modificar Cálculo I"`).

---

# Parte G. Qué NO hacer

| No hagas | Haz |
|---|---|
| Definir `.pagina`, `h1`, `.cabecera`, `.aviso`, `.estado-vista`, `.filtros`, `table` en el `.scss` de un componente | Usar la clase común; si falta algo, agrégalo a `styles.scss` |
| Inventar `.estado`, `.alerta`, `.vacio` para "sin datos" o errores | `.estado-vista` y `.estado-vista--error` |
| Poner la etiqueta del filtro al lado del selector | `.filtro` con la etiqueta arriba |
| Un botón rojo "fantasma" (gris hasta el hover) para Inactivar | `btn btn--peligro btn--pequeno` |
| Que un botón cambie de texto al procesar | Deshabilitarlo y usar `accion-estado` |
| Apilar los botones de una fila en vertical | `.acciones` en una línea |
| Una pantalla de detalle sin Volver | `.volver` arriba |
| Colores o tamaños sueltos (`#1b3a5c`, `13px`) en un componente | Los tokens `--sg-*` de `styles.scss` |

## Lo que todavía vive en cada componente (a propósito)

Estas piezas tienen variantes legítimas y por ahora se definen en el componente: `.tarjeta` (según
lleve o no relleno y desbordamiento), los diálogos (`.acciones` alineadas a la derecha) y las tablas
muy anchas de Reportes. Si agregas una nueva variante, primero revisa si cabe en la común.

---

# Parte H. Lista de revisión antes de abrir un PR

**Botones**
- [ ] Usan una clase de la tabla A1 (o la variante nueva está en `styles.scss`).
- [ ] Inactivar es rojo; Registrar se distingue de Modificar.
- [ ] No cambian de texto solos; el estado de carga usa `accion-estado`.
- [ ] El "+ Registrar" del listado lleva el nombre de la entidad; el del diálogo es genérico.
- [ ] Tienen su icono.

**Pantalla**
- [ ] `section.pagina` + `.cabecera` con `.cabecera__texto` y un solo `h1`.
- [ ] Avisos con `.aviso-zona`; vacío/cargando/error con `.estado-vista` (con siguiente paso y
      Reintentar).
- [ ] Filtros con `.filtros` / `.filtro` (etiqueta arriba) y Limpiar.
- [ ] Tablas con `.tabla-contenedor`, `caption` y acciones de fila en una línea.
- [ ] Listas largas paginadas o plegables; detalle con `.volver`.
- [ ] El `.scss` del componente **no repite** nada de esta guía.

**Calidad**
- [ ] Revisé la pantalla a 1366×768 y en un ancho angosto (~1024 px): sin desbordes horizontales.
- [ ] Pruebas y compilación en verde.
