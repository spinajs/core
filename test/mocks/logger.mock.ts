import bunyan = require("bunyan");
import { ConsoleLogStream, LogModule } from "../../src/system/log";


export class FakeLog extends LogModule {
    private log = bunyan.createLogger({
        name: 'spine-framework',
        serializers: bunyan.stdSerializers,
        /**
         * streams to log to. See more on bunyan docs
         */
        streams: [
            {
                level: process.env.NODE_ENV === "development" ? "trace" : "info",

                /**
                 * We use default console log stream with colors
                 */
                stream: new ConsoleLogStream(),
                type: "raw",


            }
        ]
    });

    public getLogger() {
        return this._log;
    }
}