import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@secure-cbt/shared';

/**
 * Wraps all successful controller responses in the standard { success, message, data } format.
 * If the controller already returns a response in the standard format, it passes through unchanged.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse();
    const request = http.getRequest();

    return next.handle().pipe(
      map((data) => {
        // If response is already in standard format, pass through
        if (data && typeof data === 'object' && 'success' in data && 'message' in data) {
          return data as ApiResponse<T>;
        }

        // Skip wrapping for certain content types
        const contentType = response.getHeader('Content-Type');
        if (contentType && typeof contentType === 'string' && !contentType.includes('json')) {
          return data;
        }

        // Derive message from method
        const method = request.method;
        let message = 'Operation successful';
        if (method === 'POST') message = 'Resource created successfully';
        else if (method === 'PUT' || method === 'PATCH') message = 'Resource updated successfully';
        else if (method === 'DELETE') message = 'Resource deleted successfully';
        else if (method === 'GET') message = 'Data retrieved successfully';

        return {
          success: true,
          message,
          data: data ?? null,
        } satisfies ApiResponse<T>;
      }),
    );
  }
}
