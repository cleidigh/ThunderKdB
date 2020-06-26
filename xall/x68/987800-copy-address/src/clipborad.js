import { retry } from './util.js';
export default async function toClipboardPopup(text) {
    browser.browserAction.setPopup({
        popup: `clipboard-popup/index.html?text=${text}`
    });
}
export async function toClipboard(text) {
    function onCopy(ev) {
        console.log(`onCopy! ${text}`);
        document.removeEventListener('copy', onCopy);
        ev.stopImmediatePropagation();
        ev.preventDefault();
        if (ev.clipboardData) {
            ev.clipboardData.setData('text/plain', text);
        }
    }
    document.addEventListener('copy', onCopy);
    return retry(2, 0.1, () => {
        return document.execCommand('copy');
    }).catch((e) => {
        document.removeEventListener('copy', onCopy);
        throw e;
    });
}
