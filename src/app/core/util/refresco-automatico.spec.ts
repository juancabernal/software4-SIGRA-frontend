import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { refrescoAutomatico } from './refresco-automatico';

@Component({ selector: 'app-prueba-refresco', template: '', standalone: true })
class ComponentePrueba {
  readonly contador = refrescoAutomatico(1000);
}

describe('refrescoAutomatico', () => {
  let fixture: ComponentFixture<ComponentePrueba>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ComponentePrueba] });
    fixture = TestBed.createComponent(ComponentePrueba);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('con la pestaña oculta el contador no avanza', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    vi.useFakeTimers();

    vi.advanceTimersByTime(5000);
    TestBed.tick();

    expect(fixture.componentInstance.contador()).toBe(0);
  });
});
