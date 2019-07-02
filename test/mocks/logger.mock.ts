import { LogModule, ConsoleLogStream } from "../../src/system/log";
import bunyan = require("bunyan");
 

export class FakeLog extends LogModule {
    _log = bunyan.createLogger({
        name: 'spine-framework',
        serializers: bunyan.stdSerializers,
        /**
         * streams to log to. See more on bunyan docs
         */
        streams: [
            {
                type: "raw",
    
                /**
                 * We use default console log stream with colors
                 */
                stream: new ConsoleLogStream(),
                level: process.env.NODE_ENV == "development" ? "trace" : "info"
            }
        ]
    });

       /**
     * Initializes bunyan logger & hooks for process:uncaughtException to log fatal application events
     */
    public async initialize(): Promise<any> {
        
    }

    getLogger() {
        return this._log;
    }
}