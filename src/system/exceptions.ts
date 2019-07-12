/**
 * Base class of all exceptions in framework
 */
export class Exception extends Error {
  /**
   * Constructs new exception with message
   * @param message - error message
   */
  constructor(message?: string) {
    super(message);
  }
}

/**
 * Exception thrown when argument passed to function is invalid eg. out of range
 */
export class ArgumentException extends Exception {}

/**
 * The exception that is thrown when a method call is invalid for the object's current state.
 */
export class InvalidOperationException extends Exception {}

/**
 * Exception is thrown when authentication fails eg. user credentials are invalid
 */
export class AuthenticationException extends Exception {}

/**
 * Exception is thrown when request data are invalid
 */
export class BadRequestException extends Exception {}

/**
 * Exception indicating that an access to resource by a client has been forbidden by the server
 * HTTP 403 - Forbidden
 */
export class ForbiddenException extends Exception {}

/**
 * Exception thrown when there was error with IO operations ie. not accessible file
 */
export class IOException extends Exception {}

/**
 * The exception that is thrown when resource is not found eg. model in database or missing file
 */
export class NotFoundException extends Exception {}

/**
 * The exception that is thrown when method is not implemented
 */
export class NotImplementedException extends Exception {}

/**
 * The exception that is thrown when strange things happends in server eg. generic server error
 */
export class ServerErrorException extends Exception {}

/**
 * The exception that is thrown when JSON entity is checked against schema and is invalid
 */
export class ValidationException extends Exception {
  public Errors: any;

  constructor(message: string, validationErrors: any) {
    super(message);

    this.Errors = validationErrors;
  }
}

/**
 * The exception that is thrown when JSON entity is checked against schema and is invalid
 */
export class NotAcceptedException extends Exception {}

/**
 * The exception that is thrown if app not supports requestes `Accept` header eg. if client wants
 * html response but server can send only json.
 */
export class NotAcceptableException extends Exception {}
 