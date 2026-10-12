import { TestBed } from '@angular/core/testing';

import { SesionAlmacenada } from '../models/sesion.model';
import { SessionService } from './session.service';

const CLAVE = 'sigra.sesion';

const SESION: SesionAlmacenada = {
  token: 'jwt-de-prueba',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Profesor Bruno',
    correoInstitucional: 'profesor.bruno@uco.net.co',
    rol: 'PROFESOR',
  },
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    sessionStorage.clear();
    service = TestBed.inject(SessionService);
  });

  afterEach(() => sessionStorage.clear());

  it('guarda token, tipo, expiraEn y usuario tras un login', () => {
    service.saveSession(SESION);

    expect(service.getToken()).toBe('jwt-de-prueba');
    expect(service.getUser()).toEqual(SESION.usuario);
    expect(service.hasSession()).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}')).toEqual(SESION);
  });

  it('no guarda contraseña ni passwordHash aunque lleguen en la respuesta', () => {
    const respuestaContaminada = {
      ...SESION,
      contrasena: 'PasswordSeguro123*',
      passwordHash: '$2a$10$hash',
    };

    service.saveSession(respuestaContaminada);

    const guardado = sessionStorage.getItem(CLAVE) ?? '';
    expect(guardado).not.toContain('PasswordSeguro123');
    expect(guardado).not.toContain('passwordHash');
    expect(guardado).not.toContain('contrasena');
  });

  it('clearSession elimina toda la sesión', () => {
    service.saveSession(SESION);

    service.clearSession();

    expect(sessionStorage.getItem(CLAVE)).toBeNull();
    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
    expect(service.hasSession()).toBe(false);
  });

  it('sin sesión guardada devuelve nulos sin romper', () => {
    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
    expect(service.hasSession()).toBe(false);
    expect(() => service.clearSession()).not.toThrow();
  });

  it('descarta un dato dañado en lugar de fallar', () => {
    sessionStorage.setItem(CLAVE, '{no es json');

    expect(service.getToken()).toBeNull();
    expect(service.hasSession()).toBe(false);
    expect(sessionStorage.getItem(CLAVE)).toBeNull();
  });

  it('descarta un valor guardado sin token ni usuario', () => {
    sessionStorage.setItem(CLAVE, JSON.stringify({ tipo: 'Bearer' }));

    expect(service.hasSession()).toBe(false);
    expect(sessionStorage.getItem(CLAVE)).toBeNull();
  });
});
