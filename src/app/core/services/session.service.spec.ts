import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { SesionAlmacenada } from '../models/sesion.model';
import { SessionService } from './session.service';

const CLAVE = 'sigra.sesion';

const SESION: SesionAlmacenada = {
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature',
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

    expect(service.getToken()).toBe('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature');
    expect(service.getUser()).toEqual(SESION.usuario);
    expect(service.hasSession()).toBe(true);
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}') as typeof SESION;
    expect(guardado.token).toBe(SESION.token);
    expect(guardado.tipo).toBe('Bearer');
    expect(guardado.usuario).toEqual(SESION.usuario);
    expect(guardado.expiraEn).toBeGreaterThan(Date.now());
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

  it('rechaza JWT con forma inválida, TTL no positivo o tipo distinto de Bearer', () => {
    expect(service.saveSession({ ...SESION, token: 'token-incompleto' })).toBe(false);
    expect(service.saveSession({ ...SESION, token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature' })).toBe(false);
    expect(service.saveSession({ ...SESION, expiraEn: 0 })).toBe(false);
    expect(service.saveSession({ ...SESION, tipo: 'Basic' })).toBe(false);
    expect(sessionStorage.getItem(CLAVE)).toBeNull();
  });

  it('acota la expiración guardada al claim exp cuando existe', () => {
    const expiraEn = Math.floor(Date.now() / 1000) + 60;
    const payload = btoa(JSON.stringify({ sub: '1', exp: expiraEn }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const guardado = service.saveSession({
      ...SESION,
      token: `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`,
      expiraEn: 3600,
    });

    expect(guardado).toBe(true);
    const sesion = JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}') as { expiraEn: number };
    expect(sesion.expiraEn).toBeLessThanOrEqual(expiraEn * 1000);
  });

  it('tolera StorageError sin exponerlo ni romper la aplicación', () => {
    const guardar = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    expect(service.saveSession(SESION)).toBe(false);
    guardar.mockRestore();

    const leer = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    expect(service.hasSession()).toBe(false);
    expect(() => service.clearSession()).not.toThrow();
    leer.mockRestore();
  });

  it('borra solo el token que sigue vigente', () => {
    expect(service.clearSessionIfToken('otro-token')).toBe(false);
    expect(service.hasSession()).toBe(false);

    expect(service.saveSession(SESION)).toBe(true);
    expect(service.clearSessionIfToken('otro-token')).toBe(false);
    expect(service.hasSession()).toBe(true);

    expect(service.clearSessionIfToken(SESION.token)).toBe(true);
    expect(service.hasSession()).toBe(false);
  });
});
