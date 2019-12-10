import { Cli, CliOption, ICliCommand } from "../system";

@Cli("spine:new-cli","Creates new cli command in project folder")
@CliOption("-n, --name", "Command name")
export class NewCommand implements ICliCommand
{
    public name': string = "NewCommand";
    
    public execute(...args: any[]) : void
    {
        console.log("new command");
    }
}