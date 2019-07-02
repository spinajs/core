import 'reflect-metadata';

import { isString } from 'util';

import { ModuleBase } from './module';
import { ServiceFactory } from './di';
import { ArgumentException } from './exceptions';
import _ from './lodash';
import { GlobalEvents } from './events';

/**
 * Global symbol used as property key on class 
 * that handle DI behaviour.
 */
export const DI_DESCRIPTION_SYMBOL = Symbol.for("DI_INJECTION_DESCRIPTOR");

/**
 * How to resolve class
 * @enum
 */
export enum ResolveType {
    /**
     * Application wise single instance. Default behaviour
     */
    Singleton,

    /**
     * New instance every time is requested
     */
    NewInstance,

    /**
     * New instance per child DI container.
     */
    PerChildContainer,
}

/**
 * Custom type to check if passed arg is Class (can be created via new())
 */
export type ServiceIdentifier = new (...args: any[]) => any;

/**
 * Custom type to check if passed arg is abstract class
 */
export type AbstractServiceIdentifier = Function & { prototype: any };

/**
 * Custom type to check if passed arg is DI factory function ( is called to create new object )
 */
export type ServiceFactory = (container: Container, ...args: any[]) => any;

/**
 * Interface to describe DI binding behaviour 
 */
export interface IBind {

    /**
     * `as` binding (alias)
     * 
     * @param type - base class that is being registered
     */
    as: (type: ServiceIdentifier | AbstractServiceIdentifier) => void;

    /**
     * self bind, class should be resolved by its name. Its default behaviour.
     */
    asSelf: () => void;
}

/**
 * Injection description definition structure
 */
interface InjectDescriptor {
    inject: ToInject[];
    resolver: ResolveType;
}

interface ToInject {
    inject: ServiceIdentifier;
    autoinject: boolean;
    autoinjectKey: string
}

interface ResolvedInjection {
    instance: any;
    autoinject: boolean;
    autoinjectKey: string;

}

/**
 * Injectable definition. If class implements this, means that have information about DI behaviour.
 */
interface Injectable {
    _di: InjectDescriptor;
}

/**
 * Sets dependency injection guidelines - what to inject for specified class
 * @param args - what to inject - class definitions
 * @example
 * ```javascript
 * 
 * @Inject(Bar)
 * class Foo{
 * 
 *  @Inject(Bar)
 *  barInstance : Bar;
 * 
 *  constructor(bar : Bar){
 *      // bar is injected when Foo is created via DI container
 *      this.barInstance = bar;
 *  }
 * 
 *  someFunc(){
 * 
 *    this._barInstance.doSmth();
 *  }
 * }
 * 
 * ```
 */
export function Inject(...args: (ServiceIdentifier | AbstractServiceIdentifier) []) {
    return (target: any) => {

        _initializeDi(target);
        for (const a of args) {
            target[DI_DESCRIPTION_SYMBOL]._di.inject.push({
                inject: a,
                autoinject: false,
                autoinjectKey: ""
            });
        }
    }
}

/**
 * Automatically injects dependency based on reflected property type. Uses experimental typescript reflection api
 * @param target 
 * @param key
 * @example
 * ```javascript
 * class Foo{
 * 
 *  @Autoinject
 *  barInstance : Bar;
 * 
 *  constructor(){
 *      // ....
 *  }
 * 
 *  someFunc(){
 * 
 *    // automatically injected dependency is avaible now
 *    this._barInstance.doSmth();
 *  }
 * }
 * 
 * ```
 */
export function Autoinject(target: any, key: string | symbol) {
    _initializeDi(target.constructor);

    const type = Reflect.getMetadata("design:type", target, key);
    target.constructor[DI_DESCRIPTION_SYMBOL]._di.inject.push({
        inject: type,
        autoinject: true,
        autoinjectKey: key
    });
}

/**
 * Lazy injects service to object. Use only with class properties
 * 
 * @param ser vice - class or name of service to inject
 * 
 * @example
 * ```javascript
 * 
 * class Foo{
 * ...
 * 
 *  @LazyInject(Bar)
 *  _barInstance : Bar; // _barInstance is not yet resolved
 * 
 *  someFunc(){
 *    // barInstance is resolved only when first accessed
 *    this._barInstance.doSmth();
 *  }
 * }
 * 
 * ```
 */
export function LazyInject(service: ServiceIdentifier | string) {
    return (target?: any, key?: string) => {

        // property getter
        var getter = function () {
            if (isString(service)) {
                return DI.get<any>(service);
            } else {
                return DI.resolve<any>(service);
            }
        };

        // Create new property with getter and setter
        Object.defineProperty(target, key, {
            get: getter,
            enumerable: false,
            configurable: true
        });
    }
}

/**
 * Per child instance injection decorator - object is resolved once per container - child containers have own instances.
 */
