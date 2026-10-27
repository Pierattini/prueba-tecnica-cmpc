import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { CSV_BOM, escapeCsvValue, toCsvRow } from './csv.util';
import { diffFields } from './diff.util';
import { detectImageType } from './file-signature.util';
import { Paginated } from './paginated';
import { getClientIp } from './request.util';
import { parseSort } from './sort.util';

describe('parseSort', () => {
  const allowed = ['title', 'price', 'createdAt'] as const;
  const fallback = [{ field: 'createdAt' as const, direction: 'desc' as const }];

  it('devuelve el orden por defecto si no viene nada', () => {
    expect(parseSort(undefined, allowed, fallback)).toBe(fallback);
    expect(parseSort('   ', allowed, fallback)).toBe(fallback);
  });

  it('parsea varios campos respetando la prioridad', () => {
    expect(parseSort('price:desc, title:ASC', allowed, fallback)).toEqual([
      { field: 'price', direction: 'desc' },
      { field: 'title', direction: 'asc' },
    ]);
  });

  it('asume asc cuando no viene direccion e ignora comas sobrantes', () => {
    expect(parseSort('title,,', allowed, fallback)).toEqual([{ field: 'title', direction: 'asc' }]);
  });

  it('rechaza campos fuera de la lista permitida', () => {
    expect(() => parseSort('password:asc', allowed, fallback)).toThrow(BadRequestException);
  });

  it('rechaza direcciones invalidas', () => {
    expect(() => parseSort('title:up', allowed, fallback)).toThrow(/Dirección de orden inválida/);
  });

  it('rechaza campos repetidos', () => {
    expect(() => parseSort('title:asc,title:desc', allowed, fallback)).toThrow(/repetido/);
  });
});

describe('csv utils', () => {
  it('deja vacios null y undefined', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('escapa comillas, comas y saltos de linea', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('dice "hola"')).toBe('"dice ""hola"""');
    expect(escapeCsvValue('linea\nnueva')).toBe('"linea\nnueva"');
  });

  it('neutraliza formulas de Excel', () => {
    expect(escapeCsvValue('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCsvValue('@cmd')).toBe("'@cmd");
  });

  it('no modifica numeros negativos ni fechas', () => {
    expect(escapeCsvValue(-5)).toBe('-5');
    expect(escapeCsvValue(new Date('2024-01-02T03:04:05.000Z'))).toBe('2024-01-02T03:04:05.000Z');
  });

  it('arma filas con CRLF y expone el BOM', () => {
    expect(toCsvRow(['a', 1, true])).toBe('a,1,true\r\n');
    expect(CSV_BOM).toBe('﻿');
  });
});

describe('detectImageType', () => {
  it('reconoce jpg, png y webp por sus magic bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(detectImageType(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'latin1'))).toBe('webp');
  });

  it('rechaza otros contenidos aunque tengan extension de imagen', () => {
    expect(detectImageType(Buffer.from('%PDF-1.7'))).toBeNull();
    expect(detectImageType(Buffer.from('RIFF\x00\x00\x00\x00WAVE', 'latin1'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('diffFields', () => {
  it('devuelve solo los campos que cambiaron', () => {
    const before = { title: 'A', price: 10, stock: 1, at: new Date('2024-01-01') };
    const after = { title: 'A', price: 12, stock: 1, at: new Date('2024-01-02') };
    expect(diffFields(before, after, ['title', 'price', 'stock', 'at'])).toEqual({
      price: { from: 10, to: 12 },
      at: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' },
    });
  });

  it('trata undefined como null', () => {
    expect(diffFields({ a: undefined }, { a: null }, ['a'])).toEqual({});
  });
});

describe('Paginated', () => {
  it('calcula el total de paginas con minimo 1', () => {
    expect(Paginated.of([1, 2], 21, 2, 10).meta).toEqual({ page: 2, limit: 10, total: 21, totalPages: 3 });
    expect(Paginated.of([], 0, 1, 10).meta.totalPages).toBe(1);
  });
});

describe('getClientIp', () => {
  const req = (headers: Record<string, unknown>, ip?: string) => ({ headers, ip }) as unknown as Request;

  it('prioriza x-forwarded-for', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '1.1.1.1, 10.0.0.1' }, '::1'))).toBe('1.1.1.1');
    expect(getClientIp(req({ 'x-forwarded-for': ['2.2.2.2'] }))).toBe('2.2.2.2');
  });

  it('usa req.ip o undefined', () => {
    expect(getClientIp(req({}, '::1'))).toBe('::1');
    expect(getClientIp(req({}))).toBeUndefined();
  });
});
