/******************************************************/
/* Initiliazation */
/******************************************************/

/* Wait for DarkReader script load. Once loaded, 
depending on the value in local sotrage, trigger 
or not the DarkReader activation. */
loadScript("DarkReader", function() {
    let gettingItem = browser.storage.local.get("darkModeGCalTab");
    gettingItem.then(onGot, onError);
});

/******************************************************/
/* Function definitions */
/******************************************************/

/** Function that waits for an object to be loaded 
 * and execute a callback function once object has
 * loaded.
 * Source: https://stackoverflow.com/questions/8618464/how-to-wait-for-another-js-to-load-to-proceed-operation
 * param: 
 * name - name of the object to wait for
 * callback - the function to execute after load
 * */
function loadScript(name, callback) {
    setTimeout(function() {
        if (name) {
            callback(name);
        } else {
            whenAvailable(name, callback);
        }
    }, 10);
}

/** Function that activates DarkReader.
 * Requires DarkReader to be part of the page already.
 * */
function activateDarkReader() {
    DarkReader.setFetchMethod(window.fetch);
    DarkReader.enable({
        brightness: 120,
        contrast: 90,
        sepia: 10,
      });
}

/** Function that inactivates DarkReader.
 * Requires DarkReader to be part of the page already.
 * */
function inactivateDarkReader() {
    DarkReader.disable();
}

/** Function that gets dark mode value in local storage.
 * Called if local storage value retrieve succeeded.
 * */
function onGot(item) {
    browser.storage.onChanged.addListener(onGot);
    for (let key in item) {
        if (key === "darkModeGCalTab") {
            let darkMode = null;
            item[key].newValue === undefined ? (darkMode = item[key]) : (darkMode = item[key].newValue);
            if (darkMode) {
                activateDarkReader();
            }
            if (!darkMode) {
                inactivateDarkReader();
            }
        }
    }
}

/** Function that logs error in console.
 * Called if local storage value retrieve failed.
 * */
function onError(error) {
    console.log(`Error: ${error}`);
}