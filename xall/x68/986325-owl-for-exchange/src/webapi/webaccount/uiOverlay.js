/**
 * A list of paths to elements that we want to hide in the server page.
 * These elements are typically specific to IMAP, NNTP or POP.
 * Paths are used because not all of the elements have ids.
 */
var gHideElementsForJsAccount = [
    // Server port
    ["fixedServerPort", "previousElementSibling"],
    ["fixedServerPort"],
    ["server.port"],
    ["defaultPort", "previousElementSibling"],
    ["defaultPort"],
    // Security settings
    ["server.socketType"],
    ["server.socketType", "parentElement", "parentElement", "firstElementChild", "firstElementChild"],
    // Push notifications (IMAP)
    ["imap.useIdle", "parentElement"],
    // Download messages (POP)
    ["server.downloadOnBiff", "parentElement"],
    ["pop3.headersOnly", "parentElement"],
    ["pop3.deferGetNewMail", "parentElement"],
    // Delete model (IMAP)
    ["imap.deleteModel.box", "parentElement", "previousElementSibling"],
    ["imap.deleteModel.box"],
    // Advanced (IMAP)
    ["server.imapAdvancedButton"],
    ["imap.dualUseFolders", "parentElement"],
    // Download message limit (NNTP)
    ["nntp.notifyOn", "parentElement"],
    // Always authenticate (NNTP)
    ["nntp.pushAuth"],
    // Compact inbox on exit (IMAP)
    ["imap.cleanupInboxOnExit"],
    // Empty trash on exit
    ["server.emptyTrashOnExit"],
    // Advanced (POP)
    ["server.popAdvancedButton"],
    // newsrc file (NNTP)
    ["nntp.newsrcFilePath", "parentElement", "parentElement"],
    // Default charset (NNTP)
    ["nntp.charset", "parentElement"],
];

