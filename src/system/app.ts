import { Autoinject, DI,  Configuration, Controllers, Logger, Log, HttpServer, Locales } from './index';
import * as commander from 'commander';

export class Application {
    @Logger({ module: "Application" })
    Log: Log;

    @Autoinject
    _cfg: Configuration;

    @Autoinject
    _controllers: Controllers;

    @Autoinject
    _http: HttpServer;

    @Autoinject
    _locales: Locales;

    constructor() {
        this._init();
    }

    protected async _init() {

        try {
            commander.option("-a, --app [value]", "Application to run")
                .parse(process.argv);
                
            await this._cfg.initialize();
            await this._controllers.initialize();
            await this._http.initialize();
            await this._locales.initialize();
            this._http.start();

            this.Log.info("Application initialized, ready to rock !")
        } catch (err) {
            this.Log.warn("Cannot start application, reason: ", err.toString());
            this.Log.warn("At: ", (<Error>err).stack);
        }
    }


    public static StartNew() {
        return DI.resolve(Application);
    }
}