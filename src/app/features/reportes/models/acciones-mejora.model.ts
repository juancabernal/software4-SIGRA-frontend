export interface FiltrosAccionesMejora {
  semestreId?: string;
  asignaturaId?: string;
  resultadoAprendizajeId?: string;
  convertida?: boolean;
}

export interface AccionMejoraReporteFila {
  id: string;
  nombre: string;
  descripcion: string;
  fechaPropuesta: string;
  asignaturaId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  resultadoAprendizajeId: string;
  resultadoAprendizajeCodigo: string;
  semestreId: string;
  semestreCodigo: string;
  evaluacionGeneradaId: string | null;
  convertida: boolean;
}

export interface AccionesMejoraReporte {
  resumen: { total: number; convertidas: number; sinConvertir: number; porcentajeConversion: number };
  filas: AccionMejoraReporteFila[];
}
