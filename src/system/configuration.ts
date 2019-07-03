import * as commander from 'commander';
import * as fs from 'fs';
import * as glob from 'glob';
import * as _ from 'lodash';
import { join, normalize, resolve, sep } from 'path';

import { ModuleBase } from './module';

/**
 * Hack to inform ts that jasmine var is declared to skip syntax error
 */
declare var jasmine: any;

/**
 * App version struct
 */
interface FrameworkVersion{
    minor : number;
    major : number;
}

function log(message: string) {
    (typeof jasmine === "undefined") ?
        console.log("[ CONFIGURATION ] " + message)
        : null;
}

function merge(to: any, from: any): void {
    _.mergeWith(to, from, (src, dest) => {
        if (_.isArray(src) && _.isArray(dest)) {
            var tmp = src.concat(dest);
            return _.uniqWith(tmp, _.isEqual);
        } else if (!src) {
            return dest;
        }
    });

    return to;
}

// clean require cache config
// http://stackoverflow.com/questions/9210542/node-js-require-cache-possible-to-invalidate
function uncache(file: string) {
    delete require.cache[file];
    return file;
}

export abstract class Configuration extends ModuleBase {
    /**
     * Get config value for given property. Returns any if value is present, default value if provided or null when empty
     * 
     * @param path - path to property eg. ["system","dirs"] or "system" or "system.dirs"
     */
    public abstract get<T>(_path: string[] | string, _defaultValue?: T): T;
}

export class FrameworkConfiguration  extends Configuration {

    /**
     * Default dirs to check for  configuration files
     */
    protected CONFIG_DIRS: string[] = [
        // framework path
        normalize(join(resolve(__dirname), "/../config")),

        // project paths
        normalize(join(resolve(__dirname).split(sep + "node_modules")[0], "/dist/config")),
        normalize(join(resolve(__dirname).split(sep + "node_modules")[0], "/build/config")),
        normalize(join(resolve(__dirname).split(sep + "node_modules")[0], "/config"))
    ];

    /**
     * Loaded & merged configuration
     */
    protected _config: any = {};

    /**
     * Configuration base dir, where to look for app config
     */
    protected _baseDir: string = "./";

    /**
     * Current running app name
     */
    protected _runApp: string = undefined;

    /**
     * 
     * @param app application name, pass it when you run in application mode
     * @param baseDir configuration base dir, where to look for application configs
     */
    constructor(app?: string, appBaseDir?: string) {
        super();

        if(!app){
            commander.option("-a, --app <appname>", "Application name to run");
            commander.option("-p, --apppath <apppath>", "Custom app path");
            commander.parse(process.argv);
        }

        this._runApp = app || commander.app;
        this._baseDir = (commander.apppath) ? commander.apppath : (appBaseDir) ? appBaseDir : join(__dirname, "../apps/");
    }

    protected dir(toJoin: string) {
        return normalize(join(resolve(this._baseDir), toJoin));
    }

    /**
     * Get config value for given property. Returns Maybe<any> if value is present or Maybe<null> when empty
     * 
     * @param path - path to property eg. ["system","dirs"]
     * @param defaultValue - optional, if value at specified path not exists returns default value
     */
    public get<T>(path: string[] | string, defaultValue?: T): T {
        return _.get(this._config, path, defaultValue);
    }

    protected async onInitialize() {

        this._configureApp();

        this.CONFIG_DIRS.filter(_filterDirs)
            // get all config files
            .map((d) => glob.sync(d + "/**/*.js"))
            // flatten files
            .reduce((prev, current)=>{
                return prev.concat(_.flattenDeep(current))
            },  [])
            // normalize & resolve paths to be sure
            .map((f: string) => normalize(resolve(f)))
            // info about files about to load
            .map((f) => { log(`Found file at: ${f}`); return f })
            // delete require cache
            .map(uncache)
            // load modules
            .map(require)
            // load & merge configs
            .map(_.curry(merge)(this._config));


        this._version();
        this._appDirs();
        this._configure();

        function _filterDirs(dir: string) {
            if (fs.existsSync(dir)) {
                log(`Found config dir at ${dir}`);
                return true;
            }
            return false;
        }
    }

    /**
     * adds app dirs to system.dirs config
     */
    protected _appDirs() {

        if (_.isEmpty(this._runApp)) {
            return;
        }

        for (let prop in this.get(["system", "dirs"], [])) {
            this.get<string[]>(["system", "dirs", prop]).push(this.dir(`/${this._runApp}/${prop}`));
        }
    }

    /**
     * runs configuration func on files
     * eg. when you want to configure stuff at beginning eq. external libs
     */
    protected _configure() {
        for (let prop in this._config) {
            const subconfig = this._config[prop];

            if (_.isFunction(subconfig.configure)) {
                subconfig.configure.call(subconfig);
            }
        }
    }

    /**
     * Just prints framework version
     */
    protected _version() {
        const version = this.get<FrameworkVersion>("system.version", undefined);
       
        if (version) {
            log(`FRAMEWORK VERSION: ${version.major}.${version.minor}`);
        } else {
            log("FRAMEWORK VERSION UNKNOWN");
        }
    }

    /**
     * Gets app name passed to CLI & adds proper config dirs to merge
     */
    protected _configureApp() {
        if (_.isString(this._runApp)) {
            log(`Application to run: ${this._runApp}`);
            this.CONFIG_DIRS.push(this.dir(`/${this._runApp}/config`));
        }
    }
}