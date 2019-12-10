import { Configuration } from '@spinajs/configuration';
import { Autoinject } from "@spinajs/di";
import { ArgumentException } from '@spinajs/exceptions';
import { ModuleBase } from './module';
import { ClassInfo, FromFiles } from './reflection';

import * as commander from 'commander';
import * as _ from 'lodash';

export const CLI_DESCRIPTOR_SYMBOL = Symbol.for('CLI_DESCRIPTOR');

/**
 * Cli argument description
 */
export interface ICliArgument {
  /**
   * Cli option eg.  -s, --string
   */
  Option: string;

  /**
   * Argument description used in help
   */
  Description: string;
}

/**
 * Cli command interface declaration.
 */
export interface ICliCommand {
  /**
   * Command name
   */
  name: string;

  /**
   * This function is executed by cli. Do command stuff here.
   */
  execute: (...args: any[]) => void;
}

export abstract class CliCommandBase implements ICliCommand {
  public get name(): string {
    const desc = (this.constructor as any)[CLI_DESCRIPTOR_SYMBOL] as CliDescriptor;
    return desc.name;
  }

  public abstract execute(...args: any[]): void;
}

/**
 * Cli option description. Its passed as command arguments
 */
export interface ICliOption {
  /**
   * Param definition.
   * @see commander params definition examples
   *
   * @example
   * ```
   *  -s, --string // for normal value eg. string
   *  -i, --integer <n> // for integers
   *  -f, --float <n> // for floats
   *  -r, --range <a>..<b> // for range
   *  -l, --list <items> // for list
   *  -o, --optional [value] // for optional value
   * ```
   */
  Params: string;

  /**
   * Description for option, used in option help.
   */
  Description: string;
}

/**
 * Internall cli command descriptor. Describes command options, name & help
 */
export class CliDescriptor {
  /**
   * Name of command eg. test:cli
   */
  public name: string = '';

  /**
   * Command general description, used when displaying help
   */
  public description: string = '';

  /**
   * Cli commands options
   * @see CliOption
   */
  public options: ICliOption[] = [];
}

function initializeCLICommand(target: any) {
  if (target[CLI_DESCRIPTOR_SYMBOL] === undefined) {
    target[CLI_DESCRIPTOR_SYMBOL] = new CliDescriptor();
  }
}

/**
 * decorator used to mark class as cli command.
 *
 * @example usage
 * ```javascript
 * @Cli("spine:dosmth","Something to do")
 * export class SmthToDoCommand implements CliCommand{
 *  //.....
 * }
 * ```
 * Then invoke command from cli like this: spine spine:dosmth -option1 -option2 .....
 *
 * @param name - name of command, prefered name is eg. spine:dosmthg
 * @param description - command help, displayed when using --help option
 *
 *
 */
export function Cli(name: string, description: string) {
  return (target: any) => {
    initializeCLICommand(target);

    const descriptor = target[CLI_DESCRIPTOR_SYMBOL] as CliDescriptor;

    descriptor.name = name;
    descriptor.description = description;
  };
}

/**
 * Decorator used to add command options ( arguments passed to `execute` command member function ).
 * Can be added multiple times to command.
 *
 * @param params - param name with options
 * @param description - description used in help
 * @see commander params definition examples
 *
 * @example params example
 * ```
 *  -s, --string // for normal value eg. string
 *  -i, --integer <n> // for integers
 *  -f, --float <n> // for floats
 *  -r, --range <a>..<b> // for range
 *  -l, --list <items> // for list
 *  -o, --optional [value] // for optional value
 * ```
 *
 * @example usage
 * ```javascript
 * @Cli("spine:dosmth","Something to do")
 * @CliOption("-o, --option1","Some option")
 * @CliOption("-o2, --option2 [value]","Some optional value")
 * export class SmthToDoCommand implements ICliCommand{
 *  //.....
 *
 *     execute(option1, option2){
 *          ....
 *     }
 * }
 * ```
 */
export function CliOption(params: string, description: string) {
  return (target: any) => {
    initializeCLICommand(target);

    const descriptor = target[CLI_DESCRIPTOR_SYMBOL] as CliDescriptor;

    descriptor.options.push({
      Description: description,
      Params: params,
    });
  };
}

export abstract class CliModule extends ModuleBase {
  /**
   * Avaible commands ready to run
   */
  public abstract commands: Promise<Array<ClassInfo<ICliCommand>>>;

  /**
   * Gets command by name
   *
   * @param name name of command
   */
  public abstract get(name: string): Promise<ICliCommand>;
}

/**
 * Cli module implementation. Loads all commands from defined paths in config & prepares them to use.
 */
export class FrameworkCliModule extends CliModule {


  /**
   * Avaible commands ready to run
   */
  @FromFiles('/**/*.{js,ts}', 'system.dirs.cli')
  public commands: Promise<Array<ClassInfo<ICliCommand>>>;

  /**
   * Global configuration. It takes `system.dirs.cli` variable with array of dirs to check
   */
  @Autoinject()
  private cfg: Configuration;

  /**task
   * process arguments list
   */
  private args: string[];

  /**
   * Constructs CLI module
   *
   * @param args command line args array (eg process.argv)
   */
  constructor(args?: string[]) {
    super();

    this.args = args;
  }

  /**
   * Gets command by name
   *
   * @param name name of command
   */
  public async get(name: string): Promise<ICliCommand> {

    if (_.isEmpty(name) || _.isNil(name)) {
      throw new ArgumentException(`parameter name is null or empty`);
    }

    const commands = await this.commands;
    let result = null;
    if (commands) {
      result = commands.find(c => {
        return c.instance.name === name;
      });
    }

    return result ? result.instance : null;
  }

  protected async onInitialize() {
    commander.version(`Spine version: ${this.cfg.get('system.version', '1.1')}`);

    const commands = await this.commands;
    if (commands) {
      commands.forEach(command => {
        const descriptor = command.type[CLI_DESCRIPTOR_SYMBOL] as CliDescriptor;
        const cmdInstance = commander.command(descriptor.name).description(descriptor.description);

        descriptor.options.forEach(o => {
          cmdInstance.option(o.Params, o.Description);
        });

        cmdInstance.action(command.instance.execute.bind(command.instance));
      })
    }



    if (!this.args || this.args.length < 3) {
      commander.help();
      return;
    }

    commander.parse(this.args);
  }
}
