import { HTTP_STATUS_CODE, httpResponse } from '../system/http';

/**
 * Internall response function.
 * Returns HTTP 404 NOT FOUND ERROR
 * @param err - error to send
 */
export function notFound(err?: any) {
   return httpResponse(err, HTTP_STATUS_CODE.NOT_FOUND, "responses/notFound")
}