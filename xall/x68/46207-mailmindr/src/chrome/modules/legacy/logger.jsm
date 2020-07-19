'use strict';

if (Cu === undefined) var Cu = Components.utils;
if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

const EXPORTED_SYMBOLS = [
    'mailmindrLogger',
    'MAILMINDR_LOG_DISABLED',
    'MAILMINDR_LOG_INFO',
    'MAILMINDR_LOG_ERROR',
    'MAILMINDR_LOG_WARN',
    'MAILMINDR_LOG_DEBUG',
    'mailmindrInitializeLogger'
];

const MAILMINDR_LOG_DISABLED = 0;
const MAILMINDR_LOG_INFO = 1;
const MAILMINDR_LOG_TRACE = 1;
const MAILMINDR_LOG_ERROR = 2;
const MAILMINDR_LOG_WARN = 3;
const MAILMINDR_LOG_DEBUG = 4;
const MAILMINDR_LOG_FILENAME = 'mailmindr.log';

var { FileUtils: fileUtils } = ChromeUtils.import(
    'resource://gre/modules/FileUtils.jsm'
);
var { Log4Moz } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/log4moz.jsm'
);

var mailmindrLoggerInitialized = false;
var mailmindrLoggerIndention = 0;

function normalize(what) {
    return String(what || '')
        .trim()
        .replace('\n', ' -> ')
        .replace('\r', '')
        .replace('\t', '  ');
}

class mailmindrLogger {
    constructor(component, logLevel) {
        // 
        this._name = 'mailmindrLogger';
        // 
        this.initialize(component, logLevel);
        // 

        this._enabled = true; //prefs.getBoolPref("common.logging");
    }

    ///
    /// ctor
    ///
    initialize(component, logLevel) {
        const leftPad = (text, spacer, length) => {
            return (text + `${spacer}`.repeat(length)).substring(0, length);
        };

        this._component = leftPad(component._name, ' ', 27);

        this._logger = Log4Moz.repository.getLogger('' + this._component);
        this._logger.level = Log4Moz.Level['Debug'];

        if (logLevel != null) {
            switch (logLevel) {
                case MAILMINDR_LOG_INFO:
                case MAILMINDR_LOG_TRACE:
                    this._logger.level = Log4Moz.Level['Trace'];
                    break;
                case MAILMINDR_LOG_DEBUG:
                    this._logger.level = Log4Moz.Level['Debug'];
                    break;
                case MAILMINDR_LOG_WARN:
                    this._logger.level = Log4Moz.Level['Warn'];
                    break;
            }
        }

        // 
        // 
        // 
        // 
        // 
        // 

        this._initialized = true;
    }

    ///
    /// public methods
    ///
    call(what) {
        this.log('[call] ' + normalize(what));
        mailmindrLoggerIndention++;
    }

    end() {
        this.log('<<end.');
        mailmindrLoggerIndention -= mailmindrLoggerIndention > 0 ? 1 : 0;
        this.log('[end]');
    }

    log(what) {
        if (this._enabled) {
            this.info(what);
        }
    }

    error(what) {
        if (this._enabled) {
            const message = `${(what.message
                ? what.message
                : what
            ).trim()} > at line ${(what && what.lineNumber) || '*'}`;
            this._logger.error(normalize(message));
            // 
            // 
            // 
        }

        if (console && console.error) {
            console.error(what);
        }
    }

    info(what) {
        if (this._enabled) {
            this._logger.info(this.space() + normalize(what));
        }
    }

    warn(what) {
        if (this._enabled) {
            this._logger.warn(this.space() + normalize(what));
        }

        if (console && console.warn) {
            console.warn(what);
        }
    }

    trace(what) {
        if (this._enabled) {
            this._logger.trace(normalize(what));
        }
    }

    explode(obj) {
        if (null == obj) {
            return 'null';
        }

        let result = '<<' + typeof obj + '>>';

        for (let attr in obj) {
            try {
                result +=
                    '[' +
                    attr +
                    ']  ' +
                    obj[attr] +
                    '      ' +
                    '<<' +
                    typeof obj[attr] +
                    '>>';
            } catch (ex) {
                result += '<<ERROR: ' + ex + '>>';
            }
        }

        return result;
    }

    space() {
        let spc = '  ';
        return (function(s, i) {
            let r = s;
            for (let j = 0; j < i; j++) {
                r += s;
            }
            return r;
        })(spc, mailmindrLoggerIndention);
    }
}

function mailmindrInitializeLogger() {
    if (mailmindrLoggerInitialized) {
        return;
    }

    let formatter = new Log4Moz.BasicFormatter();
    let root = Log4Moz.repository.rootLogger;
    let logfile = fileUtils.getFile('ProfD', ['mailmindr.log']);
    let fileAppender = new Log4Moz.RotatingFileAppender(
        logfile,
        formatter,
        1024 * 1000,
        9
    );

    fileAppender.level = Log4Moz.Level['All'];

    root.addAppender(fileAppender);

    mailmindrLoggerInitialized = true;
}
