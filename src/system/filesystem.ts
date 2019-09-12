import * as fs from 'fs';
import * as glob from 'glob';

const fsPromises = fs.promises;

/**
 * Helper function to deal with directories
 */
// tslint:disable-next-line: no-namespace
export namespace Directory {
  /**
   * Checks if directory exists at specified path
   *
   * @param path path to check
   * @returns { boolean } true if exists false otherwise
   */
  export async function exists(path: string): Promise<boolean> {
    return await File.exists(path);
  }

  /**
   *
   * @param pattern
   */
  export function list(pattern: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      glob(pattern, (err: Error, matches: string[]) => {
        err ? reject(err) : resolve(matches);
      });
    });
  }
}

// tslint:disable-next-line: no-namespace
export namespace File {
  export async function exists(path: string): Promise<boolean> {
    try {
      await fsPromises.access(path, fs.constants.F_OK);
      return true;
    }
    catch{
      return false;
    }
  }

  export function existsSync(path: string) {
    try {
      fs.accessSync(path, fs.constants.F_OK);
      return true;
    } catch{
      return false;
    }
  }

  export function read(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(
        path,
        {
          encoding: 'utf8',
          flag: 'r',
        },
        function (error, data: string) {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        },
      );
    });
  }
}
