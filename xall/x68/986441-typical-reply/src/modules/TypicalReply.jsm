/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ['TypicalReply'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

const AccountManager = Cc['@mozilla.org/messenger/account-manager;1']
                       .getService(Ci.nsIMsgAccountManager);

Cu.import('resource://typical-reply-modules/SearchFolderManager.jsm');

var TypicalReply = {
  BASE: 'extensions.typical-reply@clear-code.com.',

  RECIPIENTS_SENDER: 'sender',
  RECIPIENTS_ALL:    'all',
  RECIPIENTS_BLANK:  'blank',
  RECIPIENTS_FORWARD: 'forward',

  AUTO_SEND_NEVER:    'never',
  AUTO_SEND_ALWAYS:   'always',
  AUTO_SEND_NO_QUOTE: 'noquote',

  CONFIG_VERSION: 1,

  get lastConfigVersion() {
    return this.prefs.getPref(this.BASE + 'configVersion') || 0;
  },
  set lastConfigVersion(aVersion) {
    return this.prefs.setPref(this.BASE + 'configVersion', aVersion);
  },

  get prefs() {
    delete this.prefs;
    let { prefs } = Components.utils.import('resource://typical-reply-modules/prefs.js', {});
    return this.prefs = prefs;
  },

  extractAddresses: function(aMIMEFieldValue) {
    const MimeHeaderParser = Cc['@mozilla.org/messenger/headerparser;1']
                             .getService(Ci.nsIMsgHeaderParser);
    const addresses = {};
    const names = {};
    const fullNames = {};
    const numAddresses = MimeHeaderParser.parseHeadersWithArray(
                         aMIMEFieldValue, addresses, names, fullNames);
    return addresses.value;
  },

  get type() {
    return this.prefs.getPref(this.BASE + 'replying.type');
  },
  set type(aType) {
    aType = String(aType);
    this.prefs.setPref(this.BASE + 'replying.type', aType);
    return aType;
  },

  get quoteType() {
    return this.prefs.getPref(this.BASE + 'replying.quoteType');
  },
  set quoteType(quoteType) {
    quoteType = String(quoteType);
    this.prefs.setPref(this.BASE + 'replying.quoteType', quoteType);
    return quoteType;
  },

  reset: function() {
    this.type = '';
    this.quoteType = '';
  },

  get definitions() {
    delete this.definitions;
    const base = this.BASE + 'reply';
    this.definitions = this.prefs.getPref(this.BASE + 'buttons').split(/(?:\s*,\s*|\s+)/).map(function(aType) {
      return this.getDefinition(aType);
    }, this);
    return this.definitions;
  },
  get definitionsByType() {
    delete this.definitionsByType;
    this.definitionsByType = {};
    this.definitions.forEach(function(aDefinition) {
      this.definitionsByType[aDefinition.type] = aDefinition;
    }, this);
    return this.definitionsByType;
  },
  get subjectDetector() {
    delete this.subjectDetector;
    const subjectPatterns = []
    this.definitions.forEach(function(aDefinition) {
      if (aDefinition.subjectPrefix)
        subjectPatterns.push(this.sanitizeForRegExp(aDefinition.subjectPrefix));
      if (aDefinition.subject)
        subjectPatterns.push(this.sanitizeForRegExp(aDefinition.subject));
    }, this);
    this.subjectDetector = new RegExp('^(' + subjectPatterns.join('|') +  ')');
    return this.subjectDetector;
  },
  sanitizeForRegExp(aString) {
    return aString.replace(/([\.\+\*\?\:\[\]\\^\$\#\%\{\}\|\&])/g, '\\$1');
  },

  checkAllowedForRecipients(aRecipients, aAllowedDomains) {
    if (aAllowedDomains == '' || aAllowedDomains == '*')
      return true;

    aAllowedDomains = aAllowedDomains.split(/\s*,\s*/);
    return aRecipients.every(function(aRecipient) {
      const addresses = this.extractAddresses(aRecipient);
      return addresses.every(function(aAddress) {
        return aAllowedDomains.some(function(aDomain) {
          return aAddress.indexOf('@' + aDomain) > 0;
        });
      }, this);
    }, this);
  },

  getDefinition(aType) {
    const base = this.BASE + 'reply.' + aType + '.';
    return {
      type:          aType,
      label:         this.prefs.getLocalizedPref(base + 'label'),
      labelQuote:    this.prefs.getLocalizedPref(this.BASE + 'label.quote.before') +
                     this.prefs.getLocalizedPref(base + 'label') +
                     this.prefs.getLocalizedPref(this.BASE + 'label.quote.after'),
      accesskey:     this.prefs.getLocalizedPref(base + 'accesskey'),
      subjectPrefix: this.prefs.getLocalizedPref(base + 'subjectPrefix'),
      subject:       this.prefs.getLocalizedPref(base + 'subject'),
      body:          this.prefs.getLocalizedPref(base + 'body'),
      bodyImage:     this.prefs.getLocalizedPref(base + 'bodyImage'),
      recipients:    (this.prefs.getLocalizedPref(base + 'recipients') || '').toLowerCase(),
      quoteType:     this.prefs.getLocalizedPref(base + 'quoteType') || (this.prefs.getLocalizedPref(base + 'alwaysQuote') && 'yes' || null),
      forwardType:   this.prefs.getLocalizedPref(base + 'forwardType'),
      priority:      this.prefs.getLocalizedPref(base + 'priority'),
      separate:      this.prefs.getLocalizedPref(base + 'separate'),
      searchFolder:  this.prefs.getLocalizedPref(base + 'searchFolder'),
      searchTargets: this.prefs.getLocalizedPref(base + 'searchTargets'),
      allowedDomains: (this.prefs.getLocalizedPref(base + 'allowedDomains') || '').trim(),
      autoSend:      (this.prefs.getLocalizedPref(base + 'autoSend') || '').toLowerCase(),
      icon:          this.prefs.getLocalizedPref(base + 'icon')
    };
  }
};

new SearchFolderManager(TypicalReply.definitions.filter(function(aDefinition) {
  return aDefinition.searchFolder;
}));
