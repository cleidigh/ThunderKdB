/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// see:
//   https://developer.mozilla.org/en-US/Add-ons/Thunderbird/Creating_a_Custom_Column
//   https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIMsgCustomColumnHandler

var TypicalReplyTypeColumnHandler = {
  get prefs() {
    delete this.prefs;
    let { prefs } = Components.utils.import('resource://typical-reply-modules/prefs.js', {});
    return this.prefs = prefs;
  },
  BASE: 'extensions.typical-reply@clear-code.com.',

  get utils() {
    delete this.utils;
    let { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm', {});
    return this.utils = TypicalReply;
  },

  getCellText: function(aRow, aCol) {
    return null;
  },
  getImageSrc: function(aRow, aCol) {
    return null;
  },

  isEditable: function(aRow, aCol) {
    return false;
  },
  cycleCell: function(aRow, aCol) {
  },
  isString: function() {
    return true;
  },

  getCellProperties: function(aRow, aCol) {
    var hdr = gDBView.getMsgHdrAt(aRow);
    var type = this.getTypeFromHdr(hdr);
    if (!type)
      return '';

    var properties = '';
    this.utils.definitions.some(function(aDefinition) {
      if (aDefinition.subjectPrefix == type) {
        properties = 'typicalReply-' + aDefinition.type;
        return true;
      }
      return false;
    });
    return properties;
  },
  getRowProperties: function(aRow) {
  },

  getSortStringForRow: function(aHdr) {
    return this.getTypeFromHdr(aHdr);
  },
  getSortLongForRow: function(aHdr) {
    return 0;
  },

  getTypeFromHdr: function(aHdr) {
    if (aHdr.flags & Components.interfaces.nsMsgMessageFlags.HasRe) // Igrnoe "Re:" prefixed mails
      return null;
    var subject = aHdr.mime2DecodedSubject;
    var matched = subject.match(this.utils.subjectDetector);
    return matched ? matched[1] : null ;
  },

  observe: function(aMsgFolder, aTopic, aData) {
    this.register();
  },
  register: function() {
    gDBView.addColumnHandler('typicalReplyTypeCol', this);
//    Services.obs.removeObserver(TypicalReplyTypeColumnHandler, 'MsgCreateDBView');
  },

  installStyleSheet: function() {
    var declarations = this.utils.definitions.map(function(aDefinition) {
      return [
        'treechildren::-moz-tree-image(typicalReply-' + aDefinition.type + ') {',
          'list-style-image: url("' + aDefinition.icon + '");',
        '}'
      ].join('\n');
    }).join('\n\n');
    var uri = 'data:text/css,' + encodeURIComponent(declarations);
    var pi = document.createProcessingInstruction('xml-stylesheet', 'type="text/css" href="' + uri + '"');
    document.insertBefore(pi, document.documentElement);
  }
};

window.addEventListener('DOMContentLoaded', function initialize(aEvent) {
  if (FolderDisplayWidget.prototype.DEFAULT_COLUMNS.indexOf('typicalReplyTypeCol') < 0)
    FolderDisplayWidget.prototype.DEFAULT_COLUMNS.push('typicalReplyTypeCol');

  window.removeEventListener(aEvent.type, initialize, false);
  Services.obs.addObserver(TypicalReplyTypeColumnHandler, 'MsgCreateDBView', false);

  if (gDBView) {
    TypicalReplyTypeColumnHandler.register();
  }

  TypicalReplyTypeColumnHandler.installStyleSheet();
}, false);
