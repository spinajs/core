import { HTTP_STATUS_CODE, httpResponse } from '../system/http';
 

/**
 * Internall response function.
 * Returns HTTP 201 CREATED
 * @param data - error to send
 */
export function created(data?: any) {
       return httpResponse(data, HTTP_STATUS_CODE.CREATED, "responses/created")
}