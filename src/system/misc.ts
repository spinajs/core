/**
 * Apply reusable components to target class - mixins
 *
 * @param derivedCtor - target class constructor
 * @param baseCtors - mixins constructors that will extend target class
 */
export function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      derivedCtor.prototype[name] = baseCtor.prototype[name];
    });
  });
}
