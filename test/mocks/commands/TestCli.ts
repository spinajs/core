import { CliCommandBase, Cli, ICliOption } from './../../../src/system/cli';
import { Autoinject} from "./../../../src/system/di";
import { Configuration } from "./../../../src/system/configuration";

@Cli("test:cli", "Test command")
@CliOption("-t, --table [value]", "Optional table name, if you want to recreate only one table")
@CliOption("-c, --connection <value>", "Database connection name to use")
export class TestCli extends CliCommandBase {
    Name: string;

    @Autoinject
    Conf: Configuration = null;

    async execute(_cmd: any) {

    }
}