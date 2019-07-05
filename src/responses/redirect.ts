import * as express from 'express';
import { ResponseFunction } from '../system/controllers';


/**
 * Redirects to another route
 * 
 * @param url - url path to another location
 */
export function redirect(url : string): ResponseFunction {
  return (_ : express.Request, res: express.Response) =>{
      return res.redirect(url);
  }
}
