import { HTTP_STATUS_CODE, httpResponse } from '../system/http';

/**
 * Internall response function.
 * Returns HTTP 200 OK response with json content
 * @param data - data to send
 */
export function ok(data?: any) {
    return httpResponse(data, HTTP_STATUS_CODE.OK, "responses/ok")
}