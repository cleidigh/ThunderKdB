'use strict';

var { MailUtils } = ChromeUtils.import('resource:///modules/MailUtils.jsm');
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

var { MailmindrListView } = ChromeUtils.import(
    'chrome://mailmindr/content/content/mailmindrListView.js'
);
var { mailmindrCore } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/core.jsm'
);
var { mailmindrSearch } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/search.jsm'
);
var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);
var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrKernel } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/kernel.jsm'
);
var { mailmindrStorage } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/storage.jsm'
);
var { Enumerable } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/linq.jsm'
);
var { openMessageByMindr } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/utils.jsm'
);

const MAILMINDR_POSTPONE_MINUTES_DEFAULT = 15;

const _logger = new mailmindrLogger({ _name: 'alertDialog' });

const _listView = new MailmindrListView('mindrAlert.js');

const getElements = () => ({
    listBox: document.getElementById('mailmindr-alert-listbox'),
    viewButton: document.getElementById('mailmindrViewMessageButton'),
    dismissMindrButton: document.getElementById('mailmindrDismissMindrButton'),
    dismissAllMindrButton: document.getElementById(
        'mailmindrDismissAllMindrButton'
    )
});

const close = () => {
    window.close();
};

const checkAndClose = () => {
    if (_listView.rowCount == 0) {
        close();
    }
};

const onLoad = () => {
    const listItems =
        window &&
        window.arguments &&
        window.arguments.length &&
        window.arguments[0].list;

    const { listBox } = getElements();
    listBox.view = _listView;

    listBox.beginUpdateBatch();
    _listView.updateItems(listItems);
    listBox.endUpdateBatch();

    setEventListeners();

    doUpdateButtonStates();
};

const onDialogAccept = () => {
    mailmindrCore.clearMindrsInDialog();
    return true;
};

/**
 * viewSelectedMessages
 * opens all selected messages - at this time, we have only a single selection,
 * so we can select the message. this function is able to handle multiselection.
 * >> find out how to open in new window >> remove seltype=single from XUL
 */
const doViewSelectedMessages = () => {
    const start = new Object();
    const end = new Object();
    const numRanges = _listView.selection.getRangeCount();

    for (let idx = 0; idx < numRanges; idx++) {
        _listView.selection.getRangeAt(idx, start, end);
        for (let v = start.value; v <= end.value; v++) {
            const mindr = _listView.getCellValue(v, -1);
            openMessageByMindr(mindr);
        }
    }
};

const doDismissMindrForSelectedMessages = () => {
    const start = new Object();
    const end = new Object();
    const numRanges = _listView.selection.getRangeCount();
    let lastIndex = -1;

    for (let idx = 0; idx < numRanges; idx++) {
        _listView.selection.getRangeAt(idx, start, end);
        for (let v = end.value; v >= start.value; v--) {
            const mindr = _listView.getCellValue(v, -1);

            if (mindr) {
                mailmindrKernel.kernel.deleteMindr(mindr);
                mailmindrKernel.kernel.removeMindrFromDialog(mindr);

                _listView.remove(mindr);
            }

            lastIndex = v;
        }
    }

    if (_listView.rowCount > 0) {
        _listView.selection.select(lastIndex - 1 < 0 ? 0 : lastIndex - 1);
    }

    checkAndClose();
};

const doUpdateButtonStates = () => {
    const {
        viewButton,
        dismissMindrButton,
        dismissAllMindrButton
    } = getElements();
    const isSelected = _listView.selection.currentIndex < 0;

    _logger.log('IDX:: ' + _listView.selection.currentIndex);
    viewButton.disabled = isSelected;
    dismissMindrButton.disabled = isSelected;
    dismissAllMindrButton.disabled = _listView.rowCount == 0;
};

const doDismissAllMindrs = () => {
    _listView.selection.selectAll();
    doDismissMindrForSelectedMessages();
};

const doPostponeAllMindrs = () => {
    /* for each mindr which is already perfomed: set new reminder date */
    /*
        let mindr = _listView.getCellValue(v, -1);
        let msgGuid = mindr.mailguid;
    */
    _logger.log('POSTPONED! count: ' + _listView.rowCount);
    _logger.log('postponing mindrs');
    while (_listView.rowCount > 0) {
        const mindr = _listView.getItemAt(0);
        const milliseconds = 60000 * MAILMINDR_POSTPONE_MINUTES_DEFAULT;
        const newTime = new Date(Date.now() + milliseconds); // postpone five minutes

        if (mindr) {
            if (mindr.remindat > Date.now()) {
                postponeMindrRelative(
                    mindr,
                    MAILMINDR_POSTPONE_MINUTES_DEFAULT
                );
            } else {
                postponeMindrAbsolute(mindr, newTime);
            }
        } else {
            _logger.log('there is no mindr');
        }
    }

    mailmindrCore.clearMindrsInDialog();
    _logger.log('postponing mindrs DONE');
};

const postponeMindrAbsolute = (mindr, dateTime) => {
    mailmindrCore.postponeMindrAbsolute(mindr, dateTime);

    _listView.remove(mindr);
};

const postponeMindrRelative = (mindr, minutes) => {
    mailmindrCore.postponeMindrRelative(mindr, minutes);

    _listView.remove(mindr);
};

const setEventListeners = () => {
    const {
        viewButton,
        dismissMindrButton,
        dismissAllMindrButton,
        listBox
    } = getElements();

    viewButton.addEventListener('click', () => doViewSelectedMessages(), false);

    dismissMindrButton.addEventListener(
        'click',
        () => doDismissMindrForSelectedMessages(),
        false
    );

    dismissAllMindrButton.addEventListener(
        'click',
        () => doDismissAllMindrs(),
        false
    );

    listBox.addEventListener('select', () => doUpdateButtonStates(), false);

    listBox.addEventListener('dblclick', () => doViewSelectedMessages(), false);

    window.addEventListener('close', () => doPostponeAllMindrs(), false);

    ///
    /// set observers
    ///
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
    // 
    // 
};

window.addEventListener('load', () => onLoad(), false);
