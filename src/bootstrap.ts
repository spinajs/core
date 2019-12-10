import { Configuration, FrameworkConfiguration } from '@spinajs/configuration';
import { DI } from "@spinajs/di";
import { Controllers, FrameworkLogModule, HttpServer, LogModule } from './system';

/**
 * Starting point for all applications. To create new app just subclass this.
 */
export abstract class Application {
  protected controllers: Controllers;

  protected httpServer: HttpServer;

  public async run(): Promise<void> {
    // register framework default modules,
    DI.register(FrameworkConfiguration).as(Configuration);
    DI.register(FrameworkLogModule).as(LogModule);

    // give chance to do something for others
    await this.bootstrap();

    // give chance for loading loggin submodule,
    // other modules expecs log to exists already
    await DI.resolve<LogModule>(LogModule);

    this.controllers = await DI.resolve<Controllers>(Controllers);
    this.httpServer = await DI.resolve<HttpServer>(HttpServer);

    // start server
    await this.httpServer.start();
  }

  /**
   * Configure your app here. Register own classes in DI container etc.
   */
  protected abstract async bootstrap(): Promise<void>;
}
