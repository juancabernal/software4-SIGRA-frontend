/**
 * Formato de las cifras de nivel de logro. Se usa `Intl` con es-CO porque el proyecto no registra
 * datos de locale de Angular (ver `features/estudiantes/models/matricula.model.ts`).
 */
import { formatearFecha } from '../../semestres/models/semestre-fechas';
import { RangoNivelLogro } from './nivel-logro.model';

const formatoNota = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const formatoPorcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/** «3,6» o «3,65»: la escala de notas siempre muestra al menos un decimal. */
export function formatearNota(nota: number): string {
  return formatoNota.format(nota);
}

/** «37,5 %». */
export function formatearPorcentaje(porcentaje: number): string {
  return `${formatoPorcentaje.format(porcentaje)} %`;
}

/** «Desde 3,0 hasta menos de 4,0» o «Desde 4,5 hasta 5,0» cuando el límite está incluido. */
export function describirRango(rango: RangoNivelLogro): string {
  const desde = formatearNota(rango.notaMinima);
  const hasta = formatearNota(rango.notaLimite);
  return rango.limiteIncluido
    ? `Desde ${desde} hasta ${hasta}`
    : `Desde ${desde} hasta menos de ${hasta}`;
}

/** «[3,0 – 4,0)» o «[4,5 – 5,0]»: notación compacta del intervalo. */
export function intervaloRango(rango: RangoNivelLogro): string {
  const cierre = rango.limiteIncluido ? ']' : ')';
  return `[${formatearNota(rango.notaMinima)} – ${formatearNota(rango.notaLimite)}${cierre}`;
}

/** «17 oct 2026 · 10:05» a partir del LocalDateTime del backend (AAAA-MM-DDTHH:mm:ss…). */
export function formatearFechaCalculo(iso: string): string {
  const [fecha, hora = ''] = iso.split('T');
  const horaMinutos = hora.slice(0, 5);
  return horaMinutos ? `${formatearFecha(fecha)} · ${horaMinutos}` : formatearFecha(fecha);
}
