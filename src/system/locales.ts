import { Configuration, Autoinject, ModuleBase, Logger, Log, File, DI  } from "./index";
import * as glob from "glob";
import * as path from 'path';
import * as fs from 'fs';
import * as _ from "lodash";
import * as util from 'util';


const MakePlural = require("make-plural");
const intervalParse = require("math-interval-parser");

export class Locales extends ModuleBase {

    /**
     * Logger for this module
     */
    @Logger({ module: "Locales" })
    protected Log: Log;

    @Autoinject
    protected Cfg: Configuration = null;

    private _defaultLocale: string;

    /**
     * Default app locale, used when no configuration at request is provided
     */
    public get DefaultLocale(): string {
        return this._defaultLocale;
    }

    Locales = new Map<string, any>();

    constructor(cfg: Configuration) {
        super();
        this.Cfg = cfg;
    }


    public async initialize() {

        this._defaultLocale = this.Cfg.get("locales.defaultLocale", "en");

        const files = this.Cfg.get<string[]>("system.dirs.locales")
            .filter((dir) => {
                if (!fs.existsSync(dir)) {
                    this.Log.warn(`Locales dir at ${dir} not exists.`);
                    return false;
                }

                return true;
            })
            .flatMap(dir => {
                return glob.sync(dir + "*/**/*.json");
            });

        for (let file of files) {
            try {
                const language = path.basename(file, ".json");
                const content = await File.read(file);
                const data = JSON.parse(content);

                this.Locales.set(language, _.merge((this.Locales.has(language)) ? this.Locales.get(language) : {}, data));
            } catch (err) {
                this.Log.error(`Cannot load language file ${file}, err: {0}`, err);
            }
        }
    }


    /**
     * Setting current locale
     * 
     * @param locale - locale to set
     */
    public setLocale(locale: string) {
        this._defaultLocale = locale;
    }

    /**
     * Gets current locale
     */
    public getLocale(): string {
        return this._defaultLocale;
    }

    /**
     * I18n localization function. Returns localized string.
     * If no translation is avaible at current selected language, then fallback to 
     * default language, if still no translation exists, original text is returned
     * 
     * @param text { string | PhraseWithOptions } - text to localize.
     * @param args { any[] } - argument passed to formatted text
     */
    public __(text: string | PhraseWithOptions, ...args: any[]): string {

        if (_.isString(text)) {
            const locTable = (this.Locales.has(this.DefaultLocale)) ? this.Locales.get(this.DefaultLocale) : null;
          

            if(locTable){
                return util.format(locTable[text], ...args);
            }else{
                return util.format(text, ...args);
            }
        } else {
            const locTable = (this.Locales.has(text.locale)) ? this.Locales.get(text.locale) : this.Locales.get(this.DefaultLocale) ;
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

        const locTable = (this.Locales.has(this.DefaultLocale)) ? this.Locales.get(this.DefaultLocale) : null;

        if(!locTable){
            if ((/%/).test(text)) {
                return util.format(text, count);
            }

            return text;
        }

        const phrase = locTable[text];
        const pluralVerb = MakePlural[this.DefaultLocale](count);
        if (phrase[pluralVerb]) {
            return <string>phrase[pluralVerb];
        } else if (phrase['other']) {
            return this._getInterval(phrase["other"], count);
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

        for (let [locale, translations] of this.Locales) {
            result.push(<string>_.property(text)(translations));
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

        for (let [locale, translations] of this.Locales) {
            result.push({ [locale]: <string>_.property(text)(translations) });
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

                return (Math.min(interval.from.value, c) == interval.from.value && Math.max(interval.to.value, c) == interval.to.value);
            }

            return false;
        }
    }
}



interface PhraseWithOptions {
    phrase: string,
    locale: string
}

/**
 * I18n localization function. Returns localized string.
 * If no translation is avaible at current selected language, then fallback to 
 * default language, if still no translation exists, original text is returned
 * 
 * @param text { string } - text to localize.
 * @param locale { string } - selected locale, if not specified - default locale is selected
 */
global.__ = function (text: string | PhraseWithOptions, ...args: any[]) {
    return DI.get<Locales>("Locales").__(text, ...args);
}

/**
  * Plurals translation of a single phrase. Singular and plural forms will get added to locales if unknown.
  * Returns translated parsed and substituted string based on last count parameter.
  * 
  * @param text { string } - text to localize
  * @param count { number } - number of items/things
  * @example use like `__n("%s cats", 1) returns `1 cat`
  */
global.__n = function (text: string, count: number) {
    return DI.get<Locales>("Locales").__n(text, count);
}

/**
 * Returns a list of translations for a given phrase in each language.
 * 
 * @param text { string } - text to translate
 */
global.__l = function (text: string) {
    return DI.get<Locales>("Locales").__l(text);
}

/**
 * Returns a hashed list of translations for a given phrase in each language.
 * 
 * @param text { string } - text to translate
 */
global.__h = function (text: string) {
    return DI.get<Locales>("Locales").__h(text);
}