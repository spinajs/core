import * as _ from 'lodash';

import { FrameworkEventEmitter } from './events';
import { InvalidOperationException, NotImplementedException } from './exceptions';
import { FrameworkModule } from './interfaces';


/**
 * Events emittet by module
 */
export interface ModuleEvents {
 
}
 

/**
 * Base class of all core modules
 */
export abstract class ModuleBase<T extends ModuleEvents = ModuleEvents> extends FrameworkEventEmitter<T> implements FrameworkModule {

    /**
     * Name of module
     * @access protected
     */
    protected _name: string = "Module";

    /**
     * Mark if module is initialized or not
     * @access protected
     */
    private _isInitialized: boolean = false;

    /**
     * Gets module initialization status true - if module is initialized, false otherwise
     */
    public get IsInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Gets module name
     */
    public get Name(): string {
        return this._name;
    }

    public constructor() {
        super();

        
    }

    public async dispose(){
    }

    /**
     * Initializes module. Creates resources, starts servers, configures module.
     * 
     * @fires module#before.initialize before module initialization
     * @fires module#after.initialize after module is initialized
     */
    public async initialize(): Promise<any> {

        if(this._isInitialized){
            throw new InvalidOperationException(`module already initialized`);
        }

        await this.onInitialize();

        this._isInitialized = true;
    }

    protected async onInitialize(): Promise<any> {
        throw new NotImplementedException();
    }
}

