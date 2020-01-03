/* Minimize on Close Bootstrap Script
 * see https://developer.mozilla.org/en/Extensions/Bootstrapped_extensions
 */

var windows = []; // All windows we're started in

var closeHandler = function(event) {
  // Event handler for close events in windows we're loaded in: minimize instead
  event.preventDefault();
  event.target.minimize();
}

var start = function(window){
  // We're starting up in a window
  windows.unshift(window);
  // We redirect two things: the close event (used in all sane situations) and
  // the window.close method (used when tabs are in the toolbar). The latter is
  // ugly, but all other methods to "fix" the close toolbar button don't seem
  // to work fast enough to prevent the window from closing.
  window.addEventListener("close", closeHandler, false);
  window.__minimize_on_close__originalClose = window.close;
  window.close = window.minimize;
};

var stop = function(window){
  // We're shutting down in a window
  let document = window.document;
  window.removeEventListener("close", closeHandler, false);
  window.close = window.__minimize_on_close__originalClose;
  delete window.__minimize_on_close__originalClose;
};

var winListener = {
  onOpenWindow: function(window) {
    // Wait for the window to finish loading
    let domWindow = window.QueryInterface(
        Components.interfaces.nsIInterfaceRequestor).getInterface(
        Components.interfaces.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      let document = domWindow.document;
      if (document.documentElement.getAttribute("windowtype") != "mail:3pane") {
        return; // We're only interested in main windows.
      }
      try {
        start(domWindow);
      } catch (e) { Components.utils.reportError(e); }
    }, false);
  },
  onCloseWindow: function(window) { },
  onWindowTitleChange: function(window, aTitle) { },
};

install = function(data, reason){
  // We run the first time
};

startup = function(data, reason){
  // We're starting up
  let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                      getService(Components.interfaces.nsIWindowMediator);
  wm.addListener(winListener);
  let enumerator = wm.getEnumerator(windowtype="mail:3pane");
  while (enumerator.hasMoreElements()) {
    let window = enumerator.getNext().QueryInterface(
        Components.interfaces.nsIDOMWindow);
    try{
      start(window);
    } catch (e) { Components.utils.reportError(e); }
  }
};

shutdown = function(data, reason){
  // We're shutting down
  let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                      getService(Components.interfaces.nsIWindowMediator);
  wm.removeListener(winListener);
  for (let window of windows){
    try{
      stop(window);
    } catch (e) { Components.utils.reportError(e); }
  }
};

uninstall = function(data, reason){
  // We'll get deleted and have to clean up
};
