export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  CORS_ORIGIN: string;
};

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];

  const required = (name: string): string => {
    const value = raw[name];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${name} is required`);
      return '';
    }
    return value;
  };

  const DATABASE_URL = required('DATABASE_URL');
  const JWT_SECRET = required('JWT_SECRET');
  if (JWT_SECRET && JWT_SECRET.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters');
  }

  const optional = (name: string, fallback: string): string => {
    const value = raw[name];
    return typeof value === 'string' && value.trim() !== '' ? value : fallback;
  };

  const JWT_EXPIRES_IN = optional('JWT_EXPIRES_IN', '8h');
  const CORS_ORIGIN = optional('CORS_ORIGIN', 'http://localhost:5173');
  const PORT = Number(raw.PORT ?? 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    errors.push('PORT must be integer between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n- ${errors.join('\n- ')}`);
  }

  return { DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT, CORS_ORIGIN };
}
