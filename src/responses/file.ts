import * as express from 'express';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as mime from 'mime';

import { ResponseFunction } from '../system/controllers';
import { IOException } from '../system/index';

/**
* Sends file to client at given path & filename. If file exists 
* it will send file with 200 OK, if not exists 404 NOT FOUND

 * @param path - server full path to file
 * @param filename - real filename send to client
 * @param mimeType - optional mimetype. If not set, server will try to guess.
 */
export function file(path: string, filename: string, mimeType?: string) : ResponseFunction {

    let mType = (mimeType) ? mimeType : mime.getType(filename);

    if (!fs.existsSync(path)) {
        throw new IOException(`File ${path} not exists`);
    }

    return async function (_req: express.Request, res: express.Response) {
        return new Promise((resolve, reject) => {
            res.sendFile(path, {
                headers: {
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Content-Type': mType
                }
            }, (err: Error) => {
                if (!_.isNil(err)) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })
    }
}