async function overlayListener(aDocument)
{
  try {
    if (aDocument.documentURI == "chrome://messenger/content/am-server.xul") {
      let enableGAL = aDocument.createElementNS(aDocument.documentElement.namespaceURI, "checkbox");
      enableGAL.id = "server.GAL_enabled";
      enableGAL.setAttribute("hidefor", "pop3,imap,nntp,movemail");
      enableGAL.setAttribute("wsm_persist", "true");
      enableGAL.setAttribute("preftype", "bool");
      enableGAL.setAttribute("prefattribute", "checked");
      enableGAL.setAttribute("prefstring", "mail.server.%serverkey%.GAL_enabled");
      enableGAL.setAttribute("genericattr", "true");
      let insertPoint = aDocument.getElementById("imap.trashFolderName");
      insertPoint.parentElement.insertBefore(enableGAL, insertPoint);

      let window = aDocument.defaultView;
      let onInit = window.onInit;
      window.onInit = async function(aPageId, aServerId) {
        let authPopup = aDocument.getElementById("server.authMethodPopup");
        // We might be switching from our account to another account type.
        // Hide all of our custom menuitems and show the default items.
        // onInit will hide them again as appropriate.
        authPopup.parentElement.disabled = false;
        for (let menuitem of authPopup.children) {
          menuitem.hidden = menuitem.value > 10;
        }
        onInit(aPageId, aServerId);
        let serverType = aDocument.getElementById("server.type").getAttribute("value");
        if (!gSchemeOptions.has(serverType)) {
          return;
        }
        aDocument.getElementById("server.storeTypeMenulist").setAttribute("disabled", "true");
        let { authMethods } = gSchemeOptions.get(serverType);
        if (authMethods) {
          authPopup.parentElement.disabled = authMethods.length < 2;
          for (let menuitem of authPopup.children) {
            menuitem.hidden = true;
          }
          let insertBefore = authPopup.firstElementChild;
          for (let authMethod of authMethods) {
            let label = await CallExtension({ type: serverType }, "GetString", { bundleName: "owl", id: "authMethod" + authMethod });
            let menuitem = authPopup.getElementsByAttribute("value", authMethod)[0];
            if (menuitem) {
              menuitem.setAttribute("label", label);
              menuitem.hidden = false;
              insertBefore = menuitem.nextElementSibling;
            } else {
              menuitem = authPopup.parentElement.appendItem(label, authMethod);
              authPopup.insertBefore(menuitem, insertBefore);
            }
          }
        }

        if (!enableGAL.hidden && !enableGAL.label) {
          enableGAL.label = await CallExtension({ type: serverType }, "GetString", { bundleName: "owl", id: "enableGAL" });
        }
      };
      let initServerType = window.initServerType;
      window.initServerType = function() {
        let serverType = aDocument.getElementById("server.type").getAttribute("value");
        // If this is one of our server types then we need to set the text for it.
        if (gDispatchListeners.has(serverType)) {
          window.setDivText("servertype.verbose", serverType);
        } else {
          initServerType();
        }
      };
      // Tell Thunderbird that we don't want these UI elements for our accounts.
      // We do this by setting hidefor attributes because
      // the page could get reused if the user switches between server pages.
      let hidefor = [...gSchemeOptions.keys()].join();
      for (let path of gHideElementsForJsAccount) {
        let element = aDocument.getElementById(path[0]);
        for (let relative of path.slice(1)) {
          element = element[relative];
        }
        if (!element) {
          console.log("path failed", path);
          continue;
        }
        if (element.hasAttribute("hidefor")) {
          element.setAttribute("hidefor", element.getAttribute("hidefor") + "," + hidefor);
        } else {
          element.setAttribute("hidefor", hidefor);
        }
      }
      for (let [scheme, {extraHiddenItems = []}] of gSchemeOptions) {
        for (let path of extraHiddenItems) {
          let element = aDocument.getElementById(path[0]);
          for (let relative of path.slice(1)) {
            element = element[relative];
          }
          if (element.hasAttribute("hidefor")) {
            element.setAttribute("hidefor", element.getAttribute("hidefor") + "," + scheme);
          } else {
            element.setAttribute("hidefor", scheme);
          }
        }
      }
    } else if (aDocument.documentURI == "chrome://messenger/content/am-main.xul") {
      let window = aDocument.defaultView;
      let onPreInit = window.onPreInit;
      window.onPreInit = function(account, accountValues) {
        let type = window.parent.getAccountValue(account, accountValues, "server", "type", null, false);
        let element = aDocument.getElementById("identity.smtpServerKey").parentElement;
        element.hidden = element.previousElementSibling.hidden = gSchemeOptions.has(type);
        onPreInit(account, accountValues);
      };
    } else if (aDocument.documentURI == "chrome://messenger/content/am-copies.xul" ||
        aDocument.documentURI == "chrome://messenger/content/am-identity-edit.xul") {
      let window = aDocument.defaultView;
      let setupFccItems = window.setupFccItems;
      window.setupFccItems = function() {
        let serverType = window.gAccount.incomingServer.type;
        let msgFccFolderPopup = aDocument.getElementById("msgFccFolderPopup");
        if (gSchemeOptions.has(serverType)) {
          msgFccFolderPopup.parentFolder = window.gAccount.incomingServer.rootFolder;
          msgFccFolderPopup._teardown();
          msgFccFolderPopup._ensureInitialized();
          msgFccFolderPopup.selectFolder(msgFccFolderPopup.parentNode.folder);
          let {sentFolder = "sameServer"} = gSchemeOptions.get(serverType);
          aDocument.getElementById("identity.doFcc").disabled = true;
          aDocument.getElementById("identity.doFcc").checked = true;
          if (aDocument.getElementById("broadcaster_doFcc")) {
            aDocument.getElementById("broadcaster_doFcc").setAttribute("disabled", "true"); // COMPAT for TB 60 (bug 1512884)
          } else {
            for (let element of aDocument.querySelectorAll(".depends-on-do-fcc")) {
              element.setAttribute("disabled", true);
            }
          }
          let disablePicker = sentFolder == "SentMail" || !aDocument.getElementById("identity.doFcc").checked;
          msgFccFolderPopup.parentNode.disabled = disablePicker;
          aDocument.getElementById("fcc_selectFolder").disabled = disablePicker;
          aDocument.getElementById("identity.fccReplyFollowsParent").disabled = disablePicker;
        } else {
          if (msgFccFolderPopup.parentFolder) {
            msgFccFolderPopup.parentFolder = null;
            msgFccFolderPopup._teardown();
            msgFccFolderPopup._ensureInitialized();
            msgFccFolderPopup.selectFolder(msgFccFolderPopup.parentNode.folder);
          }
          if (aDocument.getElementById("broadcaster_doFcc")) {
            aDocument.getElementById("broadcaster_doFcc").removeAttribute("disabled"); // COMPAT for TB 60 (bug 1512884)
          } else {
            for (let element of aDocument.querySelectorAll(".depends-on-do-fcc")) {
              element.removeAttribute("disabled");
            }
          }
          aDocument.getElementById("identity.doFcc").disabled = false;
          aDocument.getElementById("identity.fccReplyFollowsParent").disabled = false;
          setupFccItems();
        }
      };
    } else if (/^chrome:\/\/messenger\/content\/addressbook\/ab((Edit|New)Card|(Edit|Mail)List)Dialog\.xul$/.test(aDocument.documentURI)) {
      aDocument.defaultView.GetDirectoryFromURI = function(aURI) {
        let directory = MailServices.ab.getDirectory(aURI);
        if (gAddressBooksMarkedAsReadOnly.has(directory.UID)) {
          directory = new Proxy(directory, {
            get(directory, property) {
              return property == "readOnly" ? true : directory[property];
            },
          });
        }
        return directory;
      };
    } else if (aDocument.documentURI == "about:preferences" ||
        aDocument.documentURI == "chrome://messenger/content/AccountManager.xul") { // COMPAT for TB 60 (bug 1096006)
      let window = aDocument.defaultView;
      if (!window.gAccountTree) { // COMPAT for TB 60 (bug 1096006)
        return;
      }
      let _build = window.gAccountTree._build;
      window.gAccountTree._build = function at_build() {
        _build.call(window.gAccountTree);
        // Now remove the Junk pane for all of our servers.
        // Also remove the Return Receipts and Security panes.
        // There are other ways of removing those panes, but
        // as we have to remove Junk anyway, we'll just remove them too.
        let mainTree = aDocument.getElementById("account-tree-children");
        for (let treeitem of mainTree.children) {
          let account = treeitem._account;
          // Outgoing Server doens't have an account object.
          if (account && gDispatchListeners.has(account.incomingServer.type)) {
            let treekids = treeitem.lastElementChild;
            // Direct iteration won't work because we're mutating the DOM.
            // Convert the child node list into an array and iterate that instead.
            for (let panel of [...treekids.children]) {
              switch (panel.getAttribute("PageTag")) {
              case "am-junk.xul":
              case "am-mdn.xul":
              case "am-smime.xul":
                panel.remove();
              }
            }
          }
        }
      };
    }
  } catch (ex) {
    logError(ex);
  }
}

