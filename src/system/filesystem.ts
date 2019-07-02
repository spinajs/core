import * as fs from "fs";
import * as glob from "glob";

/**
 * Helper function to deal with directories
 */
export namespace Directory {
    
    /**
     * Checks if directory exists at specified path
     * 
     * @param path path to check
     * @returns { boolean } true if exists false otherwise
     */
    export function exists(path: string) : Promise<boolean> {
        return File.exists(path);
    }

    /**
     * 
     * @param pattern 
     */
    export function list(pattern: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            glob(pattern, (err: Error, matches: string[]) => {
                (err) ? reject(err) : resolve(matches);
            });
        });
    }
}

export namespace File {
    export function exists(path: string) : Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {

                if (err) {
                    reject(false);
                    return;
                }

                resolve(true);
            });
        });
    }

    export function read(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(path, {
                encoding: 'utf8',
                flag: 'r'
            }, function (error, data: string) {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }
}