var { MailmindrStringUtils } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/stringUtils.jsm'
);
var { openMessageByMindr } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/utils.jsm'
);

var EXPORTED_SYMBOLS = [
    'createMindrListViewItem',
    'findMindrFromElement',
    'updateMindrListViewItem'
];

function findMindrFromElement(element, list) {
    const itemMindrId = element.getAttribute('data-mindr-id');
    return list.find(item => item.mailmindrGuid === itemMindrId);
}

function setItem(item, topic, mindr) {
    const element = item.querySelector(`[class='${topic}']`);
    if (!element) {
        console.error(`unable to find item part '${topic}'`);
        return;
    }

    switch (topic) {
        case 'subject':
            element.textContent = mindr.details.subject;
            break;
        case 'author':
            if (mindr.waitForReply) {
                element.textContent = mindr.details.recipients;
            } else {
                element.textContent = mindr.details.author;
            }
            break;
        case 'due':
            element.textContent = MailmindrStringUtils.toRelativeString(
                mindr.remindat
            );
            break;
    }
}

function createMindrListViewItem(mindr, document) {
    const richListItem = document.createElement('richlistitem');
    richListItem.setAttribute('data-mindr-id', mindr.mailmindrGuid);
    richListItem.setAttribute('class', 'mailmindr-overviewlist-item');
    richListItem.addEventListener('dblclick', event =>
        openMessageByMindr(mindr)
    );

    const labelWrapper = document.createXULElement('hbox');

    const subjectLabel = document.createElement('label');
    subjectLabel.className = 'subject';

    const senderLabel = document.createElement('label');
    senderLabel.className = 'author';

    const dueLabel = document.createElement('label');
    dueLabel.className = 'due';

    labelWrapper.appendChild(subjectLabel);
    labelWrapper.appendChild(senderLabel);
    labelWrapper.appendChild(dueLabel);

    richListItem.appendChild(labelWrapper);

    updateMindrListViewItem(richListItem, mindr);

    return richListItem;
}

function updateMindrListViewItem(item, mindr) {
    setItem(item, 'subject', mindr);
    setItem(item, 'author', mindr);
    setItem(item, 'due', mindr);

    return item;
}
