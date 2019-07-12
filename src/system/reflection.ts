import * as fs from 'fs';
import * as glob from 'glob';
import * as _ from 'lodash';
import * as path from 'path';
import * as ts from "typescript";

import { DI } from './di';
import { ArgumentException, IOException } from './exceptions';
import { Configuration } from "./configuration";

/**
 * Class info structure
 */
export class ClassInfo<T> {
  /**
   * Full file path of loaded class
   */
  public File: string;
  /**
   * Class name
   */
  public Name: string;
  /**
   * Javascript class object
   */
  public Type: any;

  /**
   * Resolved instance
   */
  public Instance: T;
}

/**
 * Helper class for extracting various information from typescript source code
 */
export class TypescriptCompiler {

  private tsFile: string;

  private compiled: ts.Program;

  constructor(filename: string) {

    this.tsFile = filename;

    this.compiled = ts.createProgram([this.tsFile], {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.Latest
    });
  }

  /**
   * 
   * Extracts all members info from typescript class eg. method name, parameters, return types etc.
   * 
   * @param className name of class to parse
   */
  public getClassMembers(className: string) {

    const members: Map<string, ts.MethodDeclaration> = new Map<string, ts.MethodDeclaration>();

    for (const sourceFile of this.compiled.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        // Walk the tree to search for classes

        ts.forEachChild(sourceFile, this.walkClassNode(className, this.walkMemberNode((method: ts.MethodDeclaration) => {
          members.set(method.name.getText(), method);
        })));
      }
    }

    return members;
  }

  private walkClassNode(className: string, callback: (classNode: ts.ClassDeclaration) => void) {
    return (node: ts.Node) => {
      if (node.kind === ts.SyntaxKind.ClassDeclaration) {
        const cldecl = node as ts.ClassDeclaration;

        if (cldecl.name.text === className) {
          callback(cldecl);
        }
      }
    }
  }

  private walkMemberNode(callback: (methodNode: ts.MethodDeclaration) => void) {
    return (node: ts.Node) => {
      if (node.kind === ts.SyntaxKind.MethodDeclaration) {
        const method = node as ts.MethodDeclaration;
        callback(method);
      }
    }
  }
}


/**
 * Returns resolved instances of classes from specified files.
 *
 * @param filter - files to look at, uses glob pattern to search
 * @param configPath - dir paths taken from app config eg. "system.dirs.controllers". Path MUST be avaible in configuration
 */
export function FromFiles(filter: string, configPath: string, resolve: boolean = true) {
  return (target: any, propertyKey: string | symbol) => {
    if (!filter || _.isEmpty(filter)) {
      throw new ArgumentException(`filter parameter is null or empty`);
    }

    if (!configPath || _.isEmpty(configPath)) {
      throw new ArgumentException(`configPath parameter is null or empty`);
    }

    let instances: Array<ClassInfo<any>> = null;

    const getter = async () => {
      if (!instances) {
        instances = await _loadInstances();
      }

      return instances;
    };

    Object.defineProperty(target, propertyKey, {
      enumerable: true,
      get: getter,
    });

    async function _loadInstances(): Promise<Array<ClassInfo<any>>> {
      const config = await DI.resolve<Configuration>(Configuration);
      const directories = config.get<string[]>(configPath);

      if (!directories || directories.length === 0) {
        return;
      }

      return Promise.all(
        directories
          .map(d => path.normalize(d))
          .filter(d => {
            if (!fs.existsSync(d)) {
              return false;
            }

            return true;
          })
          .flatMap(d => glob.sync(path.join(d, filter)))
          .map(async f => {
            const name = path.parse(f).name;
            const type = require(f)[name];

            if (!type) {
              throw new IOException(`cannot find class ${name} in file ${f}`);
            }

            let instance = type;
            if (resolve) {
              instance = await DI.resolve(type);
            }

            return {
              File: f,
              Instance: instance,
              Name: name,
              Type: type,
            };
          }),
      );
    }
  };
}
