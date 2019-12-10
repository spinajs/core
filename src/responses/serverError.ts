import * as express from 'express';
import { HTTP_STATUS_CODE, httpResponse, Response, ResponseFunction } from '../system/http';

/**
 * Internall response function.
 * Returns HTTP 500 INTERNAL SERVER ERROR
 * @param err - error to send
 */

export class ServerError extends Response {

  constructor(data: any) {
    super(data);
  }

  public async execute(_req: express.Request, _res: express.Response): Promise<ResponseFunction> {
    return httpResponse(this.responseData, HTTP_STATUS_CODE.INTERNAL_ERROR, 'responses/serverError');
  }
}