export function PerChildInstance() {
    return (target: any) => {
        _initializeDi(target);
        target[DI_DESCRIPTION_SYMBOL]._di.resolver = ResolveType.PerChildContainer;
    }
}

/**
 * NewInstance injection decorator - every time class is injected - its created from scratch
 */
export function NewInstance() {
    return (target: any) => {
        _initializeDi(target);
        target[DI_DESCRIPTION_SYMBOL]._di.resolver = ResolveType.NewInstance;
    }
}

/**
 * Singleton injection decorator - every time class is resolved - its created only once globally ( even in child DI containers )
 */
export function Singleton() {
    return (target: any) => {
        _initializeDi(target);
    }
}

/**
 * Interface to describe DI resolve strategies. Strategies are used do 
 * do some work at object creation eg. initialize objects that inherits from same class
 * specific way but without need for factory function. 
 * 
 * Internally its used to initialize all framework internal modules.
 * 
 * @see FrameworkModuleResolveStrategy implementation
 */
export interface ResolveStrategy {

    resolve: (target: any, container : Container) => any;
}

/**
 * Resolve strategy to initialize framework internal modules.
 */
export class FrameworkModuleResolveStrategy implements ResolveStrategy {
    async resolve(target: any, _container : Container) {
        if (target instanceof ModuleBase) {

            const ev = GlobalEvents;

            ev.emit("beforeModuleInitialize", target);
            await target.initialize();
            ev.emit("afterModuleInitialize", target);
        }

        return target;
    }
}

/**
 * Ensures that DI object is set for default values
 * @param target - target class definition
 * @hidden
 */
function _initializeDi(target: any): void {
    if (target[DI_DESCRIPTION_SYMBOL] == undefined) {
        target[DI_DESCRIPTION_SYMBOL] = {
            _di: {
                inject: [],
                resolver: ResolveType.Singleton
            }
        };
    }
}

/**
 * Dependency injection container implementation
 */
export class Container {

    /**
     * Handles information about what is registered as what 
     * eg. that class IConfiguration should be resolved as DatabaseConfiguration etc.
     * @access private
     */
    private _registry: Map<ServiceIdentifier | AbstractServiceIdentifier, ServiceIdentifier | ServiceFactory>;

    /**
     * Singletons cache, objects that should be created only once are stored here.
     * @access private
     */
    private _cache: Map<string, any>;

    /**
     * Resolve strategy array. 
     */
    private _strategies: ResolveStrategy[] = [];


    /**
     * Parent container if avaible
     */
    private _parent: Container = undefined;

    /**
     * Returns container cache - map object with resolved classes as singletons
     */
    get Cache() {
        return this._cache;
    }

    get ResolveStrategies() : ResolveStrategy[]
    {
        return this._strategies;
    }

    constructor(parent?: Container) {

        this._registry = new Map<ServiceIdentifier | AbstractServiceIdentifier, ServiceIdentifier>();
        this._cache = new Map<string, any>();

        if(parent){
            this._strategies = parent.ResolveStrategies.slice(0);
        }

        this._parent = parent;
    }

    /**
     * Adds resolve strategy to container.
     * 
     * @param strategy - strategy to add
     */
    public addStrategy(strategy: ResolveStrategy) {
        this._strategies.push(strategy);
    }

    /**
     * Clears container registry and cache.
     */
    public clear() {
        this._cache.clear();
        this._registry.clear();
    }

    /**
     * Register class/interface to DI. 
     * @param type - interface object to register
     * @throws { ArgumentException } if type is null or undefined
     */
    public register(implementation: ServiceIdentifier | ServiceFactory): IBind {

        if (_.isNil(implementation)) {
            throw new ArgumentException('argument `type` cannot be null or undefined');
        }

        const self = this;

        return {
            as: (type: ServiceIdentifier | AbstractServiceIdentifier) => {
                self._registry.set(type, implementation);
            },
            asSelf: () => {
                self._registry.set(implementation, implementation);
            }
        }
    }

    /**
     * Creates child DI container.
     * 
     */
    public child(): Container {
        return new Container(this);
    }

    /**
     * Gets already resolved service. Works only for singleton classes.
     * 
     * @param serviceName - name of service to get
     * @returns { null | T} - null if no service has been resolved at given name
     */
    public get(service: string | ServiceIdentifier | AbstractServiceIdentifier, parent = true): any {

        const identifier = (typeof service === "string") ? service : service.constructor.name;

        if (this._cache.has(identifier)) {
            return this._cache.get(identifier);
        } else if (this._parent && parent) {
            return this._parent.get(service);
        }

        return null;
    }

    /**
     * Checks if service is already resolved and exists in container cache.
     * NOTE: check is only valid for classes that are singletons.
     * 
     * @param service - service name or class to check
     * @returns { boolean } - true if service instance already exists, otherwise false.
     * @throws { ArgumentException } when service is null or empty
     */
    public has(service: string | ServiceIdentifier | AbstractServiceIdentifier, parent = true): boolean {

        if (!service) {
            throw new ArgumentException("argument cannot be null or empty");
        }

        const name = _.isString(service) ? service : service.constructor.name;

        if (this._cache.has(name)) {
            return true;
        }

        if (this._parent && parent) {
            return this._parent.has(name);
        }

        return false;
    }

