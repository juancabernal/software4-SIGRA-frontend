# Guía de estilo: botones (Mantis 0000050, 0000051)

Esta guía resume las reglas que deben seguir todos los botones del frontend de SIGRA. Si vas a
agregar una pantalla o un diálogo nuevo, usa esto en vez de inventar un estilo propio.

## 1. Un solo sistema de clases

Todas las clases de botón viven en `src/styles.scss`. No crees estilos de botón nuevos dentro de
un componente: si necesitas un color que no existe, agrégalo ahí para que lo pueda reusar
cualquier módulo.

| Clase              | Uso                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `.btn`              | Base. También es el estilo "neutro" (azul claro, borde navy).     |
| `.btn--primario`     | Acción principal de un formulario o diálogo (Registrar, Guardar). |
| `.btn--secundario`   | Acción secundaria dentro de un diálogo.                           |
| `.btn--cancelar`     | Específico para "Cancelar" (mismo azul neutro que `.btn`).        |
| `.btn--peligro`      | Acciones destructivas o de alto riesgo.                           |
| `.btn--exito`        | Activar / Reactivar (verde azulado).                              |
| `.btn-ghost`         | Consultar y otras acciones de solo lectura en filas de tabla.     |
| `.btn--pequeno`      | Botones de acción por fila (Modificar, Inactivar, etc.).          |

**Regla de tamaño:** todos los botones tienen la misma altura, sin importar el color o la
variante — la altura compacta que ya usan Consultar/Modificar. El ancho sí puede variar según el
largo del texto (por eso `.btn--pequeno` y `.btn-ghost` solo fijan un `min-width`, no un ancho
fijo). Nunca definas `padding` o `font-size` propios para un botón: eso rompe la consistencia.

Única excepción: un botón principal que está junto a campos de formulario altos (como
"Iniciar sesión" en login, junto a los campos de correo/contraseña) puede fijar su propio
`min-height` para igualar la altura de esos campos. Eso se hace con un `min-height` en el
`.scss` **del componente**, nunca tocando `.btn--primario` en `styles.scss` — así el ajuste
queda aislado a esa pantalla y no afecta al resto del sistema.

## 2. El texto de un botón nunca cambia (Mantis 0000051)

Un botón debe mostrar siempre el mismo texto mientras está visible. Nunca hagas algo como:

```html
<!-- Mal: el texto cambia mientras el usuario mira el botón -->
<button [disabled]="guardando()">
  {{ guardando() ? 'Guardando…' : 'Guardar' }}
</button>
```

En vez de eso, el botón se deshabilita (para evitar doble clic) y el estado de "procesando" se
anuncia **aparte**, con el patrón `accion-estado`:

```html
<button type="submit" class="btn btn--primario" [disabled]="guardando()">
  Guardar
</button>

@if (guardando()) {
  <span class="accion-estado" role="status" aria-live="polite">
    <span class="accion-estado__spinner" aria-hidden="true"></span>
    Guardando…
  </span>
}
```

`role="status"` y `aria-live="polite"` hacen que un lector de pantalla anuncie el cambio sin que
el botón mismo tenga que cambiar de texto. Este patrón ya está definido en `styles.scss`
(`.accion-estado`, `.accion-estado__spinner`); no hay que reinventarlo.

Esto también aplica a texto que depende de *cómo salió* un intento anterior (por ejemplo, un
reintento que ya no necesita repetir un paso): el botón se decide una sola vez según el contexto
en el que se abrió (qué se va a hacer), no según el resultado de una acción previa. La aclaración
de qué pasó va en un mensaje aparte (una alerta, un aviso), nunca en el botón.

Importante: esto es distinto de un texto que varía **entre pantallas o filas distintas** según el
estado de los datos (por ejemplo, el botón de una fila dice "Activar" porque esa fila está
inactiva, y en otra fila dice "Inactivar" porque esa está activa). Esto sí está permitido: lo que
no se permite es que el *mismo* botón, visible en el *mismo momento*, cambie su texto como
consecuencia de la acción que el usuario acaba de disparar.

## 3. Nombre de la entidad: arriba sí, dentro del diálogo no

- El botón que **abre** el formulario de registro (el `+ Registrar` de cada listado) sí lleva el
  nombre de la entidad: "Registrar materia", "Registrar facultad", "Registrar profesor", etc.
- El botón de **enviar/guardar dentro del diálogo** se queda genérico: "Registrar" cuando se está
  creando, "Guardar cambios" cuando se está editando. No repitas el nombre de la entidad ahí.

```html
<!-- Listado: sí lleva el nombre -->
<button class="btn btn--primario" (click)="abrirRegistro()">
  <app-icono nombre="mas" [tamano]="16" />
  Registrar materia
</button>

<!-- Dentro del diálogo: genérico -->
<app-modal-crud
  [etiquetaEnviar]="modo() === 'crear' ? 'Registrar' : 'Guardar cambios'"
  ...
/>
```

## 4. Iconos

Cada botón de acción debe llevar su `<app-icono>` correspondiente, coherente con lo que hace
(`mas` = agregar, `lapiz` = modificar, `prohibido` = inactivar/desvincular/desasignar,
`check` = activar, etc.). Un botón sin icono se ve inconsistente al lado de los demás.

## 5. Nada de efectos decorativos

No se usan animaciones de celebración (confeti u otros efectos similares) en ninguna acción. Si
hace falta reforzar que algo salió bien, usa el aviso de texto normal (`mostrarAviso`), no un
efecto visual adicional.

## 6. Antes de abrir un PR

Si agregas o modificas un botón, revisa que:

- Use una de las clases de la tabla de arriba (o agrega la variante que falte a `styles.scss`,
  no al componente).
- No cambie de texto por sí mismo; si hay un estado de carga, usa `accion-estado`.
- Si es un botón de "+ Registrar", lleve el nombre de la entidad; si es el de enviar dentro del
  diálogo, sea genérico.
- Tenga su icono.
