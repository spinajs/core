/**
 * Base class of all core modules
 */
export abstract class ModuleBase {

  /**
   * Name of module
   */
  public get Name(): string {
    return "FrameworkModuke";
  }

  /**
   * Disposes module (free resources, stops servers etc. )
   */
  // tslint:disable-next-line: no-empty
  public dispose(): void {

  }

  /**
   * Initializes module, load files, creates servers etc.
   * 
   */
  // tslint:disable-next-line: no-empty
  public async initialize(): Promise<void> {

  }
}