    /**
     * Resolves specified type. 
     * 
     * @param type { ServiceIdentifier | ServiceFactory } - class to resolve or service factory function
     * @param options - optional parameters passed to class constructor
     * @return - class instance
     * @throws { ArgumentException } if type is null or undefined
     */
    public async resolve<T>(type: ServiceIdentifier | ServiceFactory | AbstractServiceIdentifier, options?: any[]): Promise<T> {

        const self = this;

        if (_.isNil(type)) {
            throw new ArgumentException('argument `type` cannot be null or undefined');
        }

        let target = this._registry.has(<ServiceIdentifier>type) ? this._registry.get(<ServiceIdentifier>type) : type;

        /**
         * Double cast to remove typescript errors, we are sure that needed properties are in class definition
         */
        let descriptor = <Injectable>((<any>target)[DI_DESCRIPTION_SYMBOL] || { _di: { inject: [], resolver: ResolveType.Singleton } });

        const toInject: ResolvedInjection[] = await Promise.all(descriptor._di.inject.map(async (t) => {
            return {
                autoinject: t.autoinject,
                autoinjectKey: t.autoinjectKey,
                instance: await this.resolve(t.inject)
            };
        }));

        let instance = null;
        switch (descriptor._di.resolver) {
            case ResolveType.NewInstance:
                instance = _getNewInstance(target, toInject);
                break;
            case ResolveType.Singleton:
                instance = _getCachedInstance(type, true) || await _getNewInstance(target, toInject);
                break;
            case ResolveType.PerChildContainer:
                instance = _getCachedInstance(type, false) || await _getNewInstance(target, toInject);
                break;
        }

        return instance;


        function _getCachedInstance(e: any, parent: boolean): any {

            if (self.has(e.name, parent)) {
                return self.get(e.name, parent);
            }

            return null;
        }

        async function _getNewInstance(e: any, a?: ResolvedInjection[]): Promise<any> {
            let args: any[] = [null];
            let instance: any = null;

            /**
             * If type is not Constructable, we assume its factory function,
             * just call it with `this` container.
             */
            if (!_.isConstructor(e) && _.isFunction(e)) {
                instance = (<ServiceFactory>e)(self, ...[].concat(options));
            } else {
                if (_.isArray(a)) {
                    args = args.concat(a.filter(i => !i.autoinject).map(i => i.instance));
                }

                if (!_.isEmpty(options)) {
                    args = args.concat(options);
                }

                instance = new (Function.prototype.bind.apply(e, args));

                for (const ai of a.filter(i => i.autoinject)) {
                    instance[ai.autoinjectKey] = ai.instance;
                }

                await Promise.all(self._strategies.map(s => s.resolve(instance, self)));
            }

            self._cache.set(type.name, instance);
            return instance;
        }
    }
}

export namespace DI {

    /**
     * App main DI container
     */
    export const RootContainer = new Container();

    // add modules resolve strategy to proper init
    RootContainer.addStrategy(new FrameworkModuleResolveStrategy());

    /**
     * Clears root container registry and cache.
     */
    export function clear() {
        RootContainer.clear();
    }

    /**
       * Register class/interface to DI root container.
       * @param type - interface object to register
       * @throws { ArgumentException } if type is null or undefined
       */
    export function register(type: ServiceIdentifier | ServiceFactory): IBind {
        return RootContainer.register(type);
    }

    /**
     * Resolves specified type from root container.
     * 
     * @param type - class to resolve
     * @param options - optional parameters passed to class constructor
     * @return - class instance
     * @throws { ArgumentException } if type is null or undefined
     */
    export async function resolve<T>(type: ServiceIdentifier | AbstractServiceIdentifier, options?: any[]): Promise<T> {
        return RootContainer.resolve<T>(type, options);
    }

    /**
     * Gets already resolved service from root container.
     * 
     * @param serviceName - name of service to get
     * @returns { null | T} - null if no service has been resolved at given name
     */
    export function get<T>(serviceName: string | ServiceIdentifier | AbstractServiceIdentifier): T {
        return <T>RootContainer.get(serviceName);
    }

    /**
     * Checks if service is already resolved and exists in container cache.
     * NOTE: check is only valid for classes that are singletons.
     * 
     * @param service - service name or class to check
     * @returns { boolean } - true if service instance already exists, otherwise false.
     */
    export function has(service: string | ServiceIdentifier | AbstractServiceIdentifier): boolean {
        return RootContainer.has(service);
    }

    /**
     * Creates child DI container.
     * 
     */
    export function child(): Container {
        return RootContainer.child();
    }
}