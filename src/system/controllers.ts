import * as express from 'express';
import { RequestHandler } from 'express-serve-static-core';

import { ValidationException } from './exceptions';
import {
    Autoinject, ClassInfo, Configuration, DI, Exception, ForbiddenException, FromFiles, HttpServer,
    Log, Logger, ModuleBase, ModuleEvents, ServerErrorException
} from './index';
import _ from './lodash';
import { Schema } from './schema';

export type ResponseFunction = (req: express.Request, res: express.Response) => void;

export const CONTROLLER_DESCRIPTOR_SYMBOL = Symbol.for('CONTROLLER_DESCRIPTOR_SYMBOL');

export enum RouteParameterType {
  FromQuery,
  FromBody,
  FromParams,
}

export interface IRouteParameterDescriptor {
  Index: number;
  RouteType: RouteParameterType;
  Schema: any;
  ParameterType: any;
  ParameterName: string;
}

/**
 *
 * Sets base path for controller, all routes in controller will have it
 *
 * @param path controller base path
 */
export function BasePath(path: string) {
  return (target: any) => {
    const cdesc: ControllerDescriptor = createControllerDescriptor(target.prototype);
    cdesc.BasePath = path;
  };
}

/**
 * Route parameter taken from qeury string
 *
 * @param schema parameter json schema for optional validation
 */
export function Query(key?: string, schema?: any) {
  return createParameterDescription(key, schema, RouteParameterType.FromQuery);

}

/**
 * Route parameter taken from params
 *
 * @param schema parameter json schema for optional validation
 */
export function Params(key?: string, schema?: any) {
  return createParameterDescription(key, schema, RouteParameterType.FromParams);

}

/**
 * Route parameter taken from message body (POST)
 *
 * @param schema parameter json schema for optional validation
 */
export function Body(key?: string, schema?: any) {
  return createParameterDescription(key, schema, RouteParameterType.FromBody);
}

function createParameterDescription(key: string, schema: any, routeType: RouteParameterType) {

  const param: any = {
    ParameterName: key,
    RouteType: routeType,
    Schema: schema,
  };


  return (target: any, propertyKey: string, parameterIndex: number) => {
    const cdesc: ControllerDescriptor = createControllerDescriptor(target);

    param.Index = parameterIndex;
    param.ParameterType = Reflect.getMetadata('design:paramtypes', target, propertyKey)[parameterIndex];

    if (cdesc.hasRoute(propertyKey)) {
      cdesc.getRoute(propertyKey).Parameters.push(param);
    } else {
      const routedef = new RouteDefinition();
      routedef.FunctionName = propertyKey;
      routedef.Parameters.push(param);
      cdesc.Routes.push(routedef);
    }

  }
}

/**
 * =========================== POLICIES ===================================
 */

/**
 * Internal policy middleware. It only executes policy in OnBeforeAction
 */
export abstract class PolicyBase implements IMiddleware {

  public abstract isEnabled(action: any): boolean;

  /**
   * Executes policy. If policy returns false it throws `ForbiddenException`
   *
   * @param req - express request
   */
  public async onBeforeAction(req: express.Request) {
    const result = await this.execute(req);
    if (result === false) {
      throw new ForbiddenException('You do not have access to this resource.');
    }
  }

// tslint:disable-next-line: no-empty
  public async onAfterAction() { }

  /**
   * Should check permission / access to route.
   *
   * @return { boolean } - true if access granted, false otherwise.
   */
  public abstract async execute(req: express.Request): Promise<boolean>;
}

/**
 * Adds policy to class/action. Policy is shortcut to define security layer to routes.
 *
 * If addef to class - it is added to all action in this class.
 *
 * @param policy - policy class to execute
 * @param options - optional options
 */
export function Policy(policy: NewablePolicy, options?: any) {
  return (target: any) => {
    const cdesc: ControllerDescriptor = createControllerDescriptor(target.prototype);
    const definition = new MiddlewareDefinition();
    definition.Middleware = policy;
    definition.Options = options;
    cdesc.Middlewares.push(definition);
  };
}

type NewablePolicy = new (...args: any[]) => PolicyBase;

/**
 * Policy interface. Implement it to create new policy.
 */

