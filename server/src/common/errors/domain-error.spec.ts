import { describe, expect, it } from 'vitest';
import { DomainError, fail } from './domain-error.js';

describe('DomainError', () => {
  it('is an Error and keeps the message', () => {
    const err = new DomainError('Недостатньо залишку');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.message).toBe('Недостатньо залишку');
  });
});

describe('fail', () => {
  it('throws a DomainError with the given message', () => {
    expect(() => fail('Заявка закрита')).toThrow(DomainError);
    expect(() => fail('Заявка закрита')).toThrow('Заявка закрита');
  });
});
