import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as _ from 'lodash';
import { AddressInfo } from 'net';
import { join, normalize } from 'path';
import * as pugTemplate from 'pug';
import * as randomstring from 'randomstring';

import {
    ArgumentException, AuthenticationException, Autoinject, BadRequestException, Configuration, DI,
    ForbiddenException, IOException, Log, Logger, LogModule, ModuleBase, NotAcceptableException,
    NotAcceptedException, NotFoundException, NotImplementedException, ServerErrorException,
    ValidationException
} from './index';
import { unauthorized, forbidden, badRequest, notFound, serverError } from '../responses';

export abstract class Response {

    protected ResponseData: any;

    constructor(responseData: any) {
        this.ResponseData = responseData;
    }

    public abstract async execute(req: express.Request, res: express.Response): Promise<void>;
}

/**
 * Accept header enum
 */
export enum HttpAcceptHeaders {

    /**
     * Accept header for JSON 
     */
    JSON = 1,

    /**
     * Accept header for HTML
     */
    HTML = 2,

    /**
     * Accept header for XML
     */
    XML = 4,

    /**
     * Accept all accept headers shorcut
     */
    ALL = 1 | 2 | 4
}


export interface HttpStaticFileConfiguration {

    /**
     * virtual prefix in url eg. http://localhost:3000/static/images/kitten.jpg
     */
    Route: string;

    /**
     * full path to folder with static content
     */
    Path: string;
}

/**
 * Http server & express.js configuration
 */
export interface HttpConfiguraton {

    /**
     * port of http server to listen. 
     */
    Port: number;

    /**
     * default middlewares applied to all routes
     */
    Middlewares: express.RequestHandler[];

    /**
     * Static files folder. Feel free to override this per app
     */
    Static: HttpStaticFileConfiguration;

    /**
     * Last resort fatal error fallback template, embedded in code
     * in case if we cannot render any static files
     */
    FatalTemplate: string;

    /**
     * Which accept headers we support (default JSON & HTML)
     */
    AcceptHeaders: HttpAcceptHeaders;
}

/**
 * HTTP response statuses
 */
export enum HTTP_STATUS_CODE {
    /**
     * All ok with content
     */
    OK = 200,

    /**
     * Request is OK and new resource has been created.
     */
    CREATED = 201,

    /**
     * Request is accepted, but has not been completed yet.
     */
    ACCEPTED = 202,

    /**
     * ALl is ok & no content to return
     */
    NO_CONTENT = 204,

    /**
     * The server is delivering only part of the resource (byte serving) due to a range header 
     * sent by the client. The range header is used by HTTP clients to enable resuming of 
     * interrupted downloads, or split a download into multiple simultaneous streams.
     */
    PARTIAL_CONTENT = 206,

    /**
     * Resource is not modified
     */
    NOT_MODIFIED = 304,

    /**
     * Invalid request, eg. invalid parameters
     */
    BAD_REQUEST = 400,

    /**
     * Auth required
     */
    UNAUTHORIZED = 401,

    /**
     * No permission
     */
    FORBIDDEN = 403,

    /**
     * Resource not found
     */
    NOT_FOUND = 404,

    /**
     * Not acceptable request headers (Accept header)
     */
    NOT_ACCEPTABLE = 406,

    /**
     * Internal server error. 
     */
    INTERNAL_ERROR = 500,

    /**
     * Method not implemented
     */
    NOT_IMPLEMENTED = 501,

}

/**
 * Sends data & sets proper header as json
 * 
 * @param model - data to send
 * @param status - status code
 */
export function jsonResponse(model: any, status?: HTTP_STATUS_CODE) {
    return function (_req: express.Request, res: express.Response) {
        res.status((status) ? status : HTTP_STATUS_CODE.OK);

        if (model) {
            res.json(model);
        }
    }
}


/**
 * Sends html response & sets proper header. If template is not avaible, handles proper error rendering.
 * 
 * @param file - template file path
 * @param model - data passed to template
 * @param status - optional status code
 */
