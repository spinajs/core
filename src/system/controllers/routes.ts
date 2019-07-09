import { IMiddleware } from "./middlewares";
import { IPolicy } from "./policies";

/**
 * Avaible route types, match HTTP methods
 */
export enum RouteType {
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

    UNKNOWN = "unknown"
}

/**
 * Avaible route parameters type
 */
export enum ParameterType {

    /**
     * Parameter value is taken from query string eg. `?name=flavio`
     */
    FromQuery,

    /**
     * From message body, eg. POST json object
     */
    FromBody,

    /**
     * From url params eg: `/:id`
     */
    FromParams,
}

/**
 * Describes parameters passed to route.
 */
export interface IRouteParameter {
    /**
     * Parameter index in function args
     */
    Index: number;

    /**
     * Is value taken from query string, url params or message body
     */
    Type: ParameterType;

    /**
     * Schema for validation
     */
    Schema?: any;

    /**
     * Parameter runtime type eg. number or class
     */
    RuntimeType: any;

    /**
     * Name of parameter eg. `id`
     */
    Name: string;
}

export interface IRoute {
    /**
     * url path eg. /foo/bar/:id
     */
    Path: string;

    /**
     * HTTP request method, used internally. Not visible to others.
     */
    InternalType: RouteType;

    /**
     * SPINAJS API method type, mostly same as HTTP type, but can be non standard type eg. FILE
     * This type is visible outside in api discovery.
     */
    Type: RouteType;

    /**
     * Method name assigned to this route eg. `findUsers`
     */
    Method: string;

    /**
     * Custom route parameters taken from query string or message body
     */
    Parameters: Map<number, IRouteParameter>;

    /**
     * Assigned middlewares to route
     */
    Middlewares: IMiddleware[];

    /**
     * Assigned policies to route
     */
    Policies: IPolicy[];
}




