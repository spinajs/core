import { ModuleBase } from './module';
import { Configuration } from './configuration';
import * as bunyan from 'bunyan';
import { default as chalk } from 'chalk';
import { Writable } from 'stream';
import { Autoinject, DI } from './di';

/**
 * -----------------------------------------------------------------------------------
 * IMPORTANT: log subsystem is havily based on bunyan. It uses bunyan by default, all options & functions are based on
 * bunyan lib. However you can implement custom log module and inject it to framework simply by implementing
 * `LogModule` that returns custom implementation of `Log` interface. Then override default DI registered class at app bootstrap.
 *
 * If you simply want to add more places where log goes eg. database, simply add custom log stream to configuration file.
 */

/**
 * Creates child logger
 *
 * @param options  - additional logger options
 */
export function Logger(options?: any) {
  return function(target?: any, key?: string): any {
    let logger: Log = undefined;

    // property getter
    var getter = function() {
      if (!logger) {
        logger = DI.get<LogModule>('LogModule').getLogger(options);
      }

      return logger;
    };

    // Create new property with getter and setter
    Object.defineProperty(target, key, {
      get: getter,
      enumerable: false,
      configurable: false,
    });
  };
}

/**
 * Log stream that writes messages in console with proper colours for message types.
 * * TRACE - gray
 * * DEBUG - white
 * * INFO - cyan
 * * WARN - yellow
 * * ERROR - red
 * * FATAL - red on white background
 */
export class ConsoleLogStream extends Writable {
  TRACE = 10;
  DEBUG = 20;
  INFO = 30;
  WARN = 40;
  ERROR = 50;
  FATAL = 60;

  write(chunk: any, _encoding: string | Function, _cb?: Function): boolean {
    const type = this._getNameFromType(chunk.level);
    const message = `${chunk.time.toISOString()} ${type} ${chunk.name}: ${chunk.msg} (module=${chunk.module})`;
    let c = null;

    switch (chunk.level) {
      case this.TRACE:
        c = chalk.gray(message);
        break;
      case this.DEBUG:
        c = chalk.white(message);
        break;
      case this.INFO:
        c = chalk.cyan(message);
        break;
      case this.WARN:
        c = chalk.yellow(message);
        break;
      case this.ERROR:
        c = chalk.red(message);
        break;
      case this.FATAL:
        c = chalk.bgRed.white(message);
        break;
    }

    console.log(c);

    return true;
  }

  _getNameFromType(type: number) {
    switch (type) {
      case this.TRACE:
        return 'TRACE';
      case this.DEBUG:
        return 'DEBUG';
      case this.INFO:
        return 'INFO';
      case this.WARN:
        return 'WARN';
      case this.ERROR:
        return 'ERROR';
      case this.FATAL:
        return 'FATAL';
    }
  }
}

/**
 * Some declarations taken from bunyan
 * Used to add some abstraction and allow implement own logging system
 */

type LogLevelString = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogLevel = LogLevelString | number;

type Serializer = (input: any) => any;

interface Serializers {
  [key: string]: Serializer;
}

interface Stream {
  type?: string;
  level?: LogLevel;
  path?: string;
  stream?: NodeJS.WritableStream | Stream;
  closeOnExit?: boolean;
  period?: string;
  count?: number;
  name?: string;
  reemitErrorEvents?: boolean;
}

interface LoggerOptions {
  name: string;
  streams?: Stream[];
  level?: LogLevel;
  stream?: NodeJS.WritableStream;
  serializers?: Serializers;
  src?: boolean;
  [custom: string]: any;
}

/**
 * Default logger options
 * used as fallback if no config is provided
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  name: 'spine-framework',
  serializers: bunyan.stdSerializers,
  /**
   * streams to log to. See more on bunyan docs
   */
  streams: [
    {
      type: 'raw',

      /**
       * We use default console log stream with colors
       */
      stream: new ConsoleLogStream(),
      level: process.env.NODE_ENV == 'development' ? 'trace' : 'info',
    },
  ],
};

/**
 * Default log implementation interface. Taken from bunyan. Feel free to implement own.
 */
export interface Log {
  /**
   * Returns a boolean: is the `trace` level enabled?
   *
   * This is equivalent to `log.isTraceEnabled()` or `log.isEnabledFor(TRACE)` in log4j.
   */
  trace(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  trace(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  trace(obj: Object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  trace(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `debug` level enabled?
   *
   * This is equivalent to `log.isDebugEnabled()` or `log.isEnabledFor(DEBUG)` in log4j.
   */
  debug(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  debug(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  debug(obj: Object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  debug(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `info` level enabled?
   *
   * This is equivalent to `log.isInfoEnabled()` or `log.isEnabledFor(INFO)` in log4j.
   */
  info(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  info(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  info(obj: Object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  info(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `warn` level enabled?
   *
   * This is equivalent to `log.isWarnEnabled()` or `log.isEnabledFor(WARN)` in log4j.
   */
  warn(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  warn(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  warn(obj: Object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  warn(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `error` level enabled?
   *
   * This is equivalent to `log.isErrorEnabled()` or `log.isEnabledFor(ERROR)` in log4j.
   */
  error(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  error(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  error(obj: Object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  error(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `fatal` level enabled?
   *
   * This is equivalent to `log.isFatalEnabled()` or `log.isEnabledFor(FATAL)` in log4j.
   */
  fatal(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  fatal(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  fatal(obj: Object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  fatal(format: any, ...params: any[]): void;

  child(options: Object, simple?: boolean): Log;
}

/**
 * Abstract class to implement for framework log module.
 */
export abstract class LogModule extends ModuleBase {
  public abstract getLogger(options?: any[]): Log;
}

/**
 * Default Log implementation that uses bunyan internally. Feel free to implement own
 */
export class FrameworkLogModule extends LogModule {
  /**
   * root logger
   * @access protected
   */
  protected log: Log;

  /**
   * Name of module
   * @access protected
   */
  protected name: string = 'Log';

  /**
   * Injected Configuration object
   */
  @Autoinject
  public cfg: Configuration = null;

  /**
   * Initializes bunyan logger & hooks for process:uncaughtException to log fatal application events
   */
  public async initialize(): Promise<any> {
    // get config
    this.log = bunyan.createLogger(this.cfg.get<bunyan.LoggerOptions>(['log'], DEFAULT_OPTIONS));

    process.on('uncaughtException', (err: Error) => {
      this.log.fatal(err);
    });
  }

  /**
   * Creates child logger
   * @param options - additional logger options eg. fields.
   */
  getLogger(options?: any[]): Log {
    return this.log.child(options);
  }
}
