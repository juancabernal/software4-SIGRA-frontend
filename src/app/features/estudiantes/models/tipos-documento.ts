/**
 * Tipo de documento tal como lo sirve `GET /api/v1/tipos-documento`
 * (`TipoDocumentoResponseDTO`).
 *
 * Aquí vivió un catálogo fijo con UUID literales, como mitigación temporal mientras ese endpoint
 * no existía. Ya existe: el catálogo se pide al servidor desde `TipoDocumentoOpcionesService`, así
 * que la aplicación muestra los tipos reales del ambiente al que esté conectada en vez de dos
 * valores escritos a mano.
 */
export interface TipoDocumento {
  id: string;
  nombre: string;
}

/** Compara nombres sin distinguir mayúsculas, tildes ni espacios alrededor. */
export function mismoNombreDeTipo(uno: string, otro: string): boolean {
  return normalizarNombreDeTipo(uno) === normalizarNombreDeTipo(otro);
}

function normalizarNombreDeTipo(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
