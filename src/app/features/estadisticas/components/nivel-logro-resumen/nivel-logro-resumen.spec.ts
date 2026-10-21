import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadisticasResultadoAprendizaje } from '../../models/nivel-logro.model';
import { NivelLogroResumen } from './nivel-logro-resumen';

const BASE: EstadisticasResultadoAprendizaje = {
  resultadoAprendizajeId: 'ra-1',
  codigoResultadoAprendizaje: 'RA1',
  asignaturaId: 'a1',
  semestreId: 's1',
  codigoSemestre: '2026-2',
  totalEstudiantes: 10,
  evaluados: 8,
  sinDatosSuficientes: 1,
  sinEvaluar: 1,
  promedioNota: 3.6,
  promedioPorcentaje: 72,
  distribucion: [
    { nivel: 'BAJO', cantidad: 2, porcentaje: 25 },
    { nivel: 'MEDIO', cantidad: 3, porcentaje: 37.5 },
    { nivel: 'ALTO', cantidad: 2, porcentaje: 25 },
    { nivel: 'SOBRESALIENTE', cantidad: 1, porcentaje: 12.5 },
  ],
  fechaCalculo: '2026-10-17T10:05:00',
};

const SIN_EVALUADOS = { evaluados: 0, promedioNota: null, promedioPorcentaje: null };

describe('NivelLogroResumen', () => {
  let fixture: ComponentFixture<NivelLogroResumen>;
  let html: HTMLElement;

  function render(cambios: Partial<EstadisticasResultadoAprendizaje> = {}): void {
    fixture.componentRef.setInput('estadisticas', { ...BASE, ...cambios });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NivelLogroResumen] });
    fixture = TestBed.createComponent(NivelLogroResumen);
    html = fixture.nativeElement as HTMLElement;
  });

  it('muestra promedio, conteos, la distribución de los 4 niveles y la fecha del último cálculo', () => {
    render();

    expect(html.textContent).toContain('3,6');
    expect(html.textContent).toContain('72 % de logro');
    const filas = html.querySelectorAll('.distribucion__fila');
    expect(filas.length).toBe(4);
    expect(filas[1].textContent).toContain('37,5 %');
    expect(filas[1].textContent).toContain('3 estudiantes');
    expect(filas[3].textContent).toContain('1 estudiante');
    expect(html.textContent).toContain('Último cálculo: 17 oct 2026 · 10:05');
  });

  it('completa la distribución con 0 si el backend omite un nivel', () => {
    render({ distribucion: [{ nivel: 'ALTO', cantidad: 8, porcentaje: 100 }] });
    expect(html.querySelectorAll('.distribucion__fila').length).toBe(4);
  });

  it('con solo 1 o 2 calificaciones dice «sin datos suficientes para calcular»', () => {
    render({ ...SIN_EVALUADOS, sinDatosSuficientes: 4, sinEvaluar: 6 });

    expect(html.querySelectorAll('.distribucion__fila').length).toBe(0);
    expect(html.textContent).toContain('Sin datos suficientes para calcular');
    expect(html.textContent).toContain('Sin estudiantes evaluados');
  });

  it('sin ninguna calificación muestra «Sin evaluar»', () => {
    render({ ...SIN_EVALUADOS, sinDatosSuficientes: 0, sinEvaluar: 10 });
    expect(html.querySelector('app-badge-nivel-logro')?.textContent?.trim()).toBe('Sin evaluar');
  });

  it('si nunca se calculó ofrece «Calcular ahora» y lo emite', () => {
    render({ ...SIN_EVALUADOS, fechaCalculo: null });
    let pedido = 0;
    fixture.componentInstance.recalcular.subscribe(() => pedido++);

    expect(html.textContent).toContain('Aún no se ha calculado el nivel de logro');
    (html.querySelector('button') as HTMLButtonElement).click();
    expect(pedido).toBe(1);
  });

  it('mientras recalcula no vuelve a emitir', () => {
    render({ ...SIN_EVALUADOS, fechaCalculo: null });
    fixture.componentRef.setInput('recalculando', true);
    fixture.detectChanges();
    let pedido = 0;
    fixture.componentInstance.recalcular.subscribe(() => pedido++);

    (html.querySelector('button') as HTMLButtonElement).click();
    expect(pedido).toBe(0);
    expect(html.textContent).toContain('Calculando…');
  });
});