export function pugResponse(file: string, model: any, status?: HTTP_STATUS_CODE) {


    const Log: Log = DI.get<LogModule>("LogModule").getLogger();
    const Cfg: Configuration = DI.get("Configuration");



    return function (_req: express.Request, res: express.Response) {

        res.set("Content-Type", "text/html");

        try {

            try {

                _render(file, model, status);

            } catch (err) {
                Log.warn(`Cannot render pug file ${file}, error: ${err.message}:${err.stack}`, err);

                // try to render server error response
                _render("responses/serverError.pug", err, HTTP_STATUS_CODE.INTERNAL_ERROR);
            }

        } catch (err) {

            // final fallback rendering error fails, we render embedded html error page
            const ticketNo = randomstring.generate(7);

            Log.warn(`Cannot render pug file error: ${err.message}, ticket: ${ticketNo}`, err);

            res.status(HTTP_STATUS_CODE.INTERNAL_ERROR);
            res.send(Cfg.get<string>('http.fatal_template').replace("{ticket}", ticketNo));
        }

        function _render(f: string, m: any, c: HTTP_STATUS_CODE) {
            const view = getView(f);

            const content = pugTemplate.renderFile(view, _.merge(m, {
                // add i18n functions as globals
                __: __,
                __n: __n,
                __l: __l,
                __h: __h
            }));

            res.status((c) ? c : HTTP_STATUS_CODE.OK);
            res.send(content);
        }


        function getView(file: string) {

            const views = Cfg.get<string[]>('system.dirs.view')
                .map(p => normalize(join(p, file)))
                .filter(f => fs.existsSync(f));

            if (_.isEmpty(views)) {
                throw new IOException(`View file ${file} not exists.`);
            }

            // return last merged path, eg. if application have own view files (override standard views)
            return views[views.length - 1];
        }
    }
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

    const cfg: Configuration = DI.get("Configuration");
    const acceptedHeaders = cfg.get<HttpAcceptHeaders>("http.AcceptHeaders");

    return function (req: express.Request, res: express.Response) {
        if (req.accepts("html") && (acceptedHeaders & HttpAcceptHeaders.HTML) == HttpAcceptHeaders.HTML) {
            pugResponse(`${template}.pug`, model, code)(req, res);
        } else if (req.accepts("json") && (acceptedHeaders & HttpAcceptHeaders.HTML) == HttpAcceptHeaders.JSON) {
            jsonResponse(model, code)(req, res);
        } else {
            jsonResponse(model, code)(req, res);
        }
    }
}

/**
 * Http server implementation. Default uses Express.js
 */
export class HttpServer extends ModuleBase {

    /**
     * Logger for this module
     */
    @Logger({ module: "HttpServer" })
    Log: Log;

    /**
     * Express app instance
     */
    protected Express: express.Express;

    /**
     * Http socket server
     */
    protected Server: http.Server;

    /**
     * Injected configuration
     */
    @Autoinject
    protected Cfg: Configuration;

    _port: number;

    /**
     * Gets http port server is running on
     */
    public get Port(): number {
        return this._port;
    }

    _address: string;

    /**
     * Gets address that server is running on
     */
    public get Address(): string {
        return this._address;
    }

    /**
     * Creates express app & registers middlewares
     */
    protected async onInitialize() {

        this.Express = express();

        this.registerMiddlewares();
        this.registerStaticFiles();
    }

    /**
     * Adds common app-wise middlewares to express stack.
     */
    protected registerMiddlewares() {

        this.Cfg.get<any[]>('http.middlewares', []).forEach(m => {
            this.use(m);
        });
    }

    /**
     * Adds static file to express. Paths are taken from config files.
     */
    protected registerStaticFiles() {

        this.Cfg.get<HttpStaticFileConfiguration[]>('http.static', []).forEach(s => {

            this.Log.info(`Serving static content from: ${s.Path} at prefix: ${s.Route}`);
            this.Express.use(s.Route, express.static(s.Path));
        })

    }

    /**
     * Handles thrown exceptions in actions.
     */
    protected handleErrors() {
        this.Express.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {

            this.Log.error(`Route error: ${err}, stack: ${err.stack}`, err.parameter);
            var error = {
                message: err.message,
                parameters: err.parameter,
                stack: {}
            };

            if (process.env.NODE_ENV == "development") {
                error.stack = (err.stack) ? err.stack : (err.parameter && err.parameter.stack);
            }

            let callback = null;

            switch (err.constructor) {
                case AuthenticationException:
                    callback = unauthorized({ error: err });
                    break;
                case ForbiddenException:
                    callback = forbidden({ error: err });
                    break;
                case ArgumentException:
                case BadRequestException:
                case ValidationException:
                case NotAcceptedException:
                case NotAcceptableException:
                    callback = badRequest({ error: err });
                    break;
                case NotFoundException:
                    callback = notFound({ error: err });
                    break;
                case ServerErrorException:
                case IOException:
                case NotImplementedException:
                default:
                    callback = serverError({ error: err });
                    break;
            }

            callback(req,res);
        });
    }

    /**
     * Executes response
     */
    protected handleResponse() {
        this.Express.use((req: express.Request, res: express.Response, next: express.NextFunction) => {

            if (!res.locals.response) {
                next(new ServerErrorException(`Route not found ${req.method}:${req.originalUrl}`));
                return;
            }

            res.locals.response(req, res, next);
        });
    }


    /**
     * Starts http server.
     */
    public async start() {
        const port = this.Cfg.get('http.port', 1337);
        return new Promise((res, _rej) => {
            
            this.handleResponse();
            this.handleErrors();

            this.Server = this.Express.listen(port, () => {
                this._port = (<AddressInfo>this.Server.address()).port;
                this._address = (<AddressInfo>this.Server.address()).address;

                this.Log.info(`Http server started at ${this.Address}:${this.Port}`);
                res();
            });
        });
    }

    public stop() {
        if (this.Server) {
            this.Server.close();
        }
    }

    /**
     * Registers global middleware to express app
     * 
     * @param middleware - middleware function
     */
    public use(middleware: any): void {
        this.Express.use(middleware);
    }
}