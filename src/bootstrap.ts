import { HttpServer } from './system/http';
import { Autoinject, Controllers } from "./system";

/**
 * Starting point for all applications. To create new app just subclass this.
 */
export abstract class Application {
    
    @Autoinject
    protected Controllers: Controllers;

    @Autoinject
    protected HttpServer : HttpServer;

    public async run(): Promise<void> {

        // give chance to do something for others
        await this.bootstrap();

        // start server
        await this.HttpServer.start();
    }


    protected async abstract bootstrap(): Promise<void>;
}