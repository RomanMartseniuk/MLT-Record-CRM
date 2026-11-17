import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://postgres@localhost:5432/mlt',
  JWT_SECRET: 'a-secret-longer-than-16',
};

describe('validateEnv', () => {
  it('returns typed values and applies defaults', () => {
    const env = validateEnv(valid);

    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.JWT_SECRET).toBe(valid.JWT_SECRET);
    expect(env.JWT_EXPIRES_IN).toBe('8h');
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('converts PORT from string to number', () => {
    expect(validateEnv({ ...valid, PORT: '4000' }).PORT).toBe(4000);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('throws when DATABASE_URL is blank', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: '   ' })).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('throws when JWT_SECRET is shorter than 16 characters', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(
      'JWT_SECRET must be at least 16 characters',
    );
  });

  it.each(['0', '70000', 'abc', '3000.5'])(
    'throws on invalid PORT %s',
    (port) => {
      expect(() => validateEnv({ ...valid, PORT: port })).toThrow('PORT');
    },
  );

  it('reports all problems at once', () => {
    expect(() => validateEnv({ JWT_SECRET: 'short', PORT: 'abc' })).toThrow(
      /DATABASE_URL is required[\s\S]*JWT_SECRET[\s\S]*PORT/,
    );
  });
});
