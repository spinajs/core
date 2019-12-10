import * as express from 'express';
import { Response, ResponseFunction } from '../system/http';

/**
 * Redirects to another route
 * 
 * @param url - url path to another location
 */
export class Redirect extends Response {

  protected url: string;

  constructor(url: any) {
    super(null);

    this.url = url;
  }

  public async execute(_req: express.Request, res: express.Response): Promise<ResponseFunction | void> {
    res.redirect(this.url);
  }
}


