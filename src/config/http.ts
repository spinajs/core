import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import * as express from 'express';
import * as helmet from 'helmet';
import { resolve, normalize, join } from 'path';
import { HttpAcceptHeaders } from './../system';

function dir(path: string) {
  return resolve(normalize(join(__dirname, path)));
}

/**
 * Http server configuration
 */
module.exports.http = {
  /**
   * port of http server to listen.
   */
  Port: 1337,

  /**
   * default middlewares applied to all routes
   */
  Middlewares: [
    helmet(),
    express.json({
      limit: '5mb',
    }),
    express.urlencoded({
      extended: true,
    }),
    cookieParser(),
    compression(),
  ],

  /**
   * Static files folder. Feel free to override this per app
   */
  Static: [
    {
      /**
       * virtual prefix in url eg. http://localhost:3000/static/images/kitten.jpg
       */
      Route: '/static',

      /**
       * full path to folder with static content
       */
      Path: dir('/../../data/public'),
    },
  ],

  /**
   * Whitch accept headers we support (default JSON & HTML)
   */
  AcceptHeaders: HttpAcceptHeaders.HTML | HttpAcceptHeaders.JSON,

  /**
   * Last resort fatal error fallback template, embedded in code
   * in case if we cannot render any static files
   */
  FatalTemplate: `<html>
    <head>
      <title>Oooops !</title>
    </head>
    <body>
      <h1>HTTP 500 - Internal Server Error</h1>
      <div>Looks like we're having some server issues.</div>
      <hr />
      <div>
        Go back to the previous page and try again. If you think something is broken, report a problem with fallowing ticket number:
      </div>
      <h3> Ticker no. {ticket}</h3>
    </body>
  </html>`,
};
