import 'mocha';
import { expect } from 'chai';
import * as _ from 'lodash';

import { Configuration, FrameworkConfiguration} from '@spinajs/configuration';
import { DI } from '@spinajs/di';
import { CLI_DESCRIPTOR_SYMBOL, CliDescriptor, FrameworkCliModule } from '../../src/system/cli';
import { Logger, LogModule } from '../../src/system/log';
import { dir } from '../misc';
import { FakeLog } from '../mocks/logger.mock';

function cli(){
    return DI.resolve<FrameworkCliModule>(FrameworkCliModule,[["a","b","c","d"]]);
}

class CliConf extends FrameworkConfiguration {

    private _conf = {
        system: {
            dirs: {
                cli: [dir("./mocks/commands")]
            }
        }
    }
    public get(path: string[]): any{
        return _.get(this._conf, path);
    }
}


describe("Cli tests", () => {

    beforeEach(() => {
        DI.clear();
        DI.register(CliConf).as(Configuration);
        DI.register(FakeLog).as(Logger);
        DI.resolve(LogModule);
    });

    it("Load cli commands from dirs", async ()=>{
        const c = await cli();
        const commands = await c.commands;



        expect(commands.length).to.eq(1);
        expect(_.find(commands, cmd => cmd.instance.name === "test:cli")).to.not.null;

        const command = await c.get("test:cli");
        const descriptor = ((command as any).constructor[CLI_DESCRIPTOR_SYMBOL]) as CliDescriptor;

        expect(command.constructor.name).to.eq("TestCli");
        expect(descriptor.description).to.eq("Test command");
        expect(descriptor.options.length).to.eq(2);

        expect(descriptor.options[1].Params).to.eq("-t, --table [value]");
        expect(descriptor.options[0].Params).to.eq("-c, --connection <value>");
        expect(descriptor.options[1].Description).to.eq("Optional table name, if you want to recreate only one table");
        expect(descriptor.options[0].Description).to.eq("Database connection name to use");
    })
})