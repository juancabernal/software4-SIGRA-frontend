import {
  conteoDe,
  generarCsvActividadEstudiantes,
  generarCsvTrazabilidadUso,
  TrazabilidadUsoProfesor,
  TrazabilidadUsoReporte,
} from './trazabilidad-uso.model';

describe('trazabilidad-uso.model', () => {
  const general: TrazabilidadUsoReporte = {
    desde: '2026-10-17',
    hasta: '2026-11-15',
    semestreId: null,
    semestreCodigo: null,
    rol: null,
    resumen: { totalEventos: 12, usuariosActivos: 3, loginsExitosos: 8, loginsFallidos: 2 },
    porRol: [
      {
        rol: 'PROFESOR',
        totalEventos: 10,
        usuariosDistintos: 3,
        ultimaActividad: '2026-11-14T10:00:00',
        acciones: [
          { accion: 'LOGIN_EXITOSO', total: 8 },
          { accion: 'CALIFICACION_MODIFICADA', total: 2 },
        ],
      },
      {
        rol: 'SIN_IDENTIFICAR',
        totalEventos: 2,
        usuariosDistintos: 0,
        ultimaActividad: null,
        acciones: [{ accion: 'LOGIN_FALLIDO', total: 2 }],
      },
    ],
  };

  it('conteoDe devuelve 0 para acciones ausentes', () => {
    expect(conteoDe(general.porRol[0].acciones, 'LOGIN_EXITOSO')).toBe(8);
    expect(conteoDe(general.porRol[0].acciones, 'CAMBIO_ESTADO')).toBe(0);
  });

  it('genera el CSV por rol con BOM, etiquetas y fila total', () => {
    const lineas = generarCsvTrazabilidadUso(general).split('\r\n');
    expect(lineas[0].startsWith('\uFEFF"Rol";"Usuarios activos";"Inicio de sesión"')).toBe(true);
    expect(lineas[1]).toBe('"Profesor";"3";"8";"0";"0";"2";"0";"10";"2026-11-14T10:00:00"');
    expect(lineas[2]).toBe('"Sin identificar";"0";"0";"2";"0";"0";"0";"2";""');
    expect(lineas[3]).toBe('"Total";"3";"8";"2";"0";"2";"0";"12";""');
  });

  it('genera el CSV de estudiantes sin documento de identidad', () => {
    const profesor: TrazabilidadUsoProfesor = {
      desde: '2026-07-01',
      hasta: '2026-12-15',
      semestreId: 's1',
      semestreCodigo: '2026-2',
      propia: { totalEventos: 0, ultimaActividad: null, acciones: [] },
      resumenEstudiantes: { total: 1, conActividad: 1, sinActividad: 0, ingresos: 4 },
      estudiantes: [
        {
          estudianteId: 'e1',
          nombreCompleto: 'Ana "La" Gómez',
          correoInstitucional: 'ana@uco.net.co',
          asignaturas: ['MAT-1', 'FIS-1'],
          ingresos: 4,
          totalEventos: 4,
          ultimaActividad: '2026-11-10T08:30:00',
        },
      ],
      mensaje: null,
    };
    const lineas = generarCsvActividadEstudiantes(profesor).split('\r\n');
    expect(lineas[0]).toBe('\uFEFF"Estudiante";"Correo";"Asignaturas";"Ingresos";"Total de eventos";"Último acceso"');
    expect(lineas[1]).toBe('"Ana ""La"" Gómez";"ana@uco.net.co";"MAT-1, FIS-1";"4";"4";"2026-11-10T08:30:00"');
  });
});