/**
 * =========================== MIDDLEWARES ================================
 */

type MiddlewareFuncion = () => void;

export class MiddlewareDefinition {

  public Middleware: NewableMiddleware | MiddlewareFuncion;

  public Options: any;
}

/**
 * Middleware decorator. Use it to add middleware to controller action. Can be added to controller or per action.
 * Middlewares added to controller are added to all controller action.
 *
 * @param mid  - middleware class object
 * @param options  - optional options passed to middleware instance
 */
export function Middleware(mid: NewableMiddleware | MiddlewareFuncion, options?: any) {
  return (target: any, method?: string) => {
    const definition = new MiddlewareDefinition();
    definition.Middleware = mid;
    definition.Options = options;

    if (method) {
      const cdesc: ControllerDescriptor = createControllerDescriptor(target);
      if (cdesc.hasRoute(method)) {
        const r = cdesc.getRoute(method);
        r.Middlewares.push(definition);
      } else {
        const r = new RouteDefinition();
        r.FunctionName = method;
        r.Middlewares.push(definition);
        cdesc.Routes.push(r);
      }
    } else {
      const cdesc: ControllerDescriptor = createControllerDescriptor(target.prototype);
      cdesc.Middlewares.push(definition);
    }
  };
}

type NewableMiddleware = new (...args: any[]) => IMiddleware;

/**
 * Middleware interface declaration. Use it to implement custom route middlewares
 */
export interface IMiddleware {
  /**
   * Inform, if middleware is enabled for given action
   */
  isEnabled(action: RouteDefinition, instance: BaseController): boolean;

  /**
   * Called before action in middleware stack eg. to modify req or resp objects.
   */
  onBeforeAction(req: express.Request): Promise<any>;

  /**
   * Called after action in middleware stack eg. to modify response
   */
  onAfterAction(req: express.Request): Promise<any>;
}

/**
 * ================================================================================================
 */

export type RouteFunction = (target: any, method: any, descriptor: any) => void;

/**
 * Controller route definition class
 */
export class RouteDefinition {
  /**
   * url path eg. /foo/bar/:id
   */
  public Path: string;

  /**
   * HTTP request method, used internally. Not visible to others.
   */
  public Type: ROUTE_TYPE;

  /**
   * SPINE API method type, mostly same as HTTP type, but in special cases use SPINE method typs eg. FILE
   * This type is visible outside in api discovery.
   */
  public MethodType: ROUTE_TYPE;

  /**
   * route name, that is exposed in api eg. `find` or `first`
   */
  public Name: string;

  /**
   * Function name assigned to this route
   */
  public FunctionName: string;

  /**
   * Custom route parameters taken from query string or message body
   */
  public Parameters: IRouteParameterDescriptor[] = [];

  /**
   * Assigned middlewares to route
   */
  public Middlewares: MiddlewareDefinition[] = [];
}

/**
 * Helper function to create route definition in controller class
 * @param target - target class
 * @param method - target method name
 * @param path - url path eg. /foo/bar/:id
 * @param routeName - route name, that is exposed in api eg. `find` or `first`
 * @param type - HTTP request method
 */
function createRoute(path: string, routeName: string, type: ROUTE_TYPE): RouteFunction {
  return (target: any, method: string): void => {

    const cdesc: ControllerDescriptor = createControllerDescriptor(target);
    const finalName: string = _.isNil(routeName) ? method : routeName;
    const finalPath: string = _.isNil(path) ? '' : path;

    if (cdesc.Routes.filter(r => r.Name === method).length !== 0) {
      throw new Exception(`Route ${finalPath}:${finalName}() at method ${method} already exists. Change method name !`);
    }

    const def = new RouteDefinition();
    def.Name = finalName;
    def.Path = finalPath;
    def.MethodType = type;
    def.FunctionName = method;

    switch (type) {
      case ROUTE_TYPE.FILE:
        def.Type = ROUTE_TYPE.GET;
        break;
      default:
        def.Type = type;
    }

    if (cdesc.hasRoute(method)) {
      cdesc.updateRoute(def);
    } else {
      cdesc.Routes.push(def);
    }
  };
}

