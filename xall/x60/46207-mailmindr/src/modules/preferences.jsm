"use strict";

var EXPORTED_SYMBOLS = ['MailmindrPreferences'];

if (Cu === undefined) var Cu = Components.utils;
if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://mailmindr/legacy/logger.jsm");
Cu.import("resource://mailmindr/legacy/storage.jsm");

const _logger = new mailmindrLogger({ _name: 'mailmindrPreferences' });

const gMailmindrLegacyPrefs = {};
const gMailmindrSettings = {};

const pref = (key, value) => {
    gMailmindrLegacyPrefs[key] = value;
    
    setObjectKey(gMailmindrSettings, key, value);

    _logger.log(`pref set: ${key} >> '${value}'`);
};

class MailmindrPreferences {
    constructor(storage) {
        // 
        // 
        // 
        if (!this._initialized) {
            this.initialize(storage);
        }
    }

    initialize(storage) {
        MailmindrPreferences.setDefaultPreferences();
        loadPreferencesFromStorage(storage);
        this._initialized = true;
    }

    static refresh() {
        loadPreferencesFromStorage();
    }

    static normalizePrefBranch(id) {
        if ((id || '').indexOf('extensions.mailmindr.') >= 0) {
            return id;
        }

        return `extensions.mailmindr.${id}`;
    }

    static setDefaultPreferences() {
        Services.scriptloader.loadSubScript("resource://mailmindr/defaults/preferences/mailmindr.js", {}, "UTF-8");
    }

    static getIntPref(id) {
        return gMailmindrLegacyPrefs[MailmindrPreferences.normalizePrefBranch(id)];
    }

    static getStringPref(id, value) {
        const prefId = MailmindrPreferences.normalizePrefBranch(id);
        const result = gMailmindrLegacyPrefs[prefId];
        _logger.log(`getStringPref: ${prefId} : '${result}'`);
        if (undefined === typeof result) {
            return value;
        }

        return String(result);
    }

    static getBoolPref(id) {
        return Boolean(gMailmindrLegacyPrefs[MailmindrPreferences.normalizePrefBranch(id)]);
    }

    static setStringPref(id, value) {
        // 
    }

    static setIntPref(id, value) {
        // 
    }

    static setBoolPref(id, value) {
        // 
    }



    save() {
        try{
            // 
        } catch(ex) {
        }
    }
}

function loadPreferencesFromStorage(storage) {
    _logger.log(`load preferences from storage`);
    _logger.log('preferences storage initialized?');
    if (mailmindrStorage) {
        _logger.log(`mailmindrStorage: [done]:${mailmindrStorage}`);
    } else {
        _logger.warn(`mailmindrStorage [fail]: ${mailmindrStorage}`);
    }
    if (storage) {
        _logger.log(`storage as fallback: [done]:${storage}`);
    } else {
        _logger.warn(`storage as fallback [fail]: ${storage}`);
    }
    const preferences = (mailmindrStorage || storage).loadPreferences();
    const keys = Object.keys(preferences);

    _logger.log(`${keys.length} preferences found.`);

    if (keys && keys.length) {
        for (let key of keys) {
            const normalizedKey = MailmindrPreferences.normalizePrefBranch(key);
            const value = preferences[key];
            _logger.log(`read setting: ${normalizedKey}: '${value}'`);
            pref(normalizedKey, value);
            _logger.log(`proofread: ${normalizedKey}: '${gMailmindrLegacyPrefs[normalizedKey]}'`);
        }
    }

    _logger.log(`[done] load preferences from storage`);
}

function setObjectKey(obj, path, value) {
    const components = path.split('.');

    let current, last = undefined;
    components.forEach((fragment, index) => {
        if (index === (components.length - 1)) {
            // 
            if (current === undefined) {
                // 
                current = obj;
            }
            current[fragment] = value; 
        } else if (index === 0) {
            // 
            if (!obj[fragment]) {
                obj[fragment] = {};
            }
            current = obj[fragment] || {};
            last = obj;
        } else {
            // 
            if (!current[fragment]) {
                current[fragment] = {};
            }
            last = current;
            current = current[fragment];
        }
    });
}

// 
// 
var mailmindrPreferences;
var mailmindrStorage;

getMailmindrStorage().then(storage => {
    _logger.info(`preferences getting initialized. current pref status: ${mailmindrPreferences} & mailmindrStorage: ${mailmindrStorage}, storage: ${storage}`);
    mailmindrStorage = storage;
    mailmindrPreferences = mailmindrPreferences || new MailmindrPreferences(storage);
});
