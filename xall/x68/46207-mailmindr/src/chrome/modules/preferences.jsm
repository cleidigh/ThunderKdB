'use strict';

var EXPORTED_SYMBOLS = ['MailmindrPreferences'];

if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var { mailmindrLogger: MailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrStorage, getMailmindrStorage } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/storage.jsm'
);

const _logger = new MailmindrLogger({ _name: 'mailmindrPreferences' });

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
        Services.scriptloader.loadSubScript(
            'chrome://mailmindr/content/modules/defaults/preferences/mailmindr.js',
            {},
            'UTF-8'
        );
    }

    static getIntPref(id) {
        return parseInt(
            gMailmindrLegacyPrefs[
                MailmindrPreferences.normalizePrefBranch(id)
            ] || 0,
            10
        );
    }

    static getStringPref(id, value) {
        const prefId = MailmindrPreferences.normalizePrefBranch(id);
        const result = gMailmindrLegacyPrefs[prefId];
        _logger.log(`getStringPref: ${prefId} : '${result}'`);

        if (
            result === null ||
            result === undefined ||
            undefined === typeof result
        ) {
            return value;
        }

        return String(result);
    }

    static getBoolPref(id) {
        return Boolean(
            gMailmindrLegacyPrefs[MailmindrPreferences.normalizePrefBranch(id)]
        );
    }

    static setStringPref(id, value) {
        if (!mailmindrStorage) {
            this._logger.error('preferences: storage is not initialized');
            return;
        }
        mailmindrStorage.setPreference(id, value);
    }

    static setIntPref(id, value) {
        // 
    }

    static setBoolPref(id, value) {
        // 
    }

    save() {
        try {
            // 
        } catch (ex) {}
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
            _logger.log(
                `proofread: ${normalizedKey}: '${gMailmindrLegacyPrefs[normalizedKey]}'`
            );
        }
    }

    _logger.log(`[done] load preferences from storage`);
}

function setObjectKey(obj, path, value) {
    const components = path.split('.');

    let current,
        last = undefined;
    components.forEach((fragment, index) => {
        if (index === components.length - 1) {
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
    _logger.info(
        `preferences getting initialized. current pref status: ${mailmindrPreferences} & mailmindrStorage: ${mailmindrStorage}, storage: ${storage}`
    );
    mailmindrStorage = storage;
    mailmindrPreferences =
        mailmindrPreferences || new MailmindrPreferences(storage);
});
