window.mail_sent_notifier = window.mail_sent_notifier || {};
window.mail_sent_notifier.messages = window.mail_sent_notifier.messages || [];

/**
 * 
 * @param {String} identityId 
 * @param {Array} accounts 
 * @return {Identity} 
 */
function getIdentityFromAccounts(identityId, accounts) {
    for (let account of accounts) {
        for (let identity of account.identities) {
            if (identity.id === identityId) {
                return identity;
            }
        }
    }
}

function send_to_server(url, get_params) {
    let params = new URLSearchParams(get_params);
    url += '?' + params.toString();
    ajax_async_url_call(url);
}

function ajax_async_url_call(
    url,
    check_for_server_script_success = false,
    show_error_messages = false
) {
    var response = '';
    var error_result_string = 'Error loading page\n';
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', url, true);
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4) {
            if (xmlHttp.status == 200) {
                response = xmlHttp.responseText;
                if (check_for_server_script_success) {
                    if (response.trim() != 'mailsentnotifier:success') {
                        // There was a server side error - the script could not successfully process the transmitted data
                        if (show_error_messages)
                            alert('Server Script Error: ' + response.trim());
                        return error_result_string;
                    }
                }
                return response;
            } else {
                if (show_error_messages)
                    alert(
                        'HTTP / Communication Error: HTTP Status ' +
                        xmlHttp.status +
                        ' reurned!'
                    );
                return error_result_string;
            }
        }
    };
    xmlHttp.send(null);
}

/** 
 * Listener, beim erstellen eines neuen Fensters.
*/
browser.windows.onCreated.addListener((thisWindow, ev) => {
    console.log(thisWindow);
    console.log(ev);
    console.log(browser.compose);
    if (thisWindow.type == 'messageCompose') {
        // Angefangen Nachricht zu schreiben
        console.log('compose');
        window.mail_sent_notifier.messages[thisWindow.id] = {
            startTime: (new Date).getTime()
        }
    }
});

/**
 * Listener, vor des Absendens der Nachricht
 */
browser.compose.onBeforeSend.addListener(function (tab, details) {
    browser.accounts.list().then(function (accounts) {
        browser.storage.sync.get().then(function (settings) {
            const identity = getIdentityFromAccounts(details.identityId, accounts)
            const time_diff = (new Date()).getTime() - window.mail_sent_notifier.messages[tab.windowId].startTime;
            let edit_time = Math.floor(time_diff / 1000 / 60);
            if (edit_time <= 0) {
                edit_time = 1;
            }
            // Check, ob mit dieser Email gesendet werden sollte oder nicht
            if (settings.pref_active_accounts.split(';').includes(identity.email)) {
                send_to_server(
                    settings.pref_zeiterfassung_url,
                    {
                        subject: details.subject,
                        to: details.to[0],
                        from: identity.email,
                        worker_id: settings.pref_worker_id,
                        edit_time: edit_time,
                    });
            }
        });
    });
});



