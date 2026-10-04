/**
 * Utilidades de presentación para fechas AAAA-MM-DD.
 * Las fechas se interpretan como fechas locales (sin hora) para evitar
 * desfases por zona horaria al convertirlas con new Date('AAAA-MM-DD').
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function aFechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function hoyIso(): string {
  return aIso(new Date());
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = aFechaLocal(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aIso(fecha);
}

/** «20 ene 2027»: día, mes abreviado y año, sin los «de» que agrega es-CO. */
export function formatearFecha(iso: string): string {
  const partes = formatoFecha.formatToParts(aFechaLocal(iso));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${valor('day')} ${valor('month').replace('.', '')} ${valor('year')}`;
}

/** Días del semestre contando el día de inicio y el de fin (el rango incluye ambos extremos). */
export function duracionEnDias(inicioIso: string, finIso: string): number {
  const diferencia = aFechaLocal(finIso).getTime() - aFechaLocal(inicioIso).getTime();
  return Math.round(diferencia / MS_POR_DIA) + 1;
}
