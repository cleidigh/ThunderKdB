var active_accounts = '';
browser.storage.sync.get('pref_active_accounts').then(function (data) {
    active_accounts = data.pref_active_accounts;
    if (typeof active_accounts !== typeof undefined) {
        active_accounts = active_accounts.split(';');
    }
    else {
        active_accounts = new Array();
    }
});



let test = browser.menus.create({
    id: "mail_sent_notifier_activated",
    title: 'Mail Sent Notifier',
    type: 'radio',
    onclick: (info, tab) => {
        if(active_accounts.includes(info.selectedFolder.name)) {
            // Account ist eingeschaltet, entfernen
            let index = active_accounts.indexOf(info.selectedFolder.name);
            active_accounts.splice(index, 1);
        }
        else {
            active_accounts.push(info.selectedFolder.name);
        }
        // Aenderung speichern
        browser.storage.sync.set({
            pref_active_accounts: active_accounts.join(';'),
        });
    },
    contexts: ["folder_pane"],
    icons: {},
    checked: false
}, () => { });


browser.menus.onShown.addListener(async function (info, tab) {
    // mit active_accounts checken, ob ausgewaehlt oder nicht
    if (info.selectedFolder.path !== '/') {
        // It's a folder and not the account itself, don't display the menu-point
        browser.menus.update('mail_sent_notifier_activated', {
            visible: false,
        });
    }
    else {
        let is_checked = false;
        if (active_accounts.includes(info.selectedFolder.name)) {
            is_checked = true;
        }
        browser.menus.update('mail_sent_notifier_activated', {
            visible: true,
            checked: is_checked
        });
    }
    browser.menus.refresh();
});