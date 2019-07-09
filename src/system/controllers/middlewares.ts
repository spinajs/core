import * as express from 'express';
import { BaseController } from './controllers';
import { IRoute } from "./routes";

export type NewableMiddleware = new (...args: any[]) => IMiddleware;

export interface IMiddleware {

    Type: NewableMiddleware;

    Options: any[];
}

export abstract class BaseMiddleware {
    /**
     * Inform, if middleware is enabled for given action
     */
    public abstract isEnabled(action: IRoute, instance: BaseController): boolean;

    /**
     * Called before action in middleware stack eg. to modify req or resp objects.
     */
    public abstract onBeforeAction(req: express.Request): Promise<any>;

    /**
     * Called after action in middleware stack eg. to modify response
     */
    public abstract onAfterAction(req: express.Request): Promise<any>;
}

