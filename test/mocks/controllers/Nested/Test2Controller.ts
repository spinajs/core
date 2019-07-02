import { BaseController, BasePath, Get, Post, Body, Policy, Middleware, RouteDefinition, PolicyBase, Params } from '../../../../src/system/controllers';
import { Request } from "express";
import { NewInstance } from '../../../../src/system/di';
import { ok } from '../../../../src/responses';

export class SampleBodyParameter {
    name: string;
    index: number;
}

@NewInstance()
export class TestPolicy extends PolicyBase {
    IsEnabled(_action: any): boolean {
        return true;
    }

    async Execute(_req: Request): Promise<boolean> {
        return true;
    }
}

export class TestMiddleware2 implements Middleware {
    IsEnabled(_action: RouteDefinition): boolean {
        return true;
    }

    async OnBeforeAction(_req: Request): Promise<any> {
        return "before";
    }

    async OnAfterAction(_req: Request): Promise<any> {
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
    public async withRouteAndParamsDecorator(@Params("id") _id: number) {
        return ok();
    }

    @Post("with/route/and/param/from/post")
    public async withRouteAndPostParamDecorator(@Body() _testData: SampleBodyParameter) {
    }

    @Get()
    @Middleware(TestMiddleware2)
    public async customMiddlewareRoute() {

    }
}

