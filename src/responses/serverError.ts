import { HTTP_STATUS_CODE, httpResponse } from '../system/http';
import { ResponseFunction } from '../system/controllers';

/**
 * Internall response function.
 * Returns HTTP 500 INTERNAL SERVER ERROR
 * @param err - error to send
 */
export function serverError(err?: any): ResponseFunction {
  return httpResponse(err, HTTP_STATUS_CODE.INTERNAL_ERROR, 'responses/serverError');
}
