import { EventEmitter } from 'events';
import * as _ from 'lodash';

import { ArgumentException } from './exceptions';
import { FrameworkModule } from './interfaces';

/**
 * Base implementation of framework event emitter. Allows to restrict event types to be fired
 */
export abstract class FrameworkEventEmitter<T> {

    _eventEmitter = new EventEmitter();

    /**
     * Emits global event
     * 
     * @param  name - name of event
     * @param  args - event data
     * @throws {InvalidArgumentException} if event name is null or empty
     * @returns Returns true if the event had listeners, false otherwise.
     */
    public async emit<Z = T>(event: Extract<keyof Z, string | symbol>, ...args: any[]): Promise<boolean> {

        if (_.isNil(event) || _.isEmpty(event)) {
            throw new ArgumentException("parameter `event` is empty");
        }

        if (this._eventEmitter.listenerCount(event) === 0) {
            return false;
        }

        const results = this._eventEmitter.listeners(event).map(func => {
            return func(...args);
        })

        await Promise.all(results);

        return true;
    }

    /**
     * Hooks to global event and calls callback after event occured
     * @param name Listen
     * @param callback 
     */
    public on<Z = T>(event: Extract<keyof Z, string | symbol>, listener: (...args: any[]) => void): FrameworkEventEmitter<T> {
        const self = this;

        this._eventEmitter.on(event, (args) => {
            listener.call(self, args);
        });

        return this;
    }

    /**
     * Removes listener from event preventing it from firing
     * 
     * @param event event to remove
     * @param listener function to be removed
     */
    public remove<Z = T>(event: Extract<keyof Z, string | symbol>, listener: (...args: any[]) => void): FrameworkEventEmitter<T> {

        this._eventEmitter.removeListener(event, listener);
        return this;
    }

    /**
     * Register a listener that is called at most once for particular event
     * 
     * @param event event to be registerd
     * @param listener listener function to be called at most once
     */
    public once<Z = T>(event: Extract<keyof Z, string | symbol>, listener: (...args: any[]) => void) {
        const self = this;

        this._eventEmitter.once(event, (args) => {
            listener.call(self, args);
        });

        return this;
    }
}

export interface GlobalEvents
{
    /**
     * Fired when module is created, constructor called;
     */
    moduleCreated: (module: FrameworkModule) => void;

    /**
     * Fired when module is destroyed and all resources are cleaned up
     */
    moduleDestroyed: (module: FrameworkModule) => void;

    /**
     * Fired before module is initialized.
     */
    beforeModuleInitialize: (module: FrameworkModule) => void;

    /**
     * Fired after module is initialized
     */
    afterModuleInitialize: (module: FrameworkModule) => void;
}

class GlobalEventEmitter extends FrameworkEventEmitter<GlobalEvents>
{

}

export const GlobalEvents = new GlobalEventEmitter();
