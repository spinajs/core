import { HTTP_STATUS_CODE, httpResponse } from '../system/http';

/**
 * Internall response function.
 * Returns HTTP 204 NO CONTENT 
 * @param err - error to send
 */
export function noContent(err? : any) {
   return httpResponse(err, HTTP_STATUS_CODE.NO_CONTENT, "responses/noContent")
}