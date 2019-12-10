import { Configuration } from "@spinajs/configuration";
import { Autoinject} from "@spinajs/di";
import { Cli, CliCommandBase, CliOption } from './../../../src/system/cli';

@Cli("test:cli", "Test command")
@CliOption("-t, --table [value]", "Optional table name, if you want to recreate only one table")
@CliOption("-c, --connection <value>", "Database connection name to use")
export class TestCli extends CliCommandBase {
    @Autoinject()
    public conf: Configuration = null;

    // tslint:disable-next-line: no-empty
    public async execute(_cmd: any) {

    }
}