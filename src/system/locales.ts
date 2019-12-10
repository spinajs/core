import * as fs from 'fs';
import * as glob from 'glob';
import * as _ from 'lodash';
import * as path from 'path';
import * as util from 'util';

import { Configuration } from '@spinajs/configuration';
import { Autoinject, DI } from '@spinajs/di';
import * as MakePlural from 'make-plural';
import { File } from './filesystem';
import { Log, Logger, ModuleBase } from './index';

import intervalParse = require('math-interval-parser');

export class Locales extends ModuleBase {

  /**
   * Default app locale, used when no configuration at request is provided
   */
  public get DefaultLocale(): string {
    return this.defaultLocale;
  }

  protected locales = new Map<string, any>();
  /**
   * Logger for this module
   */
  @Logger({ module: 'Locales' })
  protected log: Log;

  @Autoinject()
  protected cfg: Configuration = null;

  private defaultLocale: string;

  constructor(cfg: Configuration) {
    super();
    this.cfg = cfg;
  }

  public async initialize() {
    this.defaultLocale = this.cfg.get('locales.defaultLocale', 'en');

    const files = this.cfg.get<string[]>('system.dirs.locales')
      .filter(dir => {
        if (!fs.existsSync(dir)) {
          this.log.warn(`Locales dir at ${dir} not exists.`);
          return false;
        }

        return true;
      })
      .flatMap(dir => {
        return glob.sync(dir + '*/**/*.json');
      });

    for (const file of files) {
      try {
        const language = path.basename(file, '.json');
        const content = await File.read(file);
        const data = JSON.parse(content);

        this.locales.set(language, _.merge(this.locales.has(language) ? this.locales.get(language) : {}, data));
      } catch (err) {
        this.log.error(`Cannot load language file ${file}, err: {0}`, err);
      }
    }
  }

  /**
   * Setting current locale
   *
   * @param locale - locale to set
   */
  public setLocale(locale: string) {
    this.defaultLocale = locale;
  }

  /**
   * Gets current locale
   */
  public getLocale(): string {
    return this.defaultLocale;
  }

  /**
   * I18n localization function. Returns localized string.
   * If no translation is avaible at current selected language, then fallback to
   * default language, if still no translation exists, original text is returned
   *
   * @param text { string | IPhraseWithOptions } - text to localize.
   * @param args { any[] } - argument passed to formatted text
   */
  public __(text: string | IPhraseWithOptions, ...args: any[]): string {
    if (_.isString(text)) {
      const locTable = this.locales.has(this.DefaultLocale) ? this.locales.get(this.DefaultLocale) : null;

      if (locTable) {
        return util.format(locTable[text], ...args);
      } else {
        return util.format(text, ...args);
      }
    } else {
      const locTable = this.locales.has(text.locale)
        ? this.locales.get(text.locale)
        : this.locales.get(this.DefaultLocale);
      return util.format(locTable[text.phrase], ...args);
    }
  }

  /**
   * Plurals translation of a single phrase. Singular and plural forms will get added to locales if unknown.
   * Returns translated parsed and substituted string based on last count parameter.
   *
   * @param text { string } - text to localize
   * @param count { number } - number of items/things
   * @example use like `__n("%s cats", 1) returns `1 cat`
   */
  public __n(text: string, count: number): string {
    const locTable = this.locales.has(this.DefaultLocale) ? this.locales.get(this.DefaultLocale) : null;

    if (!locTable) {
      if (/%/.test(text)) {
        return util.format(text, count);
      }

      return text;
    }

    const phrase = locTable[text];
    const pluralVerb = MakePlural[this.DefaultLocale](count);
    if (phrase[pluralVerb]) {
      return phrase[pluralVerb] as string;
    } else if (phrase.other) {
      return this._getInterval(phrase.other, count);
    }

    return null;
  }

  /**
   * Returns a list of translations for a given phrase in each language.
   *
   * @param text { string } - text to translate
   */
  public __l(text: string) {
    const result: string[] = [];

    for (const [, translations] of this.locales) {
      result.push(_.property(text)(translations) as string);
    }

    return result;
  }

  /**
   * Returns a hashed list of translations for a given phrase in each language.
   *
   * @param text { string } - text to translate
   */
  public __h(text: string) {
    const result: any[] = [];

    for (const [locale, translations] of this.locales) {
      result.push({ [locale]: _.property(text)(translations) as string });
    }

    return result;
  }

  private _getInterval(text: string, count: number) {
    let toReturn = text;
    const phrases = text.split(/\|/);

    phrases.some(phrase => {
      const matches = phrase.match(/^\s*([\(\)\[\]\d,]+)?\s*(.*)$/);

      if (matches[1] && _matchInterval(count, matches[1])) {
        toReturn = matches[2];
        return true;
      } else {
        toReturn = phrase;
      }
    });

    return toReturn;

    /**
     * test a number to match mathematical interval expressions
     * [0,2] - 0 to 2 (including, matches: 0, 1, 2)
     * ]0,3[ - 0 to 3 (excluding, matches: 1, 2)
     * [1]   - 1 (matches: 1)
     * [20,] - all numbers ≥20 (matches: 20, 21, 22, ...)
     * [,20] - all numbers ≤20 (matches: 20, 21, 22, ...)
     */
    function _matchInterval(c: number, eq: string) {
      const interval = intervalParse.default(eq);
      if (interval) {
        if (interval.from.value === c) {
          return interval.from.included;
        }

        if (interval.to.value === c) {
          return interval.from.included;
        }

        return (
          Math.min(interval.from.value, c) === interval.from.value && Math.max(interval.to.value, c) === interval.to.value
        );
      }

      return false;
    }
  }
}

interface IPhraseWithOptions {
  phrase: string;
  locale: string;
}

/**
 * I18n localization function. Returns localized string.
 * If no translation is avaible at current selected language, then fallback to
 * default language, if still no translation exists, original text is returned
 *
 * @param text { string } - text to localize.
 * @param locale { string } - selected locale, if not specified - default locale is selected
 */
global.__ = (text: string | IPhraseWithOptions, ...args: any[]) => {
  return DI.get<Locales>('Locales').__(text, ...args);
};

/**
 * Plurals translation of a single phrase. Singular and plural forms will get added to locales if unknown.
 * Returns translated parsed and substituted string based on last count parameter.
 *
 * @param text { string } - text to localize
 * @param count { number } - number of items/things
 * @example use like `__n("%s cats", 1) returns `1 cat`
 */
global.__n = (text: string, count: number) => {
  return DI.get<Locales>('Locales').__n(text, count);
};

/**
 * Returns a list of translations for a given phrase in each language.
 *
 * @param text { string } - text to translate
 */
global.__l = (text: string) => {
  return DI.get<Locales>('Locales').__l(text);
};

/**
 * Returns a hashed list of translations for a given phrase in each language.
 *
 * @param text { string } - text to translate
 */
global.__h = (text: string) => {
  return DI.get<Locales>('Locales').__h(text);
};
