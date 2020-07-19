var { mailmindrSearch } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/search.jsm'
);
var { MailUtils } = ChromeUtils.import('resource:///modules/MailUtils.jsm');

var EXPORTED_SYMBOLS = [
    'calculateDaysHoursMinutes',
    'enableElement',
    'getFolder',
    'isMindrInboxZero',
    'remainingMilliseconds',
    'openMessageByMindr'
];

const remainingMilliseconds = mindr => {
    return mindr.remindat - Date.now();
};

const isMindrInboxZero = mindr => {
    return (
        typeof mindr.originFolderURI != 'undefined' &&
        mindr.originFolderURI != ''
    );
};

/**
 * getFolder - gets a nsIMsgFolder object from a given folder URI
 * @returns a nsIMsgFolder object
 */
function getFolder(folderURI) {
    let rdf = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(
        Components.interfaces.nsIRDFService
    );
    let fldr = rdf
        .GetResource(folderURI)
        .QueryInterface(Components.interfaces.nsIMsgFolder);

    return fldr;
}

function enableElement(document, id, enabled) {
    const target = document.getElementById(id);
    if (target) {
        target.setAttribute('disabled', !enabled);

        return true;
    }

    return false;
}

function calculateDaysHoursMinutes(delta) {
    let x = delta / 1000;
    const seconds = x % 60;
    x = Math.floor(Math.abs(x / 60));
    const minutes = x % 60;
    x = Math.floor(Math.abs(x / 60));
    const hours = x % 24;
    x = Math.floor(Math.abs(x / 24));
    const days = x;

    return {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds
    };
}

const openMessageByMindr = mindr => {
    const msgGuid = mindr.mailguid;
    const messageHeader = mailmindrSearch.getMessageHdrByMessageId(msgGuid);

    if (!messageHeader || messageHeader.length == 0) {
        return false;
    }

    try {
        const header = messageHeader[0].hdr;
        MailUtils.displayMessage(header);
    } catch (openMessageException) {
        console.error(openMessageException);
        return false;
    }

    return true;
};
