import { expect } from 'chai';
import 'mocha';
import { ModuleBase } from './../../src/system/module';

class TestModule extends ModuleBase {
    constructor() {
        super();

        this.Name = "Test module";
    }

    protected async onInitialize() {

    }
}

describe("Module tests", () => {
 
    it("Should set initialization flag", async () => {
        const mod = new TestModule();

        expect(mod.IsInitialized).to.eq(false);
        await mod.initialize();
        expect(mod.IsInitialized).to.eq(true);
    });

    it("Should set proper name", async () => {
        const mod = new TestModule();
        expect(mod.Name).to.eq("Test module");
    });

});