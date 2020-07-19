/* jshint curly: true, strict: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
'use strict';

if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

let EXPORTED_SYMBOLS = ['mailmindrFactory'];

var { PluralForm } = ChromeUtils.import(
    'resource://gre/modules/PluralForm.jsm'
);

var { mailmindrSearch } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/search.jsm'
);
var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);
var { mailmindrI18n } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/i18n.jsm'
);

class MailmindrTimespan {
    // 
    constructor() {
        this._preset = false;
        this._isFixedTime = false;
        this.days = 0;
        this.hours = 0;
        this.minutes = 0;
        this.text = '';
        this._name = 'mailmindrDataTimespan';
        this._logger = new mailmindrLogger(this);
    }

    // 
    // 
    // 
    // 
    // 
    // 
    // 

    set isFixedTime(value) {
        if ('string' == typeof value) {
            this._isFixedTime = 'true' == value;
        } else if ('number' == typeof value) {
            this._isFixedTime = 1 == value;
        } else {
            this._isFixedTime = value;
        }
    }

    get isFixedTime() {
        return this._isFixedTime;
    }

    /**
     * will create something like
     * 		"2 days, 5 minutes"
     *  	" 1 day, 5 hours, 2 minutes"
     */
    toString() {
        if (this._preset) {
            return this.text;
        }

        let pair = mailmindrI18n.getString('mailmindr.utils.core.timePair');
        let buffer = '';
        let fields = this.isFixedTime ? ['days'] : ['days', 'hours', 'minutes'];
        for (let field of fields) {
            let value = this[field];
            if (value > 0) {
                buffer +=
                    ', ' +
                    pair
                        .replace('#1', value)
                        .replace(
                            '#2',
                            this._pluralize(
                                value,
                                'mailmindr.utils.core.' + field
                            )
                        );
            }
        }
        let span = buffer.replace(/^, /, '');

        if (!this.isFixedTime) {
            return span;
        }

        buffer = mailmindrI18n.getString(
            'mailmindr.utils.core.fix.tostringpattern'
        );

        return buffer
            .replace('#1', span)
            .replace('#2', this.getLocalizedTime());
    }

    /**
     * will create something like
     * 		"tomorrow"
     *  	"in 5 seconds"
     */
    toRelativeString() {
        if (this._preset) {
            return this.text;
        }

        let daysPluralized = '';
        if (this._isFixedTime) {
            if (this.days >= 7 && this.days % 7 == 0) {
                daysPluralized = this._pluralize(
                    this.days / 7,
                    'mailmindr.utils.core.relative.weeks'
                );
            } else if (this.days > 0) {
                daysPluralized = this._pluralize(
                    this.days,
                    'mailmindr.utils.core.relative.days'
                );
            } else if (this.days == 0) {
                daysPluralized = mailmindrI18n.getString(
                    'mailmindr.utils.core.relative.today'
                );
            }

            if (this._isFixedTime && this.days >= 0) {
                let buffer = mailmindrI18n.getString(
                    'mailmindr.utils.core.fix.tostringpattern'
                );
                return buffer
                    .replace('#1', daysPluralized)
                    .replace('#2', this.getLocalizedTime());
            }
        } else {
            return this.toString();
            /*
            if ((this.days >= 7) && (this.days % 7 == 0)) {
                return this._pluralize(this.days / 7, "mailmindr.utils.core.relative.weeks");
            } else if (this.days > 0) {
                return this._pluralize(this.days, "mailmindr.utils.core.relative.days");
            } else if (this.hours > 0) {
                return this._pluralize(this.hours, "mailmindr.utils.core.relative.hours");
            }
            */
        }
    }

    _pluralize(num, identifier) {
        let str = PluralForm.get(num, mailmindrI18n.getString(identifier));
        return str.replace('#1', num);
    }

    serialize() {
        let buffer = [this.days, this.hours, this.minutes, this.isFixedTime];
        return buffer.join(';');
    }

    getLocalizedTime() {
        this._logger.log(`setting preset: ${this.hours} // ${this.minutes}`);
        const time = new Date();
        time.setHours(this.hours);
        time.setMinutes(this.minutes);
        time.setSeconds(0);
        // 

        return time.toLocaleTimeString();
    }

    /**
     * create a combobox entry with
     */
    setPreset(preset) {
        this._preset = true;

        this.days = preset;
        this.minutes = preset;
        this.hours = preset;
        this.isFixedTime = false;

        this.text = mailmindrI18n.getString(
            'mailmindr.utils.core.timespan.preset.' + Math.abs(preset)
        );
    }
}

