// Establish messaging with background worker
var port;

window.addEventListener("load", () => {
    port = browser.runtime.connect();
    port.onMessage.addListener(updateStatusDisplay);

    addLocalizedLabels();
    // Unsuccessful uploads remain in the popup window until this button is pressed
    buttonClear.addEventListener('click', () => port.postMessage('clearcomplete'));
});

/**
 * Fills the status popup with content
 * 
 * @param {Map<*,Status>} uploads The Map with Status objects for all active uploads as received via message
 */
function updateStatusDisplay(uploads) {
    // Remove extra rows
    while (status_lines.rows.length > uploads.size) {
        status_lines.deleteRow(-1);
    }

    buttonClear.classList.add('hidden');
    if (uploads.size === 0) {
        no_uploads.hidden = false;
    } else {
        no_uploads.hidden = true;
        if (has_information()) {
            buttonClear.classList.remove('hidden');
        }
        // Make sure, we have enough lines for all uploads
        while (status_lines.rows.length < uploads.size) {
            const line = status_lines.insertRow();
            line.insertCell(0);
            line.insertCell(1);
        }
        // Fill the rows of the table
        // CAUTION: For a Map, the second argument to the callback is the key, not a number as in an array
        let row = 0;
        uploads.forEach(upload => fill_status_row(upload, row++));
    }

    /**
     * @returns {Boolean} true if any of the uploads is in error state
     */
    function has_information() {
        for (const a of uploads) {
            if (true === a[1].error || a[1].status === 'generatedpassword') { return true; }
        }
        return false;
    }
}

/**
 * Fill one row of the table with information from a Status object
 * 
 * @param {Status} status The Status object to display
 * @param {number} row The row number to fill
 */
function fill_status_row(status, row) {
    status_lines.rows[row].cells[0].textContent = status.filename;

    const status_cell = status_lines.rows[row].cells[1];
    if (status.error) {
        status_cell.classList.add('error');
        status_cell.textContent =
            browser.i18n.getMessage('status_error',
                browser.i18n.getMessage(`status_${status.status}`));
    } else if (status.status === 'uploading') {
        let progress;
        if (status_cell.firstChild instanceof HTMLProgressElement) {
            progress = status_cell.firstChild;
        } else {
            progress = document.createElement('progress');
            if (status_cell.firstChild) {
                status_cell.replaceChild(progress, status_cell.firstChild);
            } else {
                status_cell.appendChild(progress);
            }
        }
        progress.value = status.progress;
    } else if (status.status === 'generatedpassword') {
        status_cell.textContent = browser.i18n.getMessage('status_password', status.password);
        const copyButton = buttonCopy.cloneNode(true);
        copyButton.addEventListener('click', () => navigator.clipboard.writeText(status.password));
        copyButton.removeAttribute('id');
        copyButton.classList.remove('hidden');
        status_cell.appendChild(copyButton);
    } else {
        status_cell.classList.remove('error');
        status_cell.textContent = browser.i18n.getMessage(`status_${status.status}`);
    }
}

/* Make jshint happy */
// Automatic variables defined by ids in html
/* global no_uploads, status_lines, buttonClear, buttonCopy */
// Functions defined in other scripts imported in html file
/* global addLocalizedLabels */