function createControllerDescriptor(target: any) {
  if (!target[CONTROLLER_DESCRIPTOR_SYMBOL]) {
    target[CONTROLLER_DESCRIPTOR_SYMBOL] = new ControllerDescriptor();
  }

  return target[CONTROLLER_DESCRIPTOR_SYMBOL];
}

/**
 * Allowed route request types
 */
export enum ROUTE_TYPE {
  /**
   * POST method - used to create new resource or send data to server
   */
  POST = 'post',

  /**
   * GET method - used to retrieve data from server
   */
  GET = 'get',

  /**
   * PUT method - used to updates resource
   */
  PUT = 'put',

  /**
   * DELETE method - used to delete resource
   */
  DELETE = 'delete',

  /**
   * PATCH method - used to partially update resource eg. one field
   */
  PATCH = 'patch',

  /**
   * HEAD method - same as get, but returns no data. usefull for checking if resource exists etc.
   */
  HEAD = 'head',

  /**
   * FILE method - spine special route type. Internall its simple GET method, but informs that specified route returns binary file
   */
  FILE = 'file',
}

/**
 * Creates HEAD http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Head(path?: string, routeName?: string): RouteFunction {
  return createRoute(path, routeName, ROUTE_TYPE.HEAD);
}

/**
 * Creates PATCH http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Patch(path?: string, routeName?: string): RouteFunction {
  return createRoute(path, routeName, ROUTE_TYPE.PATCH);
}

/**
 * Creates DELETE http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Del(path?: string, routeName?: string): RouteFunction {
  return createRoute(path, routeName, ROUTE_TYPE.DELETE);
}

/**
 * Creates FILE http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function File(path?: string, routeName?: string): RouteFunction {
  return createRoute(path, routeName, ROUTE_TYPE.FILE);
}

/**
 * Creates PUT http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Put(path?: string, routeName?: string): RouteFunction {
  return createRoute(path, routeName, ROUTE_TYPE.PUT);
}

/**
 * Creates GET http request method
 * @param path - url path to method eg. /foo/bar/:id
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Get(path?: string, routeName?: string): RouteFunction {
  return createRoute(path, routeName, ROUTE_TYPE.GET);
}

/**
 * Creates POST http request method
 *
 * @param path - url path to method eg. /foo/bar
 * @param routeName - route name visible in api. If undefined, method name is taken
 */
export function Post(path?: string, routeName?: string): RouteFunction {
  return createRoute(path, routeName, ROUTE_TYPE.POST);
}

export class ControllerDescriptor {
  public Routes: RouteDefinition[] = [];

  public Middlewares: MiddlewareDefinition[] = [];

  public BasePath: string;

  public hasRoute(functionName: string): boolean {
    return this.getRoute(functionName) !== undefined;
  }

  public getRoute(functionName: string): RouteDefinition {
    return this.Routes.find(r => r.FunctionName === functionName);
  }

  public updateRoute(definition: RouteDefinition): void {
    if (this.hasRoute(definition.FunctionName)) {
      const route = this.getRoute(definition.Name);
      _.merge(route, definition);
    }
  }
}

/**
 * Basic interface of controller
 */
export interface IController {
  /**
   * Array index getter
   */
  [action: string]: any;

  /**
   * Express router with middleware stack
   */
  Router: express.Router;
}

/**
 * Base controller class. Use it to create controllers
 */
export class BaseController implements IController {
  /**
   * Array index getter
   */
  [action: string]: any;

  /**
   * Express router with middleware stack
   */
  public readonly Router: express.Router = express.Router();
}

/**
 * Events specific for controllers
 */
export interface IControllerEvents extends ModuleEvents {
  beforeRegisterAction: (action: RouteDefinition, controller: BaseController) => void;

  afterRegisterAction: (action: RouteDefinition, controller: BaseController) => void;

  beforeRegisterController: (controller: BaseController) => void;

  afterRegisterController: (controller: BaseController) => void;
}

type RouteCallback = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => (req: express.Request, res: express.Response) => void;

export class Controllers extends ModuleBase<IControllerEvents> {

  /**
   * Loaded controllers
   */
  @FromFiles('/**/*Controller.{ts,js}', 'system.dirs.controllers')
  public Controllers: Promise<Array<ClassInfo<IController>>>;

