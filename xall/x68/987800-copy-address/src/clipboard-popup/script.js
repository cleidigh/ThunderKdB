"use strict";
async function getCopyText() {
    const params = new URL(document.location.href).searchParams;
    const text = params.get('text');
    if (!text) {
        throw new Error('no text');
    }
    return text;
}
async function setClipboard(text) {
    const elm = document.getElementById('text');
    elm.style.display = 'block';
    elm.value = text || '';
    elm.focus();
    elm.select();
    console.log(`copytext => ${elm.value}`);
    const success = document.execCommand('copy');
    console.log(`copy ${success ? 'success' : 'failure'}`);
    elm.style.display = 'none';
    return success;
}
function setMessage(success, text) {
    let elm = document.getElementById('message');
    elm.textContent = success
        ? browser.i18n.getMessage('successCopy')
        : browser.i18n.getMessage('failureCopy');
    const addrs = (success ? text || '' : '').split(',');
    const maxlen = 5;
    let submessage = '';
    const addSubmessage = (v) => {
        submessage += (submessage.length ? '\n' : '') + v;
    };
    for (let i = 0; i < addrs.length; i++) {
        if (i >= maxlen) {
            addSubmessage(`... (${addrs.length - i} more)`);
            break;
        }
        addSubmessage(addrs[i]);
    }
    elm = document.getElementById('submessage');
    elm.innerText = submessage;
}
function clearPopup() {
    browser.browserAction.setPopup({ popup: null });
}
async function main() {
    try {
        const text = await getCopyText();
        const success = await setClipboard(text);
        setMessage(success, text);
    }
    catch (e) {
        console.log(e.message);
        setMessage(false);
    }
    finally {
        clearPopup();
    }
}
main();
