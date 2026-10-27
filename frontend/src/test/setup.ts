import '@testing-library/jest-dom/vitest';

// jsdom no implementa estas APIs; se usan en la vista previa de imagen y la descarga del CSV
URL.createObjectURL = vi.fn(() => 'blob:preview');
URL.revokeObjectURL = vi.fn();

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
