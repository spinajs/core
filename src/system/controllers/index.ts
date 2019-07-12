import * as express from "express";
import { TypescriptCompiler, FromFiles, ClassInfo } from '../reflection';
import { ValidationException, ServerErrorException } from '../exceptions';
import { IMiddleware, NewableMiddleware, BaseMiddleware } from "./middlewares";
import { IPolicy, NewablePolicy } from "./policies";
import { IRoute, RouteType, IRouteParameter, ParameterType } from "./routes";
import { ModuleBase } from "../module";
import { Autoinject } from "../di";
import { HttpServer } from "../http";
import { Schema } from "../schema";
import { RequestHandler } from "express-serve-static-core";
import { DI } from "../di";

const ControllerKey = Symbol("CONTROLLER_SYMBOL");

export interface IControllerMetadata {
    Routes: Map<string | symbol, IRoute>;

    Middlewares: IMiddleware[];

    Policies: IPolicy[];

    BasePath: string;
}


export function Controller(callback: (controller: IControllerMetadata, target: any, propertyKey: symbol | string, indexOrDescriptor: number | PropertyDescriptor) => void): any {
    return (target: any, propertyKey: string | symbol, indexOrDescriptor: number | PropertyDescriptor) => {
        let metadata: IControllerMetadata = Reflect.getMetadata(ControllerKey, target.prototype || target);
        if (!metadata) {
            metadata = {
                BasePath: null,
                Middlewares: [],
                Policies: [],
                Routes: new Map<string, IRoute>()
            };

            Reflect.defineMetadata(ControllerKey, metadata, target.prototype || target);
        }

        if (callback) {
            callback(metadata, target.prototype || target, propertyKey, indexOrDescriptor)
        }
    }
}


function Route(callback: (controller: IControllerMetadata, route: IRoute, target: any, propertyKey: string, indexOrDescriptor: number | PropertyDescriptor) => void) {
    return Controller((metadata: IControllerMetadata, target: any, propertyKey: string, indexOrDescriptor: number | PropertyDescriptor) => {

        let route: IRoute = null;
        if (propertyKey) {
            if (metadata.Routes.has(propertyKey)) {
                route = metadata.Routes.get(propertyKey);
            } else {
                route = {
                    InternalType: RouteType.UNKNOWN,
                    Method: propertyKey,
                    Middlewares: [],
                    Parameters: new Map<number, IRouteParameter>(),
                    Path: "",
                    Policies: [],
                    Type: RouteType.UNKNOWN
                }
            }
        }

        if (callback) {
            callback(metadata, route, target, propertyKey, indexOrDescriptor);
        }
    });
}

function Parameter(type: ParameterType, schema: any) {
    return (_: IControllerMetadata, route: IRoute, target: any, propertyKey: string, index: number) => {
        const param: IRouteParameter = {
            Index: index,
            Name: "",
            RuntimeType: Reflect.getMetadata("design:paramtypes", target.prototype || target, propertyKey)[index],
            Schema: schema,
            Type: type,
        };

        route.Parameters.set(index, param);
    }
}

export function Policy(policy: NewablePolicy, ...options: any[]) {
    return Route((controller: IControllerMetadata, route: IRoute, _: any, _1: string, _2: number | PropertyDescriptor) => {
        const pDesc = {
            Options: options,
            Type: policy,
        };

        if (route) {
            route.Policies.push(pDesc);
        } else {
            controller.Policies.push(pDesc);
        }
    });
}

export function Middleware(policy: NewableMiddleware, ...options: any[]) {
    return Route((controller: IControllerMetadata, route: IRoute, _: any, _1: string, _2: number | PropertyDescriptor) => {
        const pDesc = {
            Options: options,
            Type: policy,
        };

        if (route) {
            route.Middlewares.push(pDesc);
        } else {
            controller.Middlewares.push(pDesc);
        }
    });
}



export function BasePath(path: string) {
    return Controller((metadata: IControllerMetadata) => {
        metadata.BasePath = path;
    });
}

/**
 * Route parameter taken from query string eg. route?id=1
 *
 * @param schema parameter json schema for optional validation
 */
export function Query(schema?: any) {
    return Route(Parameter(ParameterType.FromQuery, schema));
}

/**
 * Route parameter taken from message body (POST)
 *
 * @param schema parameter json schema for optional validation
 */
export function Body(schema?: any) {
    return Route(Parameter(ParameterType.FromBody, schema));
}

/**
 * Route parameter taken from url parameters eg. route/:id
 *
 * @param schema parameter json schema for optional validation
 */
export function Param(schema?: any) {
    return Route(Parameter(ParameterType.FromParams, schema));
}

