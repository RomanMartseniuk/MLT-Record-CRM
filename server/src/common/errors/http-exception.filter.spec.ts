import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DomainError } from './domain-error.js';
import { DomainErrorFilter } from './http-exception.filter.js';

function makeHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('DomainErrorFilter', () => {
  it('maps DomainError to HTTP 422 with statusCode and message', () => {
    const { host, status, json } = makeHost();

    new DomainErrorFilter().catch(new DomainError('Недостатньо залишку'), host);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      statusCode: 422,
      message: 'Недостатньо залишку',
    });
  });
});
