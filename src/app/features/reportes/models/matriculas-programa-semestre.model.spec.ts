import {
  generarCsvMatriculasProgramaSemestre,
  MatriculasProgramaSemestreReporte,
} from './matriculas-programa-semestre.model';

describe('generarCsvMatriculasProgramaSemestre', () => {
  const reporte: MatriculasProgramaSemestreReporte = {
    semestreId: null,
    programaId: null,
    facultadId: null,
    resumen: {
      totalMatriculas: 7,
      activas: 5,
      desvinculadas: 2,
      estudiantesDistintos: 6,
      programas: 1,
      semestres: 1,
    },
    filas: [
      {
        semestreId: 's1',
        semestreCodigo: '2026-1',
        semestreFechaInicio: '2026-01-15',
        semestreEstado: 'ACTIVO',
        programaId: 'p1',
        programaCodigo: 'ISI',
        programaNombre: 'Ingeniería, Sistemas',
        facultadNombre: 'Facultad "Ingeniería"',
        totalMatriculas: 7,
        activas: 5,
        desvinculadas: 2,
        estudiantes: 6,
        asignaturas: 4,
      },
    ],
  };

  it('genera exactamente el CSV para Excel en español', () => {
    const csv = generarCsvMatriculasProgramaSemestre(reporte);

    expect(csv).toBe(
      '\uFEFF"Semestre";"Programa";"Facultad";"Activas";"Desvinculadas";"Total";"Estudiantes";"Asignaturas"\r\n' +
        '"2026-1";"ISI · Ingeniería, Sistemas";"Facultad ""Ingeniería""";"5";"2";"7";"6";"4"\r\n' +
        '"Total";"";"";"5";"2";"7";"6";"—"',
    );
  });
});
