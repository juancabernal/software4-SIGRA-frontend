const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const FORMATO_HORA = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Formatea una fecha en español de Colombia; devuelve cadena vacía si no es una fecha válida. */
export function formatearFechaHora(fecha: string | null | undefined): string {
  if (!fecha) {
    return '';
  }
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) {
    return '';
  }
  return `${FORMATO_FECHA.format(valor)}, ${FORMATO_HORA.format(valor)}`;
}
