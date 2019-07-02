import 'mocha';

import { expect } from 'chai';
import * as _ from 'lodash';

import { Configuration, FrameworkConfiguration } from '../../src/system/configuration';
import { DI } from '../../src/system/di';
import { HttpServer } from '../../src/system/http';
import { Logger, LogModule } from '../../src/system/log';
import { dir } from '../misc';
import { FakeLog } from '../mocks/logger.mock';

function http(){
    return DI.resolve<HttpServer>(HttpServer);
}

class HttpConf extends FrameworkConfiguration {

    _conf = {
        system: {
            dirs: {
                cli: [dir("./mocks/controllers")]
            }
        }
    }
    public get(path: string[]): any{
        return _.get(this._conf, path);
    }
}

describe("Http tests", () => {

    beforeEach(() => {
        DI.clear();
        DI.register(HttpConf).as(Configuration);
        DI.register(FakeLog).as(Logger);
        DI.resolve(LogModule);
    });

    it("Load responses from files", async ()=>{
        
    })

    it("Load responses from app dir", async ()=>{

    })

    it("Provide static files", async ()=>{

    })

    it("Load default middlewares", async ()=>{

    })
     

});