import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DomainError } from './domain-error.js';
import { Response } from 'express';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  public catch(exception: DomainError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(422).json({ statusCode: 422, message: exception.message });
  }
}