  /**
   * Application configuration
   */
  @Autoinject
  protected Cfg: Configuration;

  @Autoinject
  protected HttpServer: HttpServer;

  @Autoinject
  protected Validator: Schema;

  @Logger({ module: 'Controllers' })
  protected Log: Log;



  public async onInitialize() {
    const controllers = await this.Controllers;
    const self = this;

    for (const controller of controllers) {
      const instance = controller.Instance;
      const router = instance.Router;
      const cdesc: ControllerDescriptor = Object.getPrototypeOf(instance)[CONTROLLER_DESCRIPTOR_SYMBOL];
      const controllerName = instance.constructor.name
        .substring(0, instance.constructor.name.indexOf('Controller'))
        .toLowerCase();

      for (const route of cdesc.Routes) {

        let path = '';
        const handlers: RequestHandler[] = [];
        const action: RouteCallback = instance[route.FunctionName];
        const rootPath = cdesc.BasePath ? cdesc.BasePath : controllerName;
        const middlewares = await Promise.all<IMiddleware>(
          cdesc.Middlewares.concat(route.Middlewares || []).map(m => DI.resolve(m.Middleware, m.Options)),
        );

        if (!route.Path) {
          path = `/${rootPath}/${route.FunctionName}`;
        } else {
          path = `/${rootPath}/${route.Path}`;
        }

        await this.emit('beforeRegisterAction', route, instance);

        handlers.push(
          ...middlewares.filter(m => m.isEnabled(route, instance)).map(m => _invokeAction(m.onBeforeAction.bind(m))),
        );
        handlers.push(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
          const rdef = cdesc.getRoute(route.FunctionName);
          const args = _extractArgs(rdef, req).concat([req, res, next]);

          const callback = await action.call(instance, ...args);
          if (!callback || !_.isFunction(callback)) {
            throw new ServerErrorException(`route ${path} does not returned proper result`);
          }

          res.locals.response = callback;
          next();
        });
        handlers.push(
          ...middlewares.filter(m => m.isEnabled(route, instance)).map(m => _invokeAction(m.onAfterAction.bind(m))),
        );

        this.Log.trace(`Route registered: ${route.Type}: ${path}`);
        switch (route.Type) {
          case ROUTE_TYPE.DELETE:
            router.delete(path, handlers);
            break;
          case ROUTE_TYPE.GET:
            router.get(path, handlers);
            break;
          case ROUTE_TYPE.HEAD:
            router.head(path, handlers);
            break;
          case ROUTE_TYPE.PATCH:
            router.patch(path, handlers);
            break;
          case ROUTE_TYPE.POST:
            router.post(path, handlers);
            break;
          case ROUTE_TYPE.PUT:
            router.put(path, handlers);
            break;
        }

        await this.emit('afterRegisterAction', route, instance);
      }

      await this.emit('beforeRegisterController', controller);
      this.HttpServer.use(router);
      await this.emit('afterRegisterController', controller);
    }

    function _extractArgs(rdef: RouteDefinition, req: express.Request) {
      const args = new Array<any>(rdef.Parameters.length);

      for (const param of rdef.Parameters) {
        let source = null;

        switch (param.RouteType) {
          case RouteParameterType.FromBody:
            source = req.body;
            break;
          case RouteParameterType.FromParams:
            source = req.params;
            break;
          case RouteParameterType.FromQuery:
            source = req.query;
            break;
        }

        // if parameter have name defined load it up
        if (param.ParameterName) {
          // query params are always sent as strings, even numbers,
          // we must try to parse them as integers first
          if (param.ParameterType.name.toLowerCase() === 'number') {
            args[param.Index] = Number(source[param.ParameterName]);
          } else {
            args[param.Index] = source[param.ParameterName];
          }
        } else {
          // no parameter name, all query params goes to one val
          args[param.Index] = source;
        }

        if (param.Schema) {
          const result = self.Validator.validate(param.ParameterName || '', param.Schema, args[param.Index]);
          if (result) {
            throw new ValidationException(`parameter validation error`, result);
          }
        }
      }

      return args;
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
  }
}
