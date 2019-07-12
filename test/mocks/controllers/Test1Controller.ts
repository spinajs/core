import { BaseController, Get,  Post, Del, Put, Patch, Head, File, Middleware } from '../../../src/system/controllers';
import {Request } from "express";
import { NewInstance } from '../../../src/system/di';
import { BaseMiddleware } from '../../../src/system/controllers/middlewares';

@NewInstance()
class TestMiddleware extends BaseMiddleware
{
    public isEnabled(): boolean {
         return true;
    }    
    
    public async onBeforeAction(_req: Request): Promise<any> {
    }
    public async onAfterAction(_req: Request): Promise<any> {
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
