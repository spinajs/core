import { FrameworkCliModule, DI, Configuration, FrameworkConfiguration, FrameworkLogModule, LogModule } from "./../system";

async function bootstrap() {

    DI.register(FrameworkConfiguration).as(Configuration);
    DI.register(FrameworkLogModule).as(LogModule);

    await DI.resolve(Configuration);
    await DI.resolve(LogModule);
    await DI.resolve(FrameworkCliModule, [process.argv]);
}

bootstrap().then(() => { });