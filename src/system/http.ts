// tslint:disable: no-bitwise

import { Configuration } from '@spinajs/configuration';
import { Autoinject, DI } from '@spinajs/di';
import { InvalidArgument, AuthenticationFailed, BadRequest, Forbidden, IOFail, ExpectedResponseUnacceptable, JsonValidationFailed, ResourceNotFound, MethodNotImplemented, UnexpectedServerError, ValidationFailed } from '@spinajs/exceptions';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as _ from 'lodash';
import { AddressInfo } from 'net';
import { join, normalize } from 'path';
import * as pugTemplate from 'pug';
import * as randomstring from 'randomstring';
import { BadRequest, Forbidden, NotFound, ServerError, Unauthorized } from '../responses';
import { Log, Logger, LogModule } from './log';
import { ModuleBase } from './module';

export type ResponseFunction = (req: express.Request, res: express.Response) => void;

export abstract class Response {
  protected responseData: any;

  constructor(responseData: any) {
    this.responseData = responseData;
  }

  public abstract async execute(req: express.Request, res: express.Response): Promise<ResponseFunction | void>;
}




/**
 * Sends data & sets proper header as json
 *
 * @param model - data to send
 * @param status - status code
 */
export function jsonResponse(model: any, status?: HTTP_STATUS_CODE) {
  return (_req: express.Request, res: express.Response) => {
    res.status(status ? status : HTTP_STATUS_CODE.OK);

    if (model) {
      res.json(model);
    }
  };
}

/**
 * Sends html response & sets proper header. If template is not avaible, handles proper error rendering.
 *
 * @param file - template file path
 * @param model - data passed to template
 * @param status - optional status code
 */
export function pugResponse(file: string, model: any, status?: HTTP_STATUS_CODE) {
  const log: Log = DI.get<LogModule>('LogModule').getLogger();
  const cfg: Configuration = DI.get('Configuration');

  return (_req: express.Request, res: express.Response) => {
    res.set('Content-Type', 'text/html');

    try {
      try {
        _render(file, model, status);
      } catch (err) {
        log.warn(`Cannot render pug file ${file}, error: ${err.message}:${err.stack}`, err);

        // try to render server error response
        _render('responses/serverError.pug', err, HTTP_STATUS_CODE.INTERNAL_ERROR);
      }
    } catch (err) {
      // final fallback rendering error fails, we render embedded html error page
      const ticketNo = randomstring.generate(7);

      log.warn(`Cannot render pug file error: ${err.message}, ticket: ${ticketNo}`, err);

      res.status(HTTP_STATUS_CODE.INTERNAL_ERROR);
      res.send(cfg.get<string>('http.FatalTemplate').replace('{ticket}', ticketNo));
    }

    function _render(f: string, m: any, c: HTTP_STATUS_CODE) {
      const view = getView(f);

      const content = pugTemplate.renderFile(
        view,
        _.merge(m, {
          // add i18n functions as globals
          __,
          __n,
          __l,
          __h,
        }),
      );

      res.status(c ? c : HTTP_STATUS_CODE.OK);
      res.send(content);
    }

    function getView(viewFile: string) {
      const views = cfg.get<string[]>('system.dirs.view')
        .map(p => normalize(join(p, viewFile)))
        .filter(f => fs.existsSync(f));

      if (_.isEmpty(views)) {
        throw new IOFail(`View file ${viewFile} not exists.`);
      }

      // return last merged path, eg. if application have own view files (override standard views)
      return views[views.length - 1];
    }
  };
}

/**
 * Default response handling. Checks `Accept` header & matches proper response
 * For now its supports html & json responses
 *
 * @param model - data to send
 * @param code - status code
 * @param template - template to render without extension eg. `views/responses/ok`. It will try to match .pug, .xml or whatever to match response
 *                  to `Accept` header
 */
