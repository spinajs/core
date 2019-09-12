import { Configuration } from '@spinajs/configuration';
import { DI } from '@spinajs/di';
import * as path from "path";
import { File } from "./../system/filesystem";

function templateExists(templateName: string): string {
    const config = DI.get<Configuration>(Configuration);

    const result = config.get<string[]>("system.dirs.prop").find(async (p: string) => {
        return File.existsSync(path.join(p, templateName));
    })

    if (result) {
        return path.join(result, templateName);
    }
}

function codeGenerator(plop: any) {
    const config = DI.get<Configuration>(Configuration);
    plop.setGenerator('command', {
        actions: [{
            path: path.join(config.get<string>(["system.appDir"]),"commands","{{kebabCase name}.ts"),
            templateFile: templateExists("cli-template.hbs"),
            type: "add"
        }],
        description: 'creates new application command',
        prompts: [{
            type: "input",
            name: "name",
            message: "please give command name"
        }],
       
    })
}

export = codeGenerator;