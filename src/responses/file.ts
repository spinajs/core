import { IOFail } from '@spinajs/exceptions';
import * as express from 'express';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as mime from 'mime';
import { Response, ResponseFunction } from '../system/http';

export class File extends Response {

  protected path: string;
  protected filename: string;
  protected mimeType: string;

  /**
   * Sends file to client at given path & filename. If file exists 
   * it will send file with 200 OK, if not exists 404 NOT FOUND
   * @param path - server full path to file
   * @param filename - real filename send to client
   * @param mimeType - optional mimetype. If not set, server will try to guess.
   */
  constructor(path: string, filename: string, mimeType?: string) {
    super(null);

    this.mimeType = mimeType ? mimeType : mime.getType(filename);
    this.filename = filename;
    this.path = path;

    if (!fs.existsSync(path)) {
      throw new IOFail(`File ${path} not exists`);
    }
  }

  public async execute(_req: express.Request, res: express.Response): Promise<ResponseFunction | void> {
    return new Promise((resolve, reject) => {
      res.sendFile(
        this.path,
        {
          headers: {
            'Content-Disposition': `attachment; filename="${this.filename}"`,
            'Content-Type': this.mimeType,
          },
        },
        (err: Error) => {
          if (!_.isNil(err)) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }
}

