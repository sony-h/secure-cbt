import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

/**
 * Logs incoming requests and their completion time.
 * Adds X-Request-Id header for tracing.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const { method, url } = request;
    const requestId = uuidv4().slice(0, 8);

    // Attach request ID
    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          const statusCode = response.statusCode;
          if (statusCode < 400) {
            this.logger.log(`[${requestId}] ${method} ${url} → ${statusCode} (${duration}ms)`);
          }
        },
        error: (error: Error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `[${requestId}] ${method} ${url} → ERROR (${duration}ms): ${error.message}`,
          );
        },
      }),
    );
  }
}
