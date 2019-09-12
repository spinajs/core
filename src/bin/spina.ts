import { Configuration, FrameworkConfiguration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";


import { FrameworkCliModule, FrameworkLogModule, LogModule } from './../system';

async function bootstrap() {
  DI.register(FrameworkConfiguration).as(Configuration);
  DI.register(FrameworkLogModule).as(LogModule);

  await DI.resolve(Configuration);
  await DI.resolve(LogModule);
  await DI.resolve(FrameworkCliModule, [process.argv]);
}

// tslint:disable-next-line: no-empty
bootstrap().then(() => { });
