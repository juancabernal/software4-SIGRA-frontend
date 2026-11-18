import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { TrazabilidadUsoProfesor, TrazabilidadUsoReporte } from '../../models/trazabilidad-uso.model';
import { TrazabilidadUsoTab, VistaTrazabilidad } from './trazabilidad-uso-tab';

describe('TrazabilidadUsoTab', () => {
  let fixture: ComponentFixture<TrazabilidadUsoTab>;
  let http: HttpTestingController;
  let html: HTMLElement;
  const url = `${environment.apiUrl}/v1/reportes/trazabilidad-uso`;
  const semestresUrl = `${environment.apiUrl}/v1/semestres`;

  const general = (totalEventos = 12): TrazabilidadUsoReporte => ({
    desde: '2026-07-01',
    hasta: '2026-12-15',
    semestreId: 's1',
    semestreCodigo: '2026-2',
    rol: null,
    resumen: { totalEventos, usuariosActivos: 5, loginsExitosos: 9, loginsFallidos: 1 },
    porRol: [
      { rol: 'ADMINISTRADOR', totalEventos: 0, usuariosDistintos: 0, ultimaActividad: null, acciones: [] },
      {
        rol: 'PROFESOR',
        totalEventos: totalEventos ? 4 : 0,
        usuariosDistintos: 2,
        ultimaActividad: '2026-11-14T10:00:00',
        acciones: totalEventos ? [{ accion: 'LOGIN_EXITOSO', total: 4 }] : [],
      },
      {
        rol: 'ESTUDIANTE',
        totalEventos: totalEventos ? 7 : 0,
        usuariosDistintos: 3,
        ultimaActividad: null,
        acciones: totalEventos ? [{ accion: 'LOGIN_EXITOSO', total: 5 }, { accion: 'CAMBIO_ESTADO', total: 2 }] : [],
      },
    ],
  });

  const profesor = (estudiantes: TrazabilidadUsoProfesor['estudiantes']): TrazabilidadUsoProfesor => ({
    desde: '2026-07-01',
    hasta: '2026-12-15',
    semestreId: 's1',
    semestreCodigo: '2026-2',
    propia: {
      totalEventos: 3,
      ultimaActividad: '2026-11-14T10:00:00',
      acciones: [{ accion: 'LOGIN_EXITOSO', total: 3 }],
    },
    resumenEstudiantes: { total: estudiantes.length, conActividad: 1, sinActividad: estudiantes.length - 1, ingresos: 4 },
    estudiantes,
    mensaje: estudiantes.length ? null : 'No tiene estudiantes matriculados en sus asignaturas para este semestre.',
  });

  function crear(vista: VistaTrazabilidad): void {
    TestBed.configureTestingModule({
      imports: [TrazabilidadUsoTab],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TrazabilidadUsoTab);
    fixture.componentRef.setInput('vista', vista);
    html = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  async function actualizar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function responderSemestres(): void {
    http.expectOne(semestresUrl).flush([
      { id: 's1', codigo: '2026-2', fechaInicio: '2026-07-01', fechaFin: '2026-12-15', estado: 'ACTIVO' },
      { id: 's0', codigo: '2026-1', fechaInicio: '2026-01-15', fechaFin: '2026-06-15', estado: 'INACTIVO' },
    ]);
  }

  afterEach(() => http.verify());

  describe('vista del administrador', () => {
    beforeEach(() => crear('admin'));

    it('pide el reporte general con el semestre activo y muestra la tabla por rol', async () => {
      responderSemestres();
      await actualizar();
      const peticion = http.expectOne((r) => r.url === url);
      expect(peticion.request.params.get('semestreId')).toBe('s1');
      expect(peticion.request.params.has('rol')).toBe(false);
      peticion.flush(general());
      await actualizar();

      const tarjetas = Array.from(html.querySelectorAll('.resumen__tarjeta strong')).map((e) => e.textContent?.trim());
      expect(tarjetas).toEqual(['12', '5', '9', '1']);
      const filas = Array.from(html.querySelectorAll('tbody tr th')).map((e) => e.textContent?.trim());
      expect(filas).toEqual(['Administrador', 'Profesor', 'Estudiante', 'Total']);
      expect(html.textContent).toContain('Periodo: 01/07/2026 – 15/12/2026');
      expect(html.querySelector('#filtro-rol-r7')).not.toBeNull();
    });

    it('envía el rol y las fechas al cambiar los filtros', async () => {
      responderSemestres();
      await actualizar();
      http.expectOne((r) => r.url === url).flush(general());
      await actualizar();

      const rol = html.querySelector('#filtro-rol-r7') as HTMLSelectElement;
      rol.value = 'ESTUDIANTE';
      rol.dispatchEvent(new Event('change'));
      await actualizar();
      const conRol = http.expectOne((r) => r.url === url);
      expect(conRol.request.params.get('rol')).toBe('ESTUDIANTE');
      conRol.flush(general());
      await actualizar();

      const desde = html.querySelector('#filtro-desde-r7') as HTMLInputElement;
      desde.value = '2026-11-01';
      desde.dispatchEvent(new Event('change'));
      await actualizar();
      const conFecha = http.expectOne((r) => r.url === url);
      expect(conFecha.request.params.get('desde')).toBe('2026-11-01');
      conFecha.flush(general());
    });

    it('muestra estado vacío sin actividad', async () => {
      responderSemestres();
      await actualizar();
      http.expectOne((r) => r.url === url).flush(general(0));
      await actualizar();

      expect(html.textContent).toContain('No hay actividad registrada');
      expect(html.querySelector('table')).toBeNull();
    });

    it('muestra el error del backend y permite reintentar', async () => {
      responderSemestres();
      await actualizar();
      http
        .expectOne((r) => r.url === url)
        .flush(
          { status: 400, error: 'BAD_REQUEST', mensaje: 'La fecha inicial no puede ser posterior a la fecha final.' },
          { status: 400, statusText: 'Bad Request' },
        );
      await actualizar();

      const alerta = html.querySelector('[role="alert"]');
      expect(alerta).not.toBeNull();
      (alerta?.querySelector('button') as HTMLButtonElement).click();
      await actualizar();
      http.expectOne((r) => r.url === url).flush(general());
    });
  });

  describe('vista del profesor', () => {
    beforeEach(() => crear('profesor'));

    it('pide su ruta propia, sin filtro de rol, y lista la actividad de cada estudiante', async () => {
      responderSemestres();
      await actualizar();
      const peticion = http.expectOne((r) => r.url === `${url}/profesor`);
      expect(peticion.request.params.get('semestreId')).toBe('s1');
      peticion.flush(
        profesor([
          {
            estudianteId: 'e1',
            nombreCompleto: 'Ana Gómez',
            correoInstitucional: 'ana@uco.net.co',
            asignaturas: ['MAT-1', 'FIS-1'],
            ingresos: 4,
            totalEventos: 4,
            ultimaActividad: '2026-11-10T08:30:00',
          },
          {
            estudianteId: 'e2',
            nombreCompleto: 'Luis Pérez',
            correoInstitucional: 'luis@uco.net.co',
            asignaturas: ['MAT-1'],
            ingresos: 0,
            totalEventos: 0,
            ultimaActividad: null,
          },
        ]),
      );
      await actualizar();

      expect(html.querySelector('#filtro-rol-r7')).toBeNull();
      expect(html.textContent).toContain('Mi actividad');
      expect(html.textContent).toContain('Inicio de sesión: 3');
      const filas = Array.from(html.querySelectorAll('tbody tr'));
      expect(filas).toHaveLength(2);
      expect(filas[0].textContent).toContain('Ana Gómez');
      expect(filas[0].textContent).toContain('MAT-1, FIS-1');
      expect(filas[1].querySelector('.marca-sin-actividad')?.textContent).toBe('Sin ingresos');
    });

    it('muestra el mensaje cuando no tiene estudiantes', async () => {
      responderSemestres();
      await actualizar();
      http.expectOne((r) => r.url === `${url}/profesor`).flush(profesor([]));
      await actualizar();

      expect(html.textContent).toContain('No tiene estudiantes matriculados');
      expect(html.querySelector('table')).toBeNull();
    });
  });
});
