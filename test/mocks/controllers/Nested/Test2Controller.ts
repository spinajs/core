import { BaseController, BasePath, Get, Post, Body, Policy, Controller, Middleware, Param } from '../../../../src/system/controllers';
import { Request } from "express";
import { NewInstance } from '../../../../src/system/di';
import { ok } from '../../../../src/responses';
import { BaseMiddleware } from '../../../../src/system/controllers/middlewares';
import { BasePolicy } from '../../../../src/system/controllers/policies';

export class SampleBodyParameter {
    public name: string;
    public index: number;
}

@NewInstance()
export class TestPolicy extends BasePolicy {
    public isEnabled(): boolean {
        return true;
    }

    public async execute(): Promise<boolean> {
        return true;
    }
}

export class TestMiddleware2 extends BaseMiddleware {
    public isEnabled(): boolean {
        return true;
    }

    public async onBeforeAction(): Promise<any> {
        return "before";
    }

    public async onAfterAction(): Promise<any> {
        return "after";

    }
}
 

@BasePath("Test2")
@Policy(TestPolicy)
export class Test2Controller extends BaseController {

    @Get()
    public async foo() {
        return ok();
    }

    @Get("with/route")
    public async withRouteDeclared() {
        return ok();
    }

    @Get("with/route/and/param/:id")
    public async withRouteAndParamsDecorator(@Param() id: number) {
        return ok({
            id
        });
    }

    @Post("with/route/and/param/from/post")
    public async withRouteAndPostParamDecorator(@Body() testData: SampleBodyParameter) {
        return ok({
            testData
        })
    }
}