class mailmindrFactoryBase {
    constructor() {
        this._name = 'mailmindrFactory';
        this._logger = new mailmindrLogger(this);
    }

    ///////////////////////////////////////////////////////////////////////
    /////// mindr
    ///////

    /**
     * createTimeSpan - creates an empty mindr object
     * @returns a mindr object
     */
    createMindr() {
        const uuidGenerator = Components.classes[
            '@mozilla.org/uuid-generator;1'
        ].getService(Components.interfaces.nsIUUIDGenerator);

        return {
            mailmindrGuid: uuidGenerator.generateUUID().toString(),
            remindat: -1,
            waitForReply: false,
            action: null,
            performed: false,
            targetFolder: '',
            doShowDialog: false,
            doMarkAsUnread: false,
            doMarkFlag: false,
            doTagWith: '',
            doMoveOrCopy: 0,
            doTweet: false,
            doRunCommand: '',
            doMailmindrPush: false,
            originFolderURI: '',
            lastSeenURI: '',
            details: {
                author: '',
                subject: '',
                recipients: '',
                note: ''
            },
            isReplyAvailable: false
        };
    }

    ///////////////////////////////////////////////////////////////////////
    /////// actiontemplate
    ///////

    /**
     * createActionTemplate - creates an empty action object
     * @returns a action object
     */
    createActionTemplate() {
        let uuidGenerator = Components.classes[
            '@mozilla.org/uuid-generator;1'
        ].getService(Components.interfaces.nsIUUIDGenerator);

        function mailmindrAction() {
            this._name = 'mailmindrDataAction';
            this._logger = new mailmindrLogger(this);
        }

        mailmindrAction.prototype = {
            id: uuidGenerator.generateUUID().toString(),
            isGenerated: false,
            text: '',
            description: '',
            enabled: true,
            targetFolder: '',
            doShowDialog: false,
            doMarkAsUnread: false,
            doMarkFlag: false,
            doTagWith: '',
            doMoveOrCopy: 0,
            doTweet: false,
            doRunCommand: '',
            doMailmindrPush: false,

            /**
             * copyTo - copies action to target object
             * copies only 'public' fields, 'privates' (prefixed with _) wil be ignored
             * @returns the given object filled up with the actions' values
             */
            copyTo: function(obj) {
                for (let field in this) {
                    // 
                    if (
                        field.indexOf('_') != 0 &&
                        field != 'id' &&
                        field != 'isValid' &&
                        field != 'text' &&
                        typeof this[field] != 'function' &&
                        typeof obj[field] != 'undefined'
                    ) {
                        obj[field] = this[field];
                    }
                }

                return obj;
            },

            // 
            // 
            // 
            // 
            // 
            // 
            // 

            // 
            // 
            // 
            // 
            // 
            // 
            // 

            toJson: function() {
                let includedProperties = [
                    'id',
                    'isGenerated',
                    'text',
                    'description',
                    'targetFolder',
                    'doShowDialog',
                    'doMarkAsUnread',
                    'doMarkFlag',
                    'doTagWith',
                    'doMoveOrCopy',
                    'doTweet',
                    'doRunCommand',
                    'doMailmindrPush'
                ];

                let data = {};
                for (let property of includedProperties) {
                    data[property] = this[property];
                }

                return JSON.stringify(data);
            }
        };

        return new mailmindrAction();
    }

    ///////////////////////////////////////////////////////////////////////
    /////// timespan
    ///////

    /**
     * createTimeSpan - creates an empty timespan object
     * @returns a timespan object
     */
    createTimespan() {
        let result = new MailmindrTimespan();
        if (arguments.length > 0) {
            result.setPreset(arguments[0]);
        }
        return result;
    }

    ///////////////////////////////////////////////////////////////////////
    /////// reply-object
    ///////

    createReplyForMindr(mindr) {
        let result = this.createReplyObject();
        result.replyForMindrGuid = mindr.mailmindrGuid;
        return result;
    }

    createReplyObject() {
        return {
            replyForMindrGuid: '',
            mailguid: '',
            sender: '',
            recipients: '',
            receivedAt: 0
        };
    }

    ///////////////////////////////////////////////////////////////////////
    /////// RDF Service
    ///////

    getRDFService() {
        return Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(
            Components.interfaces.nsIRDFService
        );
    }
}

var mailmindrFactory = new mailmindrFactoryBase();
