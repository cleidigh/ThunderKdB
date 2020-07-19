let windowDetails = {};
browser.browserAction.onClicked.addListener(async () => {
    checkWindow();
});
onError = (e) => {
    console.error(e);
}
checkWindow = () => {

    if (windowDetails.id) {
        let updateInfo = {state: "normal", focused: true, drawAttention: true};
        let getInfo = {populate: false, windowTypes: ['app', 'normal', 'panel', 'popup']}
        browser.windows.get(windowDetails.id, getInfo).then(Window => {
            browser.windows.update(windowDetails.id, updateInfo);
        }).catch(function (error) {
            createPopup();
        });
    } else {
        createPopup();
    }
}
createPopup = () => {
    let createData = {
        type: "popup",
        url: "apis.html",
        titlePreface: "KundenMeister CRM Mail Export",
        width: 800,
        height: 800
    };
    browser.windows.create(createData).then(Window => {
        windowDetails = Window;
    });
}
