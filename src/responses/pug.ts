import { pugResponse, HTTP_STATUS_CODE } from '../system/http';

export function pug(file: string, model: any, status?: HTTP_STATUS_CODE) {
   return pugResponse(file, model, status)
}