Services.obs.addObserver(overlayListener, "chrome-document-interactive");

let folderListener = {
  // Focus the Inbox in the UI as soon as it becomes available
  OnItemIntPropertyChanged: async function(aMsgFolder, aProperty, aOldValue, aNewValue) {
    // Other flags may get set at the same time so check that
    // the new flags includes Inbox and the old flags does not.
    if (aProperty == "FolderFlag" && (aNewValue & Ci.nsMsgFolderFlags.Inbox) && !(aOldValue & Ci.nsMsgFolderFlags.Inbox)) {
      await Promise.resolve(); // async equivalent to executeSoon()
      // We only need to change the selected folder in one window.
      let mail3Pane = Services.wm.getMostRecentWindow("mail:3pane");
      if (mail3Pane) {
        mail3Pane.gFolderTreeView.selectFolder(aMsgFolder);
      }
    }
  },
};

MailServices.mailSession.AddFolderListener(folderListener, Ci.nsIFolderListener.intPropertyChanged);

// Override the return receipts and security extensions to ignore us.
function PaneOverride(aProperties) {
  // Work around removal of Components.classesById in Gecko 65. After an
  // upgrade or reinstall we want to override the original service and not
  // our previous override of the service, and this can now only be achieved
  // by temporarily restoring its original contract ID registration.
  gComponentRegistrar.registerFactory(aProperties.baseClassID, null, aProperties.contractID, null);
  this.originalService = Components.classes[aProperties.contractID].getService(Ci.nsIMsgAccountManagerExtension);
  this.name = this.originalService.name;
  this.chromePackageName = this.originalService.chromePackageName;
}

PaneOverride.prototype = {
  QueryInterface: QIUtils.generateQI([Ci.nsIFactory, Ci.nsIMsgAccountManagerExtension]),
  // nsIFactory
  createInstance: function(aOuter, aIID) {
    if (aOuter) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(aIID);
  },
  // nsIMsgAccountManagerExtension
  showPanel: function(aServer) {
    return !gDispatchListeners.has(aServer.type) && this.originalService.showPanel(aServer);
  },
};

var gMDNProperties = {
  baseClassID: Components.ID("{e007d92e-1dd1-11b2-a61e-dc962c9b8571}"),
  contractID: "@mozilla.org/accountmanager/extension;1?name=mdn",
  classDescription: "Return Receipts Pane Override",
  classID: Components.ID("{3e1bdaf4-b609-409c-b8ed-28ad99ef35c3}"),
};

gMDNProperties.factory = new PaneOverride(gMDNProperties);
RegisterFactory(gMDNProperties, true);

var gSMimeProperties = {
  baseClassID: Components.ID("{f2809796-1dd1-11b2-8c1b-8f15f007c699}"),
  contractID: "@mozilla.org/accountmanager/extension;1?name=smime",
  classDescription: "Security Pane Override",
  classID: Components.ID("{d79318b7-f2b1-4a7f-944b-a8341f8a8a2e}"),
};

gSMimeProperties.factory = new PaneOverride(gSMimeProperties);
RegisterFactory(gSMimeProperties, true);
