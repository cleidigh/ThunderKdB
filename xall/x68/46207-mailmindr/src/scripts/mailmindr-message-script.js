const removeExistingMessageBars = () => {
    const messageBars = document.querySelectorAll('.mailmindr-message-bar');
    if (!messageBars) {
        return;
    }

    Array.from(messageBars).forEach(messageBar =>
        document.body.removeChild(messageBar)
    );
};

const getExistingMessageBar = () =>
    document.querySelector('.mailmindr-message-bar');

const createUI = (guid, dueDateTimeText) => {
    const mailmindrBar = document.createElement('div');
    mailmindrBar.className = 'mailmindr-message-bar';

    const mailmindrContentWrapper = document.createElement('div');
    mailmindrContentWrapper.className = 'mailmindr-message-bar_content-wrapper';
    const mailmindrMessage = document.createElement('span');

    mailmindrMessage.innerText = browser.i18n.getMessage(
        'view.message-display.notification.button.message',
        dueDateTimeText
    );

    const mailmindrButtonWrapper = document.createElement('div');
    mailmindrButtonWrapper.className = 'mailmindr-message-bar_button-wrapper';

    const mailmindrCloseBtn = document.createElement('button');
    mailmindrCloseBtn.className = 'mailmindr-button mailmindr-button--micro';
    mailmindrCloseBtn.innerText = browser.i18n.getMessage(
        'view.message-display.notification.button.close'
    );
    mailmindrCloseBtn.addEventListener('click', () => {
        const existingMessageBar = getExistingMessageBar();
        existingMessageBar.style.display = 'none';
    });

    const mailmindrEditBtn = document.createElement('button');
    mailmindrEditBtn.className = 'mailmindr-button mailmindr-button--micro';
    mailmindrEditBtn.innerText = browser.i18n.getMessage(
        'view.message-display.notification.button.edit'
    );
    mailmindrEditBtn.addEventListener('click', async () => {
        await messenger.runtime.sendMessage({
            action: 'do:mindr-action-edit',
            payload: {
                guid
            }
        });
    });

    mailmindrButtonWrapper.appendChild(mailmindrEditBtn);
    mailmindrButtonWrapper.appendChild(mailmindrCloseBtn);

    mailmindrContentWrapper.appendChild(mailmindrMessage);

    mailmindrBar.appendChild(mailmindrContentWrapper);
    mailmindrBar.appendChild(mailmindrButtonWrapper);

    const bodyElement = window.document.body;
    const messageWrapper = bodyElement.firstChild;

    window.document.body.insertBefore(mailmindrBar, messageWrapper);
};

const createMindrBar = async guid => {
    const mindrGuid = JSON.parse(guid)
        .replace(/"/g, '')
        .replace(/'/g, '');
    const result = await messenger.runtime.sendMessage({
        action: 'mindr:get-information',
        payload: { guid: mindrGuid }
    });

    if (!result) {
        removeExistingMessageBars();
        return;
    }

    const existingMessageBar = getExistingMessageBar();
    if (existingMessageBar) {
        return;
    }

    const { status, payload } = result;
    if (status === 'ok' && payload && payload.mindr) {
        const { mindr } = result.payload;
        const dueDateTimeText = new Intl.DateTimeFormat(navigator.language, {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(mindr.due);

        removeExistingMessageBars();
        createUI(mindrGuid, dueDateTimeText);
    }
};
