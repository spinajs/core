import * as commander from 'commander';
import * as _ from 'lodash';

import { Configuration } from './configuration';
import { Autoinject } from './di';
import { ArgumentException } from './exceptions';
import { ModuleBase } from './module';
import { ClassInfo, FromFiles } from './reflection';
import { FrameworkModule } from './interfaces';

export const CLI_DESCRIPTOR_SYMBOL = Symbol.for('CLI_DESCRIPTOR');

/**
 * Cli argument description
 */
export interface CliArgument {
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
export interface CliCommand {
  /**
   * Command name
   */
  Name: string;

  /**
   * This function is executed by cli. Do command stuff here.
   */
  execute: (...args: any[]) => void;
}

export abstract class CliCommandBase implements CliCommand {
  public get Name(): string {
    const desc = <CliDescriptor>(<any>this.constructor)[CLI_DESCRIPTOR_SYMBOL];

    return desc.Name;
  }

  public abstract execute(...args: any[]): void;
}

/**
 * Cli option description. Its passed as command arguments
 */
export interface CliOption {
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
  Name: string = '';

  /**
   * Command general description, used when displaying help
   */
  Description: string = '';

  /**
   * Cli commands options
   * @see CliOption
   */
  Options: CliOption[] = [];
}

function _initializeCLICommand(target: any) {
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
    _initializeCLICommand(target);

    const _descriptor = <CliDescriptor>target[CLI_DESCRIPTOR_SYMBOL];

    _descriptor.Name = name;
    _descriptor.Description = description;
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
    _initializeCLICommand(target);

    const _descriptor = <CliDescriptor>target[CLI_DESCRIPTOR_SYMBOL];

    _descriptor.Options.push({
      Params: params,
      Description: description,
    });
  };
}

export interface CliModule extends FrameworkModule {
  /**
   * Avaible commands ready to run
   */
  Commands: Promise<ClassInfo<CliCommand>[]>;

  /**
   * Gets command by name
   *
   * @param name name of command
   */
  get(name: string): Promise<CliCommand>;
}

/**
 * Cli module implementation. Loads all commands from defined paths in config & prepares them to use.
 */
export class FrameworkCliModule extends ModuleBase implements CliModule {
  /**
   * Global configuration. It takes `system.dirs.cli` variable with array of dirs to check
   */
  @Autoinject
  private Cfg: Configuration;

  /**task
   * process arguments list
   */
  private Args: string[];

  /**
   * Avaible commands ready to run
   */
  @FromFiles('/**/*Cli.{js,ts}', 'system.dirs.cli')
  public Commands: Promise<ClassInfo<CliCommand>[]>;

  /**
   * Constructs CLI module
   *
   * @param args command line args array (eg process.argv)
   */
  constructor(args?: string[]) {
    super();

    this.Args = args;
  }

  protected async onInitialize() {
    commander.version(`Spine version: ${this.Cfg.get('system.version', '1.1')}`);

    for (const command of await this.Commands) {
      const _descriptor = <CliDescriptor>(<any>command.Type)[CLI_DESCRIPTOR_SYMBOL];

      const _c = commander.command(_descriptor.Name).description(_descriptor.Description);
      _descriptor.Options.forEach(o => {
        _c.option(o.Params, o.Description);
      });

      _c.action((...args) => {
        this.Commands.then(cmds => {
          const cmd = _.find(cmds, c => c.Instance.Name === process.argv[2]);

          if (!cmd) {
            throw new ArgumentException(`command ${process.argv[2]} not found`);
          }

          cmd.Instance.execute(...args);
        });
      });
    }

    if (this.Args == null || this.Args.length < 3) {
      commander.help();
      return;
    }

    commander.parse(this.Args);
  }

  /**
   * Gets command by name
   *
   * @param name name of command
   */
  async get(name: string): Promise<CliCommand> {
    if (_.isEmpty(name) || _.isNil(name)) {
      throw new ArgumentException(`parameter name is null or empty`);
    }

    for (const c of await this.Commands) {
      if (c.Instance.Name === name) {
        return c.Instance;
      }
    }

    return null;
  }
}
