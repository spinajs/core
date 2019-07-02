import { HTTP_STATUS_CODE, httpResponse } from '../system/http';
import { ResponseFunction } from '../system/controllers';
/**
 * Internall response function.
 * Returns HTTP 404 NOT FOUND ERROR
 * @param err - error to send
 */
export function notFound(err?: any): ResponseFunction {
   return httpResponse(err, HTTP_STATUS_CODE.NOT_FOUND, "responses/notFound")
}