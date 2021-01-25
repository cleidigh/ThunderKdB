// based on https://github.com/thundernest/addon-developer-support/wiki/WindowListener-API:-Getting-Started

// messenger is not yet known in TB 68
(async () => {
    function showTidybird() {
        // runs in extensions private context => no access to the window
        browser.tidybird_api.toggleWindowListener();
    }
    browser.browserAction.onClicked.addListener(showTidybird);

    // initialize the window listener
    browser.tidybird_api.startWindowListener();

    //TODO -later- separate the windowListener & folderListener API and join them in a separate layer (here,content,...)
})()
