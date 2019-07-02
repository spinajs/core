import * as fs from 'fs';
import * as glob from 'glob';
import * as _ from 'lodash';
import * as path from 'path';

import { ArgumentException, IOException } from './exceptions';
import { Configuration } from './configuration';
import { DI } from "./di";


/**
 * Class info structure
 */
export class ClassInfo<T> {
    /**
     * Full file path of loaded class
     */
    public File: string;
    /**
     * Class name
     */
    public Name: string;
    /**
     * Javascript class object
     */
    public Type: any;

    /**
     * Resolved instance
     */
    public Instance: T;
}



/**
 * Returns resolved instances of classes from specified files.
 * 
 * @param filter - files to look at, uses glob pattersn to search
 * @param configPath - dir paths taken from app config eg. "system.dirs.controllers". Path MUST be avaible in configuration
 */
export function FromFiles(filter: string, configPath: string, resolve: boolean = true) {
    return (target: any, propertyKey: string | symbol) => {

        if (!filter || _.isEmpty(filter)) {
            throw new ArgumentException(`filter parameter is null or empty`);
        }

        if (!configPath || _.isEmpty(configPath)) {
            throw new ArgumentException(`configPath parameter is null or empty`);
        }

        let instances: ClassInfo<any>[] = null;

        const getter = async () => {

            if (!instances) {
                instances = await _loadInstances();
            }

            return instances;
        }

        Object.defineProperty(target, propertyKey, {
            get: getter,
            enumerable: true,
        });

        async function _loadInstances(): Promise<ClassInfo<any>[]> {
            const config = await DI.resolve<Configuration>(Configuration);
            const directories = config.get<string[]>(configPath);

            if (!directories || directories.length ) {
                return;
            }
            

            return Promise.all(directories.map(d => path.normalize(d))
                .filter(d => {
                    if (!fs.existsSync(d)) {
                       return false;
                    }

                    return true;
                })
                .flatMap(d => glob.sync(path.join(d, filter)))
                .map(async (f) => {
                    const name = path.parse(f).name;
                    const type = require(f)[name];

                    if (!type) {
                        throw new IOException(`cannot find class ${name} in file ${f}`);
                    }

                    let instance = type;
                    if (resolve) {
                        instance = await DI.resolve(type);
                    }

                    return {
                        File: f,
                        Type: type,
                        Name: name,
                        Instance: instance
                    }
                }));
        }
    }
}