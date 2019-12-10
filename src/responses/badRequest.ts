import * as express from 'express';
import { HTTP_STATUS_CODE, httpResponse, Response, ResponseFunction } from '../system/http';

/**
 * Internall response function.
 * Returns HTTP 400 BAD REQUEST ERROR
 * @param err - error to send
 */

export class BadRequest extends Response {

  constructor(data: any) {
    super(data);
  }

  public async execute(_req: express.Request, _res: express.Response): Promise<ResponseFunction | void> {
    return httpResponse(this.responseData, HTTP_STATUS_CODE.BAD_REQUEST, 'responses/badRequest');
  }
}

