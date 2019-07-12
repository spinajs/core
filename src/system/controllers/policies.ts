import * as express from "express";
import { IControllerMetadata } from '.';
import { IRoute } from "./routes";

export type NewablePolicy = new (...args: any[]) => BasePolicy;

export interface IPolicy {

    Type: NewablePolicy;

    Options: any[];
}


export abstract class BasePolicy {

    public abstract isEnabled(action: IRoute, instance: IControllerMetadata): boolean;

    public abstract execute(req: express.Request): Promise<boolean>;

}

