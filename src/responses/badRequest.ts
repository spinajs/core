import { HTTP_STATUS_CODE, httpResponse } from '../system/http';
 

/**
 * Internall response function.
 * Returns HTTP 400 BAD REQUEST ERROR
 * @param err - error to send
 */

export function badRequest(err?: any) {
    return httpResponse(err, HTTP_STATUS_CODE.BAD_REQUEST, "responses/badRequest");
}