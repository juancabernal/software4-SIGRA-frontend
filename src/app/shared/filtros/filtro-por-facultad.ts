export interface OpcionFacultad {
  id: string;
  nombre: string;
}

/**
 * Opciones del selector «Facultad» a partir de elementos que traen su facultad (asignaturas,
 * programas): sin duplicados y ordenadas por nombre. La usa el Profesor, que no puede consultar
 * GET /facultades. El filtrado por facultad lo hace siempre el backend (`facultadId`).
 */
export function facultadesDe(
  elementos: readonly { facultadId: string; facultadNombre: string }[],
): OpcionFacultad[] {
  const porId = new Map<string, string>();
  for (const e of elementos) {
    porId.set(e.facultadId, e.facultadNombre);
  }
  return [...porId]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
