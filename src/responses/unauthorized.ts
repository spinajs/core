import { HTTP_STATUS_CODE, httpResponse } from '../system/http';


/**
 * Internall response function.
 * Returns HTTP 401 UNAHTORIZED response with json content
 * @param data - data to send
 */
export function unauthorized(err?: any) {
    return httpResponse(err, HTTP_STATUS_CODE.UNAUTHORIZED, "responses/unauthorized")
}