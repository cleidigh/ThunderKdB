import toClipboardPopup from './clipborad.js';
import { getAddrs } from './address.js';
browser.mailTabs.onSelectedMessagesChanged.addListener(async () => {
    const msg = await browser.mailTabs.getSelectedMessages();
    messageAddrsToClipbordPopup(msg.messages);
});
async function messageAddrsToClipbordPopup(messages) {
    const text = getAddrs(messages).join(',');
    console.log(`selected => ${text}`);
    return toClipboardPopup(text);
}