export function httpResponse(model: any, code: HTTP_STATUS_CODE, template: string) {
  const cfg: Configuration = DI.get('Configuration');
  const acceptedHeaders = cfg.get<HttpAcceptHeaders>('http.AcceptHeaders');

  return (req: express.Request, res: express.Response) => {
    if (req.accepts('html') && (acceptedHeaders & HttpAcceptHeaders.HTML) === HttpAcceptHeaders.HTML) {
      pugResponse(`${template}.pug`, model, code)(req, res);
    } else if (req.accepts('json') && (acceptedHeaders & HttpAcceptHeaders.HTML) === HttpAcceptHeaders.JSON) {
      jsonResponse(model, code)(req, res);
    } else {
      jsonResponse(model, code)(req, res);
    }
  };
}

/**
 * Http server implementation. Default uses Express.js
 */
export class HttpServer extends ModuleBase {

  /**
   * Gets http port server is running on
   */
  public get Port(): number {
    return this.port;
  }


  /**
   * Gets address that server is running on
   */
  public get Address(): string {
    return this.address;
  }

  /**
   * Express app instance
   */
  protected express: express.Express;

  /**
   * Http socket server
   */
  protected server: http.Server;

  /**
   * Injected configuration
   */
  @Autoinject()
  protected cfg: Configuration;

  protected port: number;
  protected address: string;

  /**
   * Logger for this module
   */
  @Logger({ module: 'HttpServer' })
  private log: Log;

  /**
   * Starts http server.
   */
  public async start() {
    const port = this.cfg.get('http.port', 1337);
    return new Promise((res, _rej) => {
      this.handleResponse();
      this.handleErrors();

      this.server = this.express.listen(port, () => {
        this.port = (this.server.address() as AddressInfo).port;
        this.address = (this.server.address() as AddressInfo).address;

        this.log.info(`Http server started at ${this.Address}:${this.Port}`);
        res();
      });
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
    }
  }

  /**
   * Registers global middleware to express app
   *
   * @param middleware - middleware function
   */
  public use(middleware: any): void {
    this.express.use(middleware);
  }

  /**
   * Creates express app & registers middlewares
   */
  protected async onInitialize() {
    this.express = express();

    this.registerMiddlewares();
    this.registerStaticFiles();
  }

  /**
   * Adds common app-wise middlewares to express stack.
   */
  protected registerMiddlewares() {
    this.cfg.get<any[]>('http.middlewares', []).forEach(m => {
      this.use(m);
    });
  }

  /**
   * Adds static file to express. Paths are taken from config files.
   */
  protected registerStaticFiles() {
    this.cfg.get<IHttpStaticFileConfiguration[]>('http.static', []).forEach(s => {
      this.log.info(`Serving static content from: ${s.Path} at prefix: ${s.Route}`);
      this.express.use(s.Route, express.static(s.Path));
    });
  }

  /**
   * Handles thrown exceptions in actions.
   */
  protected handleErrors() {
    this.express.use((err: any, req: express.Request, res: express.Response) => {
      this.log.error(`Route error: ${err}, stack: ${err.stack}`, err.parameter);
      const error = {
        message: err.message,
        parameters: err.parameter,
        stack: {},
      };

      if (process.env.NODE_ENV === 'development') {
        error.stack = err.stack ? err.stack : err.parameter && err.parameter.stack;
      }

      let callback = null;

      switch (err.constructor) {
        case AuthenticationFailed:
          callback = unauthorized({ error: err });
          break;
        case Forbidden:
          callback = forbidden({ error: err });
          break;
        case InvalidArgument:
        case BadRequest:
        case ValidationFailed:
        case JsonValidationFailed:
        case ExpectedResponseUnacceptable:
          callback = badRequest({ error: err });
          break;
        case ResourceNotFound:
          callback = notFound({ error: err });
          break;
        case UnexpectedServerError:
        case IOFail:
        case MethodNotImplemented:
        default:
          callback = serverError({ error: err });
          break;
      }

      callback(req, res);
    });
  }

  /**
   * Executes response
   */
  protected handleResponse() {
    this.express.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!res.locals.response) {
        next(new UnexpectedServerError(`Route not found ${req.method}:${req.originalUrl}`));
        return;
      }

      res.locals.response(req, res, next);
    });
  }
}
