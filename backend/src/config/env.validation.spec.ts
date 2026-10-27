import { NodeEnv, validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('aplica valores por defecto y convierte numeros', () => {
    const env = validateEnv({ ...base, PORT: '4000' });
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.JWT_EXPIRES_IN).toBe(3600);
    expect(env.UPLOAD_DIR).toBe('uploads');
  });

  it('falla si falta DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('exige un JWT_SECRET de al menos 32 caracteres', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET/);
  });

  it('rechaza valores fuera de rango', () => {
    expect(() => validateEnv({ ...base, PORT: '70000' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
