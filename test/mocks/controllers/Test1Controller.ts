import { BaseController, Get,  Post,  IMiddleware, Del, Put, Patch, Head, File, RouteDefinition } from '../../../src/system/controllers';
import {Request } from "express";
import { NewInstance } from '../../../src/system/di';

@NewInstance()
class TestMiddleware implements IMiddleware
{
    isEnabled(_action: RouteDefinition): boolean {
         return true;
    }    
    
    async onBeforeAction(_req: Request): Promise<any> {
    }
    async onAfterAction(_req: Request): Promise<any> {
    }
}
 

@Middleware(TestMiddleware)
export class Test1Controller extends BaseController {

    @Get()
    public async get(){

    }

    @Post()
    public async post(){

    }

    @Del()
    public async del(){

    }

    @Put()
    public async put(){

    }

    @Patch()
    public async patch(){

    }

    @Head()
    public async head(){

    }

    @File()
    public async file(){

    }
}
