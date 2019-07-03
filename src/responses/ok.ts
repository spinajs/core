import { HTTP_STATUS_CODE, httpResponse } from '../system/http';
import { ResponseFunction } from '../system/controllers';

/**
 * Internall response function.
 * Returns HTTP 200 OK response with json content
 * @param data - data to send
 */
export function ok(data?: any): ResponseFunction {
  return httpResponse(data, HTTP_STATUS_CODE.OK, 'responses/ok');
}
