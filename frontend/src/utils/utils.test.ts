import { downloadBlob, filenameFromDisposition } from './download';
import { formatDate, formatPrice } from './format';
import { parseSort, serializeSort, toggleSort } from './sort';

describe('sort utils', () => {
  it('parsea y serializa el formato del backend', () => {
    const items = parseSort('price:desc,title');
    expect(items).toEqual([
      { field: 'price', direction: 'desc' },
      { field: 'title', direction: 'asc' },
    ]);
    expect(serializeSort(items)).toBe('price:desc,title:asc');
    expect(parseSort('')).toEqual([]);
    expect(parseSort(null)).toEqual([]);
    expect(parseSort('a, ,b:desc')).toHaveLength(2);
  });

  it('cicla asc -> desc -> sin orden y agrega columnas al final', () => {
    let sort = toggleSort([], 'price');
    expect(sort).toEqual([{ field: 'price', direction: 'asc' }]);
    sort = toggleSort(sort, 'title');
    expect(sort.map((s) => s.field)).toEqual(['price', 'title']);
    sort = toggleSort(sort, 'price');
    expect(sort[0]).toEqual({ field: 'price', direction: 'desc' });
    sort = toggleSort(sort, 'price');
    expect(sort).toEqual([{ field: 'title', direction: 'asc' }]);
  });
});

describe('format utils', () => {
  it('formatea precios en pesos chilenos', () => {
    expect(formatPrice(18990)).toMatch(/\$\s?18\.990/);
    expect(formatPrice(10.5)).toMatch(/10,5/);
  });

  it('formatea fechas', () => {
    expect(formatDate('2024-05-01T10:00:00.000Z')).toMatch(/2024/);
  });
});

describe('download utils', () => {
  it('lee el nombre del header Content-Disposition', () => {
    expect(filenameFromDisposition('attachment; filename="libros-2024.csv"', 'x.csv')).toBe('libros-2024.csv');
    expect(filenameFromDisposition("attachment; filename*=UTF-8''libros%20a.csv", 'x.csv')).toBe('libros a.csv');
    expect(filenameFromDisposition(undefined, 'x.csv')).toBe('x.csv');
    expect(filenameFromDisposition('inline', 'x.csv')).toBe('x.csv');
  });

  it('dispara la descarga con un link temporal', () => {
    vi.useFakeTimers();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(['a']), 'archivo.csv');
    expect(click).toHaveBeenCalled();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    vi.useRealTimers();
  });
});
