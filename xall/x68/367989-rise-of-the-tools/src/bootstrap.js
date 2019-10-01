/* Rise of the Tools Bootstrap Script
 * see https://developer.mozilla.org/en/Extensions/Bootstrapped_extensions
 */

var windows = []; // All windows we're started in, to remove helpers at shutdown

var winListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).
                          getInterface(Components.interfaces.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      try{
        start(domWindow, 0);
      } catch (e) {Components.utils.reportError(e);}
    }, false);
    /*domWindow.addEventListener("unload", function() {
      try{
        stop(domWindow);
      } catch (e) {Components.utils.reportError(e);}
    }, false);*/ // Do not clean up in unloading windows, so we don't leak listeners on removal
  },
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { },
};

install = function(data, reason){
  // We run the first time
};

startup = function(data, reason){
  // We're starting up
  let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                      getService(Components.interfaces.nsIWindowMediator);
  // Start in all current windows:
  let enumerator = wm.getEnumerator(windowtype="mail:3pane");
  while (enumerator.hasMoreElements()) {
    let window = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
    try{
      start(window, 0);
    } catch (e) {Components.utils.reportError(e);}
  }
  // Start in new windows:
  wm.addListener(winListener);
};

var start = function(window, attempt){
  // We're starting up in a window
  
  let document = window.document;
  if (document.documentElement.getAttribute("windowtype") != "mail:3pane") {
    return; // We're only interested in main windows.
  }

  let toolbar = document.getElementById("mail-bar3");
  let newparent = document.getElementById("navigation-toolbox");
  if (!(toolbar && newparent)) {
    if (attempt < 10) {
      // Repeatedly retry in the first ~5 seconds after loading the window.
      // (the onload event does not work, as it fires too early in some cases)
      window.setTimeout(function(){ start(window, attempt + 1); }, 500);
      return;
    }
    Components.utils.reportError("Cannot raise toolbar: missing toolbar and/or "
        + "its new parent.");
    return;
  }
  windows.unshift(window);
  
  // Link the toolbar to the toolbox so we can move it around without breaking the Customize thing
  toolbar.setAttribute("toolboxid", "mail-toolbox");
  
  // Save the position for restoring if we get disabled / uninstalled, also our attrchange handler
  toolbar.riseofthetools = {
    parent: toolbar.parentNode,
    next: toolbar.nextSibling,
    oldlabelalign: newparent.getAttribute("labelalign"),
    handler: function(){
      // Keep toolboxes in sync
      newparent.setAttribute("labelalign", toolbar.riseofthetools.parent.getAttribute("labelalign"));
    },
  };
  toolbar.riseofthetools.handler();
  
  // Move the toolbar
  for (let node of newparent.childNodes){
    if (node.id == "tabs-toolbar")
      newparent.insertBefore(toolbar, node);
  }
  
  // add a listener to the toolbar
  window.addEventListener("aftercustomization", toolbar.riseofthetools.handler, false);
  
  // Inject CSS for themes with the menubar under the tabbar, which looks terrible after moving the toolbar up
  let css = document.getElementById("messengerWindow").
                     appendChild(document.createElementNS("http://www.w3.org/1999/xhtml", "style"));
  css.setAttribute("type", "text/css");
  css.id = "riseofthetools-style";
  
  // Inject some css!
  let csstext = '#tabs-toolbar {-moz-box-ordinal-group: 30 !important;} ' +
                '#mail-bar3{-moz-box-ordinal-group: 20 !important;} ' +
                '#mail-toolbar-menubar2 {-moz-box-ordinal-group: 10 !important;}';
  
  css.appendChild(document.createTextNode(csstext));

  // Disallow tabs in the titlebar, which will break as the tabbar is no longer below the title bar
  window.TabsInTitlebar.allowedBy("riseofthetools", false);
};

var stop = function(window){
  // We're shutting down in a window
  let document = window.document;
  // Undo changes
  try{
    let toolbar = document.getElementById("mail-bar3");
    window.removeEventListener("aftercustomization", toolbar.riseofthetools.handler, false);
    toolbar.parentNode.setAttribute("labelalign", toolbar.riseofthetools.oldlabelalign);
    toolbar.riseofthetools.parent.insertBefore(toolbar, toolbar.riseofthetools.next);
    delete toolbar.riseofthetools;
    let css = document.getElementById("riseofthetools-style");
    css.parentNode.removeChild(css);
    window.TabsInTitlebar.allowedBy("riseofthetools", true);
  } catch (e){}
  // Remove closed window out of list
  for (let i = 0; i < windows.length; i++)
    if (windows[i] == window)
      windows = windows.splice(i,1);
};

shutdown = function(data, reason){
  // We're shutting down
  
  // Stop listening
  let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                      getService(Components.interfaces.nsIWindowMediator);
  wm.removeListener(winListener);
  
  for (let window of windows){
    try{
      stop(window);
    } catch (e){}
  }
};

uninstall = function(data, reason){
  // We'll get deleted and have to clean up
};
