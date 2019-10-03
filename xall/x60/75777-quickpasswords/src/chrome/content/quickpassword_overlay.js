"use strict";

// This code is only meant for the MAIN window! => chrome.manifest lines 27...
// Added a notification which can be enabled using debug.startup config option
// this wil come up if there are errors during onFirefoxLoad
// This function was not called in previous releases of QuickPasswords (<=3.2.1)
// QuickPasswords.Observer was added to quickpasswords_main.js in order to 
// make the Firefox Australis Panel Fix more reliable - by adding a ToolbarListener
QuickPasswords.onFirefoxLoad = function(event) {
  function notify(msg) {
    let notifyBox = QuickPasswords.Util.NotificationBox;
			let buttons = [
				{
					label: 'Cancel',
          accessKey:  'C',
					callback: function() { ; },
					popup: null
				}				
			];			    
    notifyBox.appendNotification(msg,
       'onFireFoxLoad',
       "chrome://quickpasswords/skin/quickpasswords-Icon.png" , 
        notifyBox.PRIORITY_INFO_HIGH,
        buttons);
  }
  try {
    if (QuickPasswords.Preferences && QuickPasswords.Preferences.isDebugOption('startup')) {
      notify ('QuickPasswords.onFirefoxLoad');
      HUDService.toggleBrowserConsole();    
    }
    QuickPasswords.Util.logDebug("QuickPasswords.onFirefoxLoad()");
    QuickPasswords.Util.checkVersionFirstRun();
    let context = document.getElementById("contentAreaContextMenu");
    // only main window!!
    if (context) {
      context.addEventListener("popupshowing", function (e){ QuickPasswords.showFirefoxContextMenu(e); }, false);
    }
    else {
      QuickPasswords.Util.logDebug("No Context Menu found!");
      setTimeout(function() { QuickPasswords.onFirefoxLoad(event); }, 1000);
    }
  }
  catch (ex) {
    QuickPasswords.Util.logException('QuickPasswords.onFirefoxLoad()', ex);
    if (QuickPasswords.Preferences.isDebugOption('startup'))
      notify(ex);
  }
};

QuickPasswords.showFirefoxContextMenu = function(event) {
	// show or hide the menuitem based on what the context menu is on
	// say we only enable this on password fields??
  let isHidden = true;
  try {
    // override hidden
    if ( gContextMenu.onEditableArea 
      || gContextMenu.onTextInput)
      isHidden = false;
      /*
    isHidden = gContextMenu.onImage 
            || gContextMenu.onAudio 
            || gContextMenu.onLink 
            || gContextMenu.onPlainTextLink
            || gContextMenu.onCanvas
            || gContextMenu.onVideo
            || gContextMenu.onCanvas;
            */
  } catch(ex) {
    QuickPasswords.Util.logException('QuickPasswords.showFirefoxContextMenu()', ex);
  }
  let cMenuOption = QuickPasswords.Preferences.contextMenuOption();
  QuickPasswords.Util.logDebug('QuickPasswords.showFirefoxContextMenu()\nisHidden = ' + isHidden);
	document.getElementById("context-quickPasswords").hidden = (isHidden && (cMenuOption != 0)) || cMenuOption==2; // 0 = show always, 2 = never
	document.getElementById("context-quickPasswords-insertUser").hidden = isHidden;
	document.getElementById("context-quickPasswords-insertPassword").hidden = isHidden;
	document.getElementById("context-quickPasswords-cancelLogin").hidden = isHidden;
};

addEventListener("load", QuickPasswords.onFirefoxLoad, true);
if (QuickPasswords.Preferences.isDebugOption('startup')) {
  // alert('added event listener for: ' + window.title);
}