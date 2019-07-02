import { pugResponse, HTTP_STATUS_CODE } from '../system/http';
import { ResponseFunction } from '../system/controllers';


export function pug(file: string, model: any, status?: HTTP_STATUS_CODE): ResponseFunction {
   return pugResponse(file, model, status)
}