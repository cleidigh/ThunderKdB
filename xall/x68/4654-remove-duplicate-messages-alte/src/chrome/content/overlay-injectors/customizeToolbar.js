// Do I need this?
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// called on window load or on add-on activation while window is already open
function onLoad(activatedWhileWindowOpen) {
  WL.injectCSS("chrome://removedupes/content/skin/classic/removedupes-button.css");
}

// called on window unload or on add-on deactivation while window is still open
function onUnload(deactivatedWhileWindowOpen) {
    // no need to clean up UI on global shutdown
    if (!deactivatedWhileWindowOpen)
        return;

    // Remove all our added elements which are tagged with a unique classname
    let elements = Array.from(window.document.getElementsByClassName(namespace));
    for (let element of elements) {
        element.remove();
    }
}

