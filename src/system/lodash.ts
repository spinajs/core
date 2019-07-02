import * as _ from 'lodash';

/**
 * Extension of lodash functions, to be avaible in 
 * TypeScript intellisense.
 * 
 * See TypeScript docs on extending built-in types, which I think applies here as well.
 *  _ is defined as  var _: _.LoDashStatic, and vars are not currently extendable.
 * Becouse of this we cannot use standard declaration merging in typescript.
 */
interface SpineLodash extends _.LoDashStatic {
    /**
     * Checks if value is constructable type.
     * Checks for [[Construct]] internal function in object.
     * 
     * @param value - value to test 
     */
    isConstructor(value: any): boolean;
}


/**
 * Checks if value is constructable type.
 * Checks for [[Construct]] internal function in object.
 * 
 * @param value - value to test 
 */
function isConstructor(value: any) {
    try {
        Reflect.construct(String, [], value);
    } catch (e) {
        return false;
    }

    return true;
}

_.mixin({ "isConstructor": isConstructor });

export default <SpineLodash>_;

