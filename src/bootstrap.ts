import {
  HttpServer,
  Controllers,
  DI,
  FrameworkLogModule,
  LogModule,
  FrameworkConfiguration,
  Configuration,
} from './system';

/**
 * Starting point for all applications. To create new app just subclass this.
 */
export abstract class Application {
  protected Controllers: Controllers;

  protected HttpServer: HttpServer;

  public async run(): Promise<void> {
    // register framework default modules,
    DI.register(FrameworkConfiguration).as(Configuration);
    DI.register(FrameworkLogModule).as(LogModule);

    // give chance to do something for others
    await this.bootstrap();

    // give chance for loading loggin submodule,
    // other modules expecs log to exists already
    await DI.resolve<LogModule>(LogModule);

    this.Controllers = await DI.resolve<Controllers>(Controllers);
    this.HttpServer = await DI.resolve<HttpServer>(HttpServer);

    // start server
    await this.HttpServer.start();
  }

  /**
   * Configure your app here. Register own classes in DI container etc.
   */
  protected abstract async bootstrap(): Promise<void>;
}
