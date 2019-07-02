import { HTTP_STATUS_CODE, httpResponse } from '../system/http';
import { ResponseFunction } from '../system/controllers';


/**
 * Internall response function.
 * Returns HTTP 403 FORBIDDEN ERROR
 * @param err - error to send
 */
export function forbidden(err?: any) : ResponseFunction{
    return httpResponse(err, HTTP_STATUS_CODE.FORBIDDEN, "responses/forbidden")
}