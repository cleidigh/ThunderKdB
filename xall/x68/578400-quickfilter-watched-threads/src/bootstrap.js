'use strict'

const termId = 'qfb-watched@tmatz.github.io#term-watched';
const buttonId = 'qfb-qf-watched@tmatz.github.io';
const filterId = 'qf-watched@tmatz.github.io';
const nsMsgSearchOp = Ci.nsMsgSearchOp;
const nsMsgSearchAttrib = Ci.nsMsgSearchAttrib;

var installed = false;
var isCustomTermAvailable = false;
var isQuickFilterAvailable = false;
var strings = null;

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var { MailServices } =  ChromeUtils.import('resource:///modules/MailServices.jsm');
var { QuickFilterManager } = ChromeUtils.import('resource:///modules/QuickFilterManager.jsm');

function install(data, reason) {
    console.log('qfb-watched: install');
    installed = true;
}

function uninstall(data, reason) {
    console.log('qfb-watched: uninstall');
    installed = false;
}

function startup(data, reason) {
    console.log('qfb-watched: startup');
    // locale strings become available on startup.
    strings = Services.strings.createBundle('chrome://qfb-watched/locale/qfb-watched.properties');

    MailServices.filters.addCustomTerm(createCustomTerm());
    isCustomTermAvailable = true;

    forEachOpenWindow(loadIntoWindow);
    Services.wm.addListener(WindowListener);
}

function shutdown(data, reason) {
    console.log('qfb-watched: shutdown');
    if (reason === APP_SHUTDOWN) {
        return;
    }

    // I can't find how to remove added custom term, so just disable it.
    isCustomTermAvailable = false;
    QuickFilterManager.killFilter(filterId);
    isQuickFilterAvailable = false;

    forEachOpenWindow(unloadFromWindow);
    Services.wm.removeListener(WindowListener);
}

let WindowListener = {
    onOpenWindow(xulWindow) {
        const window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
        loadIntoWindow(window);
    }
};

function forEachOpenWindow(callback) {
    const windows = Services.wm.getEnumerator('mail:3pane');
    while (windows.hasMoreElements()) {
        callback(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
    }
}

function loadIntoWindow(window) {
    const document = window.document;

    if (document.readyState != 'interactive' && document.readyState != 'complete') {
        // should not use Promise and await here, because it doesn't guarantee continuation executes during 'interacive' state.
        window.addEventListener('DOMContentLoaded', () => loadIntoWindow(window), { once: true });
        return;
    }

    if (document.documentElement.getAttribute('windowtype') != 'mail:3pane') {
        return;
    }

    console.log('qfb-watched: loadIntoWindow');

    if (!installed && document.readyState !== 'interactive') {
        Cu.reportError(`qfb-watched: unexpected document.readyState (${document.readyState})`);
    }

    if (installed) {
        // prompt restart is required,
        // because quickFilterBar.js seems not support restartless.
        // button's event handler is installed at init only.
        Services.prompt.alert(
            null,
            strings.GetStringFromName('on_install_dialog.title'),
            strings.GetStringFromName('on_install_dialog.message'));
    }

    const qfb = document.getElementById('quick-filter-bar-collapsible-buttons');
    if (qfb) {
        qfb.appendChild(createToolbarButton(document));
        if (!isQuickFilterAvailable) {
            // quickFilter should be defined only if corresponding button exists.
            QuickFilterManager.defineFilter(createQuickFilter());
            isQuickFilterAvailable = true;
        }
    }
    else {
        Cu.reportError('qfb-watched: Can not find "quick-filter-bar-collapsible-buttons".');
    }
}

function createCustomTerm() {
    return {
        name: strings.GetStringFromName('search_term_watched_threads.label'),
        id: termId,
        needsBody: false,
        getEnabled: function (scope, op) { return isCustomTermAvailable; },
        getAvailable: function (scope, op) { return isCustomTermAvailable; },
        getAvailableOperators: function (scope, length) {
            length.value = 2;
            return [nsMsgSearchOp.Is, nsMsgSearchOp.Isnt];
        },
        match: function (aMsgHdr, aSearchValue, aSearchOp) {
            try {
                const thread = aMsgHdr.folder.msgDatabase.GetThreadContainingMsgHdr(aMsgHdr);
                if (aSearchOp === nsMsgSearchOp.Is) {
                    return thread && (thread.flags & 0x100);
                }
                else {
                    return !thread || !(thread.flags & 0x100);
                }
            }
            catch {
                Cu.reportError('qfb-watched: Thread information is not available. please choose "Filter after Junk Classification" in message filter.');
                return false;
            }
        }
    };
}

function createQuickFilter() {
    return {
        name: filterId,
        domId: buttonId,
        appendTerms: function (aTermCreator, aTerms, aFilterValue) {
            const term = aTermCreator.createTerm();
            const value = term.value;
            term.attrib = nsMsgSearchAttrib.Custom;
            value.attrib = term.attrib;
            term.value = value;
            term.customId = termId;
            term.booleanAnd = true;
            term.op = aFilterValue ? nsMsgSearchOp.Is : nsMsgSearchOp.Isnt;
            aTerms.push(term);
        },
    };
}

function createToolbarButton(document) {
    const xul_ns = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
    const button = document.createElementNS(xul_ns, 'toolbarbutton');
    button.id = buttonId;
    button.className = 'toolbarbutton-1';
    button.setAttribute('type', 'checkbox');
    button.setAttribute('orient', 'horizontal');
    button.setAttribute('crop', 'none');
    button.setAttribute('minwidth', '16');
    button.setAttribute('image', 'chrome://messenger/skin/icons/thread-watched.png');
    button.setAttribute('label', strings.GetStringFromName('qfb_watched_qf.label'));
    button.setAttribute('tooltiptext', strings.GetStringFromName('qfb_watched_qf.tooltip'));
    if (installed) {
        button.setAttribute('tooltiptext', strings.GetStringFromName('qfb_watched_qf.tooltip_installed'));
        button.setAttribute('disabled', true);
    }
    else if (document.readyState !== 'interactive') {
        button.setAttribute('tooltiptext', strings.GetStringFromName('qfb_watched_qf.tooltip_unavailable'));
        button.setAttribute('disabled', true);
    }
    return button;
}

function unloadFromWindow(window) {
    const button = window.document.getElementById(buttonId);
    if (button) {
        button.parentNode.removeChild(button);
    }
}
