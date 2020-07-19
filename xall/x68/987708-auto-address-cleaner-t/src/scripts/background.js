browser.compose.onBeforeSend.addListener((tab, details) => {
    /*console.log(details);
    console.log("details.plainText of just after onBeforeSend: ", details.plainTextBody);
    console.log("original to:", details.to);
    console.log("original cc:", details.cc);
    console.log("original bcc:", details.bcc);*/
    stripDisplayName(details.to);
    stripDisplayName(details.cc);
    stripDisplayName(details.bcc);
    /*console.log("striped");
    console.log("striped to:", details.to);
    console.log("striped cc:", details.cc);
    console.log("striped bcc:", details.bcc);*/
    browser.compose.setComposeDetails(tab.id, {to: details.to, cc: details.cc, bcc: details.bcc}).then(() => {
        console.log("tabId: " + tab.id + " setComposeDetails finished.");
    });
    browser.compose.getComposeDetails(tab.id).then((d) => {
        console.log("details of after setComposeDetails: ", d);
    });
    return;
});

function stripDisplayName(addresses) {
    let re = /(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/;
    for (let i = 0; i < addresses.length; i++) {
        addresses[i] = re.exec(addresses[i])[2];
    }
    return; // addresses;
}
