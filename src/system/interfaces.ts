export interface Disposable {
  /**
   * Releases all resources
   */
  dispose(): void;
}

/**
 * Framework module interface. If you want to add application wise module implement this interface.
 */
export interface FrameworkModule extends Disposable {
  /**
   * Gets module initialization status true - if module is iniitalized, false otherwise
   */
  IsInitialized: boolean;

  /**
   * Gets module name
   */
  Name: string;

  /**
   * Initializes module. Creates resources, starts servers, configures module.
   * @fires beforeInitialize before module initialization
   * @fires afterInitialize after module is initialized
   */
  initialize(): Promise<any>;
}
