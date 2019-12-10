import * as express from 'express';
import { HTTP_STATUS_CODE, pugResponse, Response, ResponseFunction } from '../system/http';

/**
 * HTML resposne with HTML from pug file
 */
export class PugResponse extends Response {

  protected file: string;
  protected status: HTTP_STATUS_CODE = null;

  constructor(file: string, model: any, status?: HTTP_STATUS_CODE) {
    super(model);

    this.file = file;
    this.status = status;
  }

  public async execute(_req: express.Request, _res: express.Response): Promise<ResponseFunction> {
    return pugResponse(this.file, this.responseData, this.status ? this.status : HTTP_STATUS_CODE.OK);
  }
}

