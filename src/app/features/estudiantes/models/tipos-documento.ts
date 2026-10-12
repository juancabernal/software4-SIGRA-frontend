/**
 * Catálogo de tipos de documento (D3): mitigación temporal mientras no exista
 * `GET /api/v1/tipos-documento` ni `tipoDocumentoId` en `EstudianteResponseDTO`. Es el **único**
 * lugar del código con UUID literales. `POST` y `PUT /estudiantes` exigen `tipoDocumentoId`, y el
 * `GET /{id}` solo devuelve `tipoDocumentoNombre`: sin este catálogo no hay registro ni
 * modificación posibles.
 *
 * Los UUID están leídos de la base de datos local (esquema `sigra`, tabla `tipo_documento`) y son
 * de un ambiente concreto: si la base se recrea con otros UUID, este archivo es el único que hay
 * que editar. El día que el backend resuelva el bloqueo, este archivo se reemplaza por una
 * llamada HTTP sin tocar los componentes que usan `idDeTipoDocumento`.
 */
export interface TipoDocumento {
  id: string;
  nombre: string;
}

export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = [
  { id: '07219e8d-126d-44cb-9d22-0f57afebec90', nombre: 'Cedula de Ciudadania' },
  { id: '00000000-0000-4000-d000-000000000001', nombre: 'Cédula de Ciudadanía' },
];

/**
 * Resuelve `nombre → id` sin distinguir mayúsculas ni espacios alrededor. Devuelve `undefined`
 * cuando el nombre no está en el catálogo, en lugar de arriesgar un id arbitrario: la vista de
 * modificación trata ese caso como un error explicable al usuario (D3).
 */
export function idDeTipoDocumento(nombre: string): string | undefined {
  const normalizado = nombre.trim().toLowerCase();
  return TIPOS_DOCUMENTO.find((tipo) => tipo.nombre.trim().toLowerCase() === normalizado)?.id;
}
