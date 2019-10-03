"use strict"

var EXPORTED_SYMBOLS = ['qfb_watched'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

try { Cu.import("resource:///modules/MailServices.jsm"); }
catch { Cu.import("resource:///modules/mailServices.js"); }

try { Cu.import("resource:///modules/QuickFilterManager.jsm"); }
catch { Cu.import("resource:///modules/quickFilterManager.js"); }

const termId = 'qfb-watched@tmatz.github.io#term-watched';
const buttonId = 'qfb-qf-watched@tmatz.github.io';
const filterId = 'qf-watched@tmatz.github.io';

const strings = Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Ci.nsIStringBundleService)
    .createBundle("chrome://qfb-watched/locale/qfb-watched.properties");

const nsMsgSearchOp = Ci.nsMsgSearchOp;
const nsMsgSearchAttrib = Ci.nsMsgSearchAttrib;

var available = true;

let customTerm = {
    name: strings.GetStringFromName('search_term_watched_threads.label'),
    id: termId,
    needsBody: false,
    getEnabled: function (scope, op) { return available; },
    getAvailable: function (scope, op) { return available; },
    getAvailableOperators: function (scope, length) {
        length.value = 2;
        return [nsMsgSearchOp.Is, nsMsgSearchOp.Isnt];
    },
    match: function (aMsgHdr, aSearchValue, aSearchOp) {
        try {
            let thread = aMsgHdr.folder.msgDatabase.GetThreadContainingMsgHdr(aMsgHdr);
            if (aSearchOp == nsMsgSearchOp.Is) {
                return thread && (thread.flags & 0x100);
            } else {
                return !thread || !(thread.flags & 0x100);
            }
        } catch {
            Cu.reportError("qfb-watched: Thread information is not available. please choose 'Filter after Junk Classification' in message filter.");
            return false;
        }
    }
};

let quickFilter = {
    name: filterId,
    domId: buttonId,
    appendTerms: function (aTermCreator, aTerms, aFilterValue) {
        let term = aTermCreator.createTerm();
        let value = term.value;
        term.attrib = nsMsgSearchAttrib.Custom;
        value.attrib = term.attrib;
        term.value = value;
        term.customId = termId;
        term.booleanAnd = true;
        term.op = aFilterValue ? nsMsgSearchOp.Is : nsMsgSearchOp.Isnt;
        aTerms.push(term);
    },
};

var qfb_watched = {
    install: function () {
        Services.prompt.alert(
            null,
            strings.GetStringFromName('on_install_dialog.title'),
            strings.GetStringFromName('on_install_dialog.message'));
    },

    startup: function () {
        MailServices.filters.addCustomTerm(customTerm);
        QuickFilterManager.defineFilter(quickFilter);
    },

    shutdown: function () {
        // I can't find how to remove added custom term, so just disable it.
        available = false;
        QuickFilterManager.killFilter(filterId);
    },

    loadIntoWindow: function (window) {
        // quickFilterBar.js seems doesn't support restartless.
        // event handler is installed at init only.

        const xul_ns = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

        let qfb = window.document.getElementById('quick-filter-bar-collapsible-buttons');
        let button = window.document.createElementNS(xul_ns, 'toolbarbutton');
        button.setAttribute('id', buttonId);
        button.setAttribute('class', 'toolbarbutton-1');
        button.setAttribute('type', 'checkbox');
        button.setAttribute('orient', 'horizontal');
        button.setAttribute('crop', 'none');
        button.setAttribute('minwidth', '16');
        button.setAttribute('image', 'chrome://messenger/skin/icons/thread-watched.png');
        button.setAttribute('label', strings.GetStringFromName('qfb_watched_qf.label'));
        button.setAttribute('tooltiptext', strings.GetStringFromName('qfb_watched_qf.tooltip'));
        button.setAttribute('checkState', '0');
        qfb.appendChild(button);
    },

    unloadFromWindow: function (window) {
        let button = window.document.getElementById(buttonId);
        if (button) {
            button.parentNode.removeChild(button);
        }
    },
}