/**
 * Creates HEAD http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Head(path?: string, routeName?: string) {
    return Route((_, route: IRoute) => {
        route.Type = RouteType.HEAD;
        route.InternalType = RouteType.HEAD;
        route.Path = path;
        route.Method = routeName;
    });
}

/**
 * Creates PATCH http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Patch(path?: string, routeName?: string) {
    return Route((_, route: IRoute) => {
        route.Type = RouteType.PATCH;
        route.InternalType = RouteType.PATCH;
        route.Path = path;
        route.Method = routeName;
    });
}

/**
 * Creates DELETE http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Del(path?: string, routeName?: string) {
    return Route((_, route: IRoute) => {
        route.Type = RouteType.DELETE;
        route.InternalType = RouteType.DELETE;
        route.Path = path;
        route.Method = routeName;
    });
}

/**
 * Creates FILE http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function File(path?: string, routeName?: string) {
    return Route((_, route: IRoute) => {
        route.Type = RouteType.FILE;
        route.InternalType = RouteType.GET;
        route.Path = path;
        route.Method = routeName;
    });
}

/**
 * Creates PUT http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Put(path?: string, routeName?: string) {
    return Route((_, route: IRoute) => {
        route.Type = RouteType.PUT;
        route.InternalType = RouteType.PUT;
        route.Path = path;
        route.Method = routeName;
    });
}

/**
 * Creates GET http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Get(path?: string, routeName?: string) {
    return Route((_, route: IRoute) => {
        route.Type = RouteType.GET;
        route.InternalType = RouteType.GET;
        route.Path = path;
        route.Method = routeName;
    });
}

/**
 * Creates POST http request method
 *
 * @param path - url path to method eg. /foo/bar
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Post(path?: string, routeName?: string) {
    return Route((_, route: IRoute) => {
        route.Type = RouteType.GET;
        route.InternalType = RouteType.GET;
        route.Path = path;
        route.Method = routeName;
    });
}


type RouteCallback = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => (req: express.Request, res: express.Response) => void;


export class BaseController extends ModuleBase {
    /**
     * Array index getter
     */
    [action: string]: any;

    /**
     * Express router with middleware stack
     */
    public readonly Router: express.Router = express.Router();

    /**
     * Get name of module
     */
    public get Name(): string {
        return this.constructor.name;
    }

    /**
     * Base path for all controller routes eg. my/custom/path/
     * 
     * It can be defined via `@BasePath` decorator, default to controller name without `Controller` part.
     */
    public get BasePath(): string {
        return this.Metadata.BasePath ? this.Metadata.BasePath : this.Name.substring(0, this.Name.indexOf("Controller")).toLowerCase();
    }

    /**
     * Get controller metadata eg. registered routes & route parameters, middlewares etc.
     */
    public get Metadata(): IControllerMetadata {
        return Reflect.getMetadata(ControllerKey, this) as IControllerMetadata;
    }


    public async initialize(): Promise<void> {

        for (const [, route] of this.Metadata.Routes) {
            const handlers: RequestHandler[] = [];
            const action: RouteCallback = this[route.Method];
            const path = route.Path ? `/${this.BasePath}/${route.Path}` : `/${this.BasePath}/${route.Method}`;
            const middlewares = await Promise.all<BaseMiddleware>(this.Metadata.Middlewares.concat(route.Middlewares || []).map(m => DI.resolve(m.Type, m.Options)));

            handlers.push(...middlewares.filter(m => m.isEnabled(route, this)).map(m => _invokeAction(m.onBeforeAction.bind(m))));
            handlers.push(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                const args = (await _extractRouteArgs(route, req)).concat([req, res, next]);
                res.locals.response = await action.call(this, ...args);
            });
            handlers.push(...middlewares.filter(m => m.isEnabled(route, this)).map(m => _invokeAction(m.onAfterAction.bind(m))));

            // register to express router
            (this.Router as any)[route.Type as string](path, handlers);
        }

        function _invokeAction(action: any) {
            return (req: express.Request, res: express.Response, next: express.NextFunction) => {
                action(req, res)
                    .then(() => {
                        next();
                    })
                    .catch((err: any) => {
                        next(err);
                    });
            };
        }

        async function _extractRouteArgs(route: IRoute, req: express.Request) {

            const args = new Array<any>(route.Parameters.size);

            for (const [, param] of route.Parameters) {
                let source = null;

                switch (param.Type) {
                    case ParameterType.FromBody:
                        source = req.body;
                        break;
                    case ParameterType.FromParams:
                        source = req.params;
                        break;
                    case ParameterType.FromQuery:
                        source = req.query;
                        break;
                }

                // if parameter have name defined load it up
                if (param.Name) {
                    // query params are always sent as strings, even numbers,
                    // we must try to parse them as integers first
                    if (param.RuntimeType.name.toLowerCase() === 'number') {
                        args[param.Index] = Number(source[param.Name]);
                    } else {
                        args[param.Index] = source[param.Name];
                    }
                } else {
                    // no parameter name, all query params goes to one val
                    args[param.Index] = source;
                }

                if (param.Schema) {

                    const validator = await DI.resolve<Schema>(Schema);
                    if (!validator) {
                        throw new ServerErrorException("validation service is not avaible");
                    }

                    const result = validator.validate(param.Name || '', param.Schema, args[param.Index]);
                    if (result) {
                        throw new ValidationException(`parameter validation error`, result);
                    }
                }
            }

            return args;
        }
    }
}

export class ControllersModule extends ModuleBase {

    /**
     * Loaded controllers
     */
    @FromFiles('/**/*Controller.{ts,js}', 'system.dirs.controllers')
    public Controllers: Promise<Array<ClassInfo<BaseController>>>;

    @Autoinject()
    protected HttpServer: HttpServer;

    public async  initialize(): Promise<void> {

        // extract parameters info from controllers source code & register in http server
        for (const controller of await this.Controllers) {

            const compiler = new TypescriptCompiler(controller.File);
            const members = compiler.getClassMembers(controller.Name);

            for (const [name, route] of controller.Instance.Metadata.Routes) {
                if (members.has(name as string)) {
                    const member = members.get(name as string);

                    for (const [index, rParam] of route.Parameters) {
                        const parameterInfo = member.parameters[index];
                        if (parameterInfo) {
                            rParam.Name = parameterInfo.name.getText();
                        }
                    }
                }
            }

            this.HttpServer.use(controller.Instance.Router);
        }
    }
}