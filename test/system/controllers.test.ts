import 'mocha';

import * as chai from 'chai';
import * as _ from 'lodash';

import { Configuration } from '../../src/system/configuration';
import { Controllers } from '../../src/system/controllers';
import { DI } from '../../src/system/di';
import { HttpServer } from '../../src/system/http';
import { LogModule } from '../../src/system/log';
import { dir } from '../misc';
import { FakeLog } from '../mocks/logger.mock';

import chaiHttp = require('chai-http');

chai.use(chaiHttp);

function ctr() {
    return DI.resolve<Controllers>(Controllers);
}

function srv() {
    return DI.resolve<HttpServer>(HttpServer);
}

class ControllerConf extends Configuration {

    _conf = {
        system: {
            dirs: {
                controllers: [dir("./mocks/controllers")],
                responses: [dir("./../src/responses")],
            }
        },
        http: {
            port: 1111
        }
    }

    public async onInitialize() { }

    public get(path: string[], defaultValue?: any): any {
        return _.get(this._conf, path, defaultValue);
    }
}

describe("Controllers test", () => {

    beforeEach(() => {
        DI.register(ControllerConf).as(Configuration);
        DI.register(FakeLog).as(LogModule);
        DI.resolve(LogModule);
    });

    afterEach(async ()=>{
        const http = await srv();
        http.stop();
        DI.clear();
    });

    it("Load controllers from dirs", async () => {

        const c = await ctr();
        const controllers = await c.Controllers;

        chai.expect(controllers.length).to.eq(2);
    })

    it("Base path set", async () => {

        const http = await srv();
        const c = await ctr();
        const controllers = await c.Controllers;

        await http.start();

        const result = await chai.request("http://localhost:1111/Test2").get("/with/route/and/param/1");
        console.log(result);
    })

    it("Create routes", async () => {

    })

    it("Inject middlewares", async () => {

    })

    it("Pass parameters to action", async () => {

    })


});