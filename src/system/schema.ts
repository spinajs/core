import { ModuleBase } from './module';
import { Logger, Log } from './log';
import * as ajv from 'ajv';

export class Schema extends ModuleBase {
  @Logger({ module: 'schema' })
  protected Log: Log;

  protected validator: ajv.Ajv;

  protected getValidationErrors(paramName: string) {
    var errors = [];
    for (var err of this.validator.errors) {
      var type = 'UNKNOWN';
      switch (err.keyword) {
        case 'enum':
          type = 'INVALID_ENUM';
          break;
        case 'type':
          type = 'INVALID_TYPE';
          break;
        case 'required':
          type = 'VALUE_REQUIRED';
          break;
      }

      errors.push({
        type: type,
        paramName: paramName,
        err: err,
      });
    }

    return errors;
  }

  protected async onInitialize() {
    this.validator = new ajv();
  }

  public validate(paramName: string, schema: any, object: any) {
    if (!this.validator.validate(schema, object)) {
      return this.getValidationErrors(paramName);
    }

    return false;
  }
}
