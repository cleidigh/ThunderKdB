// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://AutoSlide/content/ASmessengerOverlay.js", window, "UTF-8");

// Conditionally load a JavaScript file for the windows platform
// if (Services.appinfo.OS == "WINNT") {
//   Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders_windows.js", window, "UTF-8");
// }

function onLoad(activatedWhileWindowOpen) {
  WL.injectCSS("chrome://AutoSlide/content/skin/autoslide.css");
  window.org_mozdev_AutoSlide.slider.init();
}

function onUnload(deactivatedWhileWindowOpen) {
  // Cleaning up the window UI is only needed when the
  // add-on is being deactivated/removed while the window
  // is still open. It can be skipped otherwise.
  if (!deactivatedWhileWindowOpen) {
    return
  }
  window.org_mozdev_AutoSlide.slider.msgObserver.unregister();
  window.org_mozdev_AutoSlide.slider.myPrefObserver.unregister();
  window.org_mozdev_AutoSlide.slider.viewWrapperListener.unregister();
  window.org_mozdev_AutoSlide.slider.onCollapseChange.unregister();
}