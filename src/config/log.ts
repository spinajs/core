import { ConsoleLogStream } from './../system/index';
import * as bunyan from 'bunyan';

/**
 * Logger default configuration
 */
module.exports.log = {
  name: 'spine-framework2',

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
      level: process.env.NODE_ENV === 'development' ? 'trace' : 'info',
    },
  ],
};
