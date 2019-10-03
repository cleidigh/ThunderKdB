

// Code is currently unused.
// QuickPasswords.Manager replaces LinkAlert from Linkalerts overlay
if (!QuickPasswords.Manager)
  QuickPasswords.Manager = {
  LAST_TARGET: null,
  MOVE_TARGET: null,

  onMove: function onMove(e){
    let tooltip = true; // replace that with a pref later
    let box;
    let moveTarget = e.target;
    QuickPasswords.Util.logDebugOptional("default", "QuickPasswords.Manager.onMove(" + e.toString() + ")");
//    while(){
//      moveTarget = moveTarget.parentNode;
//    }
    QuickPasswords.Manager.MOVE_TARGET = moveTarget;

    if(tooltip){
      box = new QuickPasswordsTooltip(e);
    }

    if(moveTarget.nodeName.toLowerCase() == "tree" && moveTarget.id == "signonsTree") {
      let iconSrc = QuickPasswords.Manager.getIcons(moveTarget);
      let anyIcons = false;
      for(let i = 0; i < iconSrc.length; i++){
        if(iconSrc[i] != "") {
          anyIcons = true;
          break;
        }
      }

      if(anyIcons){
        box.show(iconSrc);
        QuickPasswords.Manager.LAST_TARGET = e.target;
      }
      else {
        box.hide();
        QuickPasswords.Manager.LAST_TARGET = null;
      }
    }
    else {
      box.hide();
    }
  } ,
  
  logoutMaster: function logoutMaster() {
		const Ci = Components.interfaces,
          Cc = Components.classes,
					tokenDB = Cc["@mozilla.org/security/pk11tokendb;1"].getService(Ci.nsIPK11TokenDB);
		if (QuickPasswords.Preferences.isDebugOption("Manager.protection")) debugger;			
    QuickPasswords.Util.logDebugOptional("Manager",  "logout Master Password");
		
		try {
			let token = tokenDB.getInternalKeyToken();
			token.logoutSimple();
		}
		catch (ex) {
			// old code
			tokenDB.findTokenByName("").logoutAndDropAuthenticatedResources();
	  }
      
    QuickPasswords.initToolbarLock(); // visual clue
  } ,
  
  // force the user to enter a master password in order to protect
  // all passwords (when copying lines to clipboard)
  // return true if Masterpassword was entered
  // or no Master password is set at all.
  loginMaster: function loginMaster(allowNoMasterPassword) {
    let tokendb = Components.classes["@mozilla.org/security/pk11tokendb;1"]
                      .createInstance(Components.interfaces.nsIPK11TokenDB),
        token = tokendb.getInternalKeyToken();

    // If there is no master password, do nothing
    if (token.checkPassword(""))
      return allowNoMasterPassword; // return true if function allows no password

    // So there's a master password. But since checkPassword didn't succeed, we're logged out (per nsIPK11Token.idl).
    try {
      // Relogin and ask for the master password.
      token.login(true);  // 'true' means always prompt for token password. User will be prompted until
                          // clicking 'Cancel' or entering the correct password.
    } catch (e) {
      // An exception will be thrown if the user cancels the login prompt dialog.
      // User is also logged out of Software Security Device.
    }

    return token.isLoggedIn();    
  },

  // since the passwords sub Tab has no Id we cannot use any built in helper from Thunderbird
  openPasswordsTab: function openPasswordsTab(win, checkbox) {
    // find the passwords tab by looking for the tabpane that contains the checkbox
    if (checkbox) {
      let p=checkbox.parentNode;
      while (p && (p.tagName != 'tabpanel')) {
        p = p.parentNode;
      }
      if (p) {
        win.setTimeout(
          function() {
            // find tab index and then activate the panel
            let tabPanels = p.parentNode;
            for (let i=0; i<tabPanels.tabbox.tabs.childNodes.length; i++) {
              if (tabPanels.children[i] == p) {
                tabPanels.tabbox.tabs.childNodes[i].click();
                break;
              }
            }
          });
      }
    }
  } ,
  
  createMasterPassword: function createMasterPassword() {
    const util = QuickPasswords.Util;
    let prefURI, 
		    dialog = null, 
		    isContentTabOnly=false;
    switch(util.Application) {
      case 'Firefox': 
				if (util.PlatformVersion >=43.0) {
					isContentTabOnly = true;
					prefURI = "about:preferences#security";
				  QuickPasswords_TabURIopener.openURLInTab(prefURI);
				}
				else {
					prefURI = "chrome://browser/content/preferences/preferences.xul";
					dialog = window.openDialog(prefURI, 
														 "Preferences",
														 "chrome,dependent,titlebar,toolbar,alwaysRaised,centerscreen,dialog=no", 
														 "paneSecurity");
				}
        break;
      case 'SeaMonkey':
        let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                 .getService(Components.interfaces.nsIWindowMediator),
            win = wm.getMostRecentWindow("navigator:browser") ||
             wm.getMostRecentWindow("mail:3pane") ||
             wm.getMostRecentWindow("mail:messageWindow") ||
             wm.getMostRecentWindow("msgcompose");
        if (typeof win.goPreferences == "function") {
          win.goPreferences('masterpass_pane');
        }
        break;
      case 'Postbox':
        prefURI = "chrome://messenger/content/preferences/preferences.xul";
        dialog = window.openDialog(prefURI, 
                           "Preferences",
                           "chrome,dependent,titlebar,toolbar,alwaysRaised,centerscreen,dialog=no", 
                           "panePrivacy"
                           );
        break;
      case 'Thunderbird': 
        prefURI = "chrome://messenger/content/preferences/preferences.xul";
        dialog = window.openDialog(prefURI, 
                           "Preferences",
                           "chrome,dependent,titlebar,toolbar,alwaysRaised,centerscreen,dialog=no", 
                           "paneSecurity", 
                           "passwordsTab"  // Thunderbird has no name for this tab yet, so this will not work until this bug is fixed.
                           );
        break;
    }
    if (util.Application!='SeaMonkey') {
			// show security options and highlight master password
			
			let highlightMasterPasswords = function quickPasswords_highlightMaster() {
				const prefs = QuickPasswords.Preferences;
				util.logDebugOptional("Manager", "useMasterPassword...");
				let doc =
					isContentTabOnly || !dialog
						? QuickPasswords.getCurrentBrowserWindow().content.document
						: dialog.document;
				if (doc && doc.readyState!='complete') { // we are not ready yet
					doc.defaultView.setTimeout(highlightMasterPasswords, 100);
					return;
				}
				let chkMasterPassword = doc.getElementById('useMasterPassword'),
						container = chkMasterPassword.parentNode;
				if (!container || container.tagName != 'hbox') 
					container = chkMasterPassword;
				
				util.logDebugOptional("Manager", "useMasterPassword: " + chkMasterPassword);
				chkMasterPassword.style.color = "#FFFFFF";
				container.style.backgroundColor = "#CC0000";
				let bgStyle = (util.Application=='Postbox')  ?
											"-moz-linear-gradient(top, rgba(255,191,191,1) 0%,rgba(214,79,79,1) 30%,rgba(144,11,2,1) 51%,rgba(110,7,0,1) 100%)" :
											"linear-gradient(to bottom, rgba(255,191,191,1) 0%,rgba(214,79,79,1) 30%,rgba(144,11,2,1) 51%,rgba(110,7,0,1) 100%)";
				container.style.backgroundImage = bgStyle;
				container.style.borderColor = "#FFFFFF";
				if (dialog) {
				  // select the correct tab in dialog:
					if (util.Application == 'Thunderbird')
						QuickPasswords.Manager.openPasswordsTab(dialog.window, chkMasterPassword);
					dialog.window.focus();				
				}
			}
			
			if (isContentTabOnly)
				QuickPasswords.getCurrentBrowserWindow().setTimeout(highlightMasterPasswords, 100);
			else
				dialog.window.addEventListener('load',
					function() { dialog.window.setTimeout( highlightMasterPasswords, 100);}, true );
    }
    
    return dialog;    
  } ,
  
  protectPasswordManager: function protectPasswordManager(checkbox) {
    const util = QuickPasswords.Util,
          manager = QuickPasswords.Manager,
					prefs = QuickPasswords.Preferences;
		if (prefs.isDebugOption("Manager.protection")) debugger;			
    if (!manager.isMasterPasswordActive) {
      let txtAlert;
      try {
        txtAlert = QuickPasswords.Bundle.GetStringFromName("alertSetupMasterPassword");
      }
      catch(ex) {
        txtAlert = 'To protect your passwords, set up a master password first.';
      }
      util.alert(txtAlert);
      let dialog  = manager.createMasterPassword();
      if (dialog && util.Application!='SeaMonkey') {      
        // update the style of protection button accordingly:
        dialog.window.addEventListener('close', manager.initProtectionButton, false);
      }
    }
    else {
      let toggleProtect = checkbox.checked,
          pref = document.getElementById('quickpasswords_protectOnClose');
      prefs.service.setBoolPref(pref.name, toggleProtect);
    }
  } ,
  
  keyListener: function keyListener(evt) {
    if (event.keyCode && event.keyCode  == 13) {
      return;
    }
  },
  
  initProtectionButton: function initProtectionButton() {
    const util = QuickPasswords.Util;
    // disable the security checkbox (Master Password) if no master password is USED:
    let isProtected = QuickPasswords.Manager.isMasterPasswordActive;
    util.logDebugOptional("Manager", "initProtectionButton() - protection = " + isProtected );
    let cbProtect = document.getElementById('quickPasswordsLockAfterClosing');
    if (cbProtect) {
      if (!isProtected) {
        // no masterpassword is set at the moment - need to change behavior
        util.classListToggle(cbProtect, 'disabled', true);
      }
      else {
        util.classListToggle(cbProtect, 'disabled', false);
        // now make sure the checked state is set correctly
        // let isSessionProtected = false;
        let chk = document.getElementById('quickpasswords_protectOnClose');
      }
    }
    return cbProtect;
  } ,
  
  isElementInViewport: function isElementInViewport(el) {
    let rect = el.getBoundingClientRect();
    QuickPasswords.Util.logDebug('rect: ' + rect.top + ', ' + rect.left + ', ' + rect.bottom + ', ' + rect.right);
    return (rect.top < rect.bottom && rect.left < rect.right);
  } ,
  
  updateButtons: function updateButtons() {
    function enableItem(item) {
      elem(item).removeAttribute("disabled");
    }
    function disableItem(item) {
      elem(item).setAttribute("disabled", "true");
    }
    let elem = document.getElementById.bind(document),
		    signonsTreeView = elem("signonsTree").view;
    if (signonsTreeView.selection.count > 1) {
      disableItem('QuickPasswordsBtnLogin');
      disableItem('QuickPasswordsBtnCopyPassword');
      disableItem('QuickPasswordsBtnCopyUser');
      disableItem('QuickPasswordsBtnCopyURI');
      disableItem('QuickPasswordsBtnRepair');
    }
    enableItem('context-quickPasswordOptions');
    if (signonsTreeView.selection.count == 1) {
			if (QuickPasswords.PasswordManagerWindow) {
				// only allow these functions from XUL window!
				enableItem('QuickPasswordsBtnLogin');
				enableItem('QuickPasswordsBtnRepair');
			}
      enableItem('QuickPasswordsBtnCopyPassword');
      enableItem('QuickPasswordsBtnCopyUser');
      enableItem('QuickPasswordsBtnCopyURI');
    }   
  } ,
  
  load: function load() {
    const prefs = QuickPasswords.Preferences,
          util = QuickPasswords.Util;
    if (prefs.isDebug) debugger;
    util.logDebugOptional("Manager", "QuickPasswords.Manager.init()");
    // wrap the context menu update function
    // http://mxr.mozilla.org/mozilla-central/source/toolkit/components/passwordmgr/content/passwordManager.js#396
    let OriginalUpdateFunction = 
      (typeof UpdateContextMenu != 'undefined') ? UpdateContextMenu :
      ((typeof UpdateCopyPassword  != 'undefined') ? UpdateCopyPassword : null);
    
    let signonsTree = document.getElementById("signonsTree");
    if (OriginalUpdateFunction && !QuickPasswords.UpdateContextMenu_Orig) {
      QuickPasswords.UpdateContextMenu_Orig = OriginalUpdateFunction; // backup original update function
      // this will make sure the correct items are enabled again.
      let wrapperFunction = function() {
        function enableItem(item) {
          elem(item).removeAttribute("disabled");
        }
        function disableItem(item) {
          elem(item).setAttribute("disabled", "true");
        }
        QuickPasswords.UpdateContextMenu_Orig();
        // now undo the damage:
        if (prefs.isDebug) debugger;
        let elem = document.getElementById.bind(document),
				    signonsTreeView = signonsTree.view;
        enableItem('context-quickPasswordOptions');
        if (signonsTreeView.selection.count > 1) {
          enableItem('context-copyPasswordRecord');
        }
        if (signonsTreeView.selection.count == 1) {
          enableItem('context-copyPasswordRecord');
          enableItem('context-copyusername');
          enableItem('context-copyUrl');
          enableItem('context-copypassword');
          enableItem('context-quickPasswordChange');
        }
      }
      if (typeof UpdateContextMenu == 'function') UpdateContextMenu = wrapperFunction;  // Firefox
      if (typeof UpdateCopyPassword == 'function') UpdateCopyPassword = wrapperFunction; // Thunderbird, Suite
    }
		
		// when shown in tab, disable the login and SSO change functions!
		if (!QuickPasswords.PasswordManagerWindow) {
			document.getElementById('QuickPasswordsBtnLogin').setAttribute("disabled", "true");
			document.getElementById('QuickPasswordsBtnChangePasswords').setAttribute("disabled", "true");
			document.getElementById('QuickPasswordsBtnRepair').setAttribute("disabled", "true");
		}
    
    if (signonsTree) {
      util.logDebugOptional("Manager", "Adding event listeners to signonsTree");
      // double click
      signonsTree.addEventListener("dblclick", 
        function(evt) { 
          util.logDebugOptional("default", "doubleclick event:\n" + evt.toString());
          // do login...
          QuickPasswords.attemptLogin(true);
          evt.preventDefault();
          evt.stopPropagation();
          }, false);  
      // Enter key
      signonsTree.addEventListener('keypress', 
        function(evt) {
          if (evt.keyCode && evt.keyCode  == 13) {
            util.logDebugOptional("default", "Enter Key was pressed:\n" + evt.toString());
            // do login...
            QuickPasswords.attemptLogin(true);
            evt.preventDefault();
            evt.stopPropagation();
          }         
        }, false);
      signonsTree.addEventListener('select', 
        function(evt) {
          setTimeout(QuickPasswords.Manager.updateButtons, 100);
        }, false);
    }
    // move the wizard Button before the "Search" label
    // where it logically belongs
    if (prefs.getBoolPref("wizardAbove")) {
      let filter = document.getElementById("filter");
      if (filter) {
        let wizardBtn = document.getElementById("quickPasswordsUriFilterRefiner");
        let par = filter.parentNode;
        if (wizardBtn)
          par.insertBefore(wizardBtn, par.firstChild); // before the label
      }
    }
		
		if (util.checkIsMasterLocked) {
			let lock = document.getElementById('quickPasswordsLockAfterClosing');
			lock.checked = true;
			lock.disabled = true; // you can't unlock password from here!
		}
    
    let cbProtect = this.initProtectionButton(),
        // get container for close button
        actions = document.documentElement.getElementsByClassName('actionButtons'),
        nodes = actions[0].getElementsByTagName('button'),
        isCloseButton = false;
        
    for (let i=0; i<nodes.length; i++) {
      let button = nodes[i];
      if (button.getAttribute('oncommand') == 'close();'
          ||
          button.getAttribute('icon') == 'close')
      {
        if (button.collapsed
          ||
            !this.isElementInViewport(button)) break;  // in case Close is hidden
        
        util.logDebug('Close button found - move lock button before it...');
        isCloseButton = true;
        // make sure we check protection code when close button is used!
        // (this doesn't trigger window's close event)
        button.addEventListener("click", 
            function(evt) { QuickPasswords.Manager.close();}, 
            false);
        // .. and move the protection icon before the close button
        let pr = button.parentNode;
        pr.insertBefore(cbProtect, button); // before the label
        break; // done
      }  
    }
    // Mac case - no close button - insert before the [Show Passwords] button instead:
    if (!isCloseButton) {
      util.logDebug('No close button - move lock button before show pwd');
      let button = document.getElementById('togglePasswords');
      if (button) {
        let pr = button.parentNode;
        pr.insertBefore(cbProtect, button); // before the label
      }
      else
        util.logDebug('No togglePasswords button found!');      
    }
    
    QuickPasswords.prepareAustralis(window.document, prefs.getBoolPref('skin.australis'));
    if (util.Application=='Postbox') {
      let repairBtn = document.getElementById('QuickPasswordsBtnRepair');
      if (repairBtn) repairBtn.collapsed = true;
    }
  } ,
  
  get isMasterPasswordActive() {
		try {
			// XPCOMUtils.defineLazyModuleGetter(this, "LoginHelper", "resource://gre/modules/LoginHelper.jsm");
			const {LoginHelper} = Components.utils.import("resource://gre/modules/LoginHelper.jsm");
			let isMpSet = LoginHelper.isMasterPasswordSet();
			return isMpSet;
		}
		catch (ex) {;}					
					
    // code from browser/components/preferences/security.js - _masterPasswordSet()
    const Ci = Components.interfaces,
          Cc = Components.classes;
    let secmodDB = Cc["@mozilla.org/security/pkcs11moduledb;1"].getService(Ci.nsIPKCS11ModuleDB),
        slot = secmodDB.findSlotByName("");
    if (slot) {
      let status = slot.status,
          hasMP = status != Ci.nsIPKCS11Slot.SLOT_UNINITIALIZED &&
                  status != Ci.nsIPKCS11Slot.SLOT_READY;
      return hasMP;
    } else {
      return false;
    }
 } ,
    
  close: function close() {
		if (QuickPasswords.Preferences.isDebugOption("Manager.protection")) debugger;			
    if (!this.isMasterPasswordActive)
      return;
    let cbProtect = document.getElementById('quickPasswordsLockAfterClosing');
    if (cbProtect) {
      if (cbProtect.checked) {
        this.logoutMaster();
      }  
    }
  } 
  

}

