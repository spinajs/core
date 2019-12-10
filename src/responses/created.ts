import * as express from 'express';
import { HTTP_STATUS_CODE, httpResponse, Response, ResponseFunction } from '../system/http';

/**
 * Internall response function.
 * Returns HTTP 201 CREATED
 * @param data - error to send
 */
export class Created extends Response {

  constructor(data: any) {
    super(data);
  }

  public async execute(_req: express.Request, _res: express.Response): Promise<ResponseFunction> {
    return httpResponse(this.responseData, HTTP_STATUS_CODE.CREATED, 'responses/created');
  }
}
