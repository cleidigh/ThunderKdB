if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

Components.utils.import("chrome://contacttabs/content/cotaTabUtils.js",
                       contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaClipboardManager.js",
                       contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaStorage.js",
                        contacttabs);

//
// Inspired by/taken from/stolen from Thunderbird's specialTabs.js
//
contacttabs.CardViewTabType = {
    prefsBranchName: "extensions.org.janek.cota.",
    name: 'cota-cardViewTab',
    perTabPanel: "vbox",
    lastBrowserId: 0,
    get loadingTabString() {
      delete this.loadingTabString;
      return this.loadingTabString = document.getElementById("bundle_messenger")
                                             .getString("loadingTab");
    },
    modes: {
      'cota-cardViewTab': {
        type: 'cota-cardViewTab',
        maxTabs: 10
      }
    },
  shouldSwitchTo: function onSwitchTo({localStorageId: aLocalStorageId,
                                       mode: aMode}) {
    var tabmail = document.getElementById("tabmail");
    var tabInfo = tabmail.tabInfo;

    var cotaPrefs =
      Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch(this.prefsBranchName);
    cotaPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    for (var selectedIndex = 0;
           selectedIndex < tabInfo.length;
           ++selectedIndex) {

        if(tabInfo[selectedIndex].browser)
          {
            var cardViewBox =
              tabInfo[selectedIndex].browser.contentDocument.getElementById("CardViewBox");
            var localStorageId = (cardViewBox == null) ? null : cardViewBox.getAttribute("LocalStorageId");

            if (tabInfo[selectedIndex].mode.name == this.name &&
                localStorageId == aLocalStorageId) {

              // Refresh the browser to make sure that the latest contact info
              // is displayed.
              if(aMode == 'edit-contact' ||
                 aMode == 'create-new-contact') {
                this.loadCardEditorXul(tabInfo[selectedIndex]);
              }
              else {
                tabInfo[selectedIndex].browser.reload();
              }

              return selectedIndex;
            }
            else if(tabInfo[selectedIndex].mode.name == this.name &&
                    !cotaPrefs.getBoolPref("useMultiTabMode")) {
              this.loadCardView(tabInfo[selectedIndex], aLocalStorageId);

              return selectedIndex;
            }
          }
      }
      return -1;
    },
    openTab: function onTabOpened(aTab, aArgs) {
      if (!("localStorageId" in aArgs) &&
          !("mode" in aArgs)) {
        throw("localStorageId or mode must be specified");
      }

      // First clone the page and set up the basics.
      var clone = document.getElementById("cota-tab").firstChild.cloneNode(true);
      clone.setAttribute("collapsed", false);

      aTab.panel.appendChild(clone);

      // Start setting up the browser.
      aTab.browser = aTab.panel.getElementsByTagName("browser")[0];

      // Now set up the listeners.
      this._setUpTitleListener(aTab);
      this._setUpCloseWindowListener(aTab);

      if (aArgs.mode == 'create-new-contact' ||
          aArgs.mode == 'edit-contact') {
        if(aArgs.localStorageId) {
          aTab.browser.setUserData("LocalStorageId", aArgs.localStorageId, null);
        }
        if(aArgs.primaryemail) {
          aTab.browser.setUserData("PrimaryEmail", aArgs.primaryemail, null);
        }

        var loadListener = function (event) {
          if(aArgs.localStorageId) {
            // After the XUL is loaded we register the LocalStorageId as ID
            // at the CardViewBox element.
            var cardViewBox =
              aTab.browser.contentDocument.getElementById("CardViewBox");
            cardViewBox.setAttribute("LocalStorageId", aArgs.localStorageId);
          }

          if(aArgs.primaryemail) {
            // After the XUL is loaded we register the PrimaryEmail
            // at the CardViewBox element.
            var cardViewBox =
              aTab.browser.contentDocument.getElementById("CardViewBox");
            cardViewBox.setAttribute("PrimaryEmail", aArgs.primaryemail);
          }

          specialTabs.setTabIcon(
            aTab,
            'chrome://messenger/skin/addressbook/icons/contact-generic.png');
        };
        aTab.browser.addEventListener("load",
                                      loadListener,
                                      true);

        // Now start loading the content.
        aTab.title = this.loadingTabString;
        this.loadCardEditorXul(aTab);
      }
      else if (aArgs.localStorageId) {
        this.loadCardView(aTab, aArgs.localStorageId);
      }

      this.lastBrowserId++;
    },

  loadCardView: function onCardViewLoaded(aTab, aLocalStorageId) {
      var localStorageId = aLocalStorageId;
      aTab.browser.setUserData("LocalStorageId", localStorageId, null);

      var loadListener = function (event) {
        // After the XUL is loaded we register the LocalStorageId as ID
        // at the CardViewBox element.
        var cardViewBox = aTab.browser.contentDocument.getElementById("CardViewBox");
        cardViewBox.setAttribute("LocalStorageId", localStorageId);

        specialTabs.setTabIcon(
          aTab,
          'chrome://messenger/skin/addressbook/icons/contact-generic.png');
      };
      aTab.browser.addEventListener("load",
                                    loadListener,
                                    true);

      // Now start loading the content.
      aTab.title = this.loadingTabString;
      this.loadCardViewXul(aTab);
    },

    loadCardViewXul: function onCardViewXulLoaded(aTab) {
      var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULAppInfo);
      var versionComparator =
        Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator);

      if(versionComparator.compare(xulAppInfo.version, "15.0") >= 0) {
        aTab.browser.loadURI("chrome://contacttabs/content/cotaCardView15.xul");
      }
      else {
        aTab.browser.loadURI("chrome://contacttabs/content/cotaCardView.xul");
      }
    },

    loadCardEditorXul: function onCardEditorXulLoaded(aTab) {
      var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULAppInfo);
      var versionComparator =
        Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator);

      var cotaPrefs =
        Components.classes["@mozilla.org/preferences-service;1"]
                  .getService(Components.interfaces.nsIPrefService)
                  .getBranch(this.prefsBranchName);
      cotaPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);

      if(versionComparator.compare(xulAppInfo.version, "15.0") >= 0) {
        var colMode = cotaPrefs.getCharPref("cotaCardEditorLayout");
        aTab.browser.loadURI("chrome://contacttabs/content/cotaCardEditor15" +
                       colMode + ".xul");
      }
      else {
        aTab.browser.loadURI("chrome://contacttabs/content/cotaCardEditor.xul");
      }
    },

    closeTab: function onTabClosed(aTab) {
      try {
        aTab.browser.removeEventListener("DOMTitleChanged",
                                         aTab.titleListener, true);
        aTab.browser.removeEventListener("DOMWindowClose",
                                         aTab.closeListener, true);

        //
        // extISessionStorage does not provide an interface for
        // completely removing data. The only thing we can do is to set the
        // key to null.
        //
        var localStorageId = aTab.browser.getUserData("LocalStorageId");
        if(localStorageId) {
          contacttabs.cotaStorage.set(localStorageId, null);
          aTab.browser.setUserData("LocalStorageId", null, null);
        }
      } catch (e) {
        logException(e);
      }
    },
    saveTabState: function onSaveTabState(aTab) {
    },
    showTab: function onShowTab(aTab) {
    },
    persistTab: function onPersistTab(aTab) {
      if (aTab.browser.currentURI.spec == "about:blank") {
        return null;
      }

      var cardViewBox = aTab.browser.contentDocument.getElementById("CardViewBox");
      var localStorageId = aTab.browser.getUserData("LocalStorageId");
      var cardAbookTuple = contacttabs.cotaStorage.get(localStorageId, null);

      if(cardAbookTuple == null) {
        return null;
      }

      var cardUuid = cardAbookTuple.card.uuid;
      var abookUri = null;

      if(cardAbookTuple.abook) {
        abookUri = cardAbookTuple.abook.URI;
      }

      return {
        cardUuid: cardUuid,
        abookUri: abookUri
      };
    },
    restoreTab: function onRestoreTab(aTabmail, aPersistedState) {
      var cardUuid = aPersistedState.cardUuid;
      var abookUri = aPersistedState.abookUri;

      var abManager = Components.classes["@mozilla.org/abmanager;1"]
        .getService(Components.interfaces.nsIAbManager);
      var abook = abManager.getDirectory(abookUri);

      var allCards = abook.childCards;
      while(allCards.hasMoreElements()) {
        var card = allCards.getNext();

        if (card instanceof Components.interfaces.nsIAbCard &&
            card.isMailList == false) {
          if(card.uuid == cardUuid) {
            var localStorageId = card.uuid + '/' + card.directoryId;
            contacttabs.cotaStorage.set(localStorageId,
                                    { card: card,
                                      abook: abook });

            aTabmail.openTab('cota-cardViewTab', {
              localStorageId: localStorageId,
              background: true
            });
          }
        }
      }
    },
    onTitleChanged: function onTitleChanged(aTab) {
      aTab.title = aTab.browser.contentDocument.title;
    },
    supportsCommand: function supportsCommand(aCommand, aTab) {
      switch (aCommand) {
        case "cmd_copy":
        case "cmd_fullZoomReduce":
        case "cmd_fullZoomEnlarge":
        case "cmd_fullZoomReset":
        case "cmd_fullZoomToggle":
        case "cmd_printSetup":
        case "cmd_print":
        case "button_print":
        case "cmd_printpreview":
          return true;
        default:
          return false;
      }
    },
    isCommandEnabled: function isCommandEnabled(aCommand, aTab) {
      switch (aCommand) {
        case "cmd_copy":
        case "cmd_fullZoomReduce":
        case "cmd_fullZoomEnlarge":
        case "cmd_fullZoomReset":
        case "cmd_fullZoomToggle":
        case "cmd_printSetup":
        case "cmd_print":
        case "button_print":
        case "cmd_printpreview":
          return true;
        default:
          return false;
      }
    },
    doCommand: function isCommandEnabled(aCommand, aTab) {
      switch (aCommand) {
        case "cmd_copy":
          const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);

          if (gClipboardHelper &&
              aTab.browser.contentWindow.getSelection().toString().length > 0) {
            gClipboardHelper.copyString(aTab.browser.contentWindow.getSelection());
          }
          else if(gClipboardHelper) {
            var localStorageId =
              contacttabs.TabUtils.getLocalStorageId(document, window);
            var cardAbookTuple = contacttabs.cotaStorage.get(localStorageId, null);
            if(cardAbookTuple != null) {
              var card = cardAbookTuple.card;

              contacttabs.ClipboardManager.copyToClipboard(
                card,
                aTab.browser.contentDocument);
            }
          }
          break;
        case "cmd_fullZoomReduce":
          ZoomManager.reduce();
          break;
        case "cmd_fullZoomEnlarge":
          ZoomManager.enlarge();
          break;
        case "cmd_fullZoomReset":
          ZoomManager.reset();
          break;
        case "cmd_fullZoomToggle":
          ZoomManager.toggleZoom();
          break;
        case "cmd_printSetup":
          PrintUtils.showPageSetup();
          break;
        case "cmd_print":
          contacttabs.CardViewTabType.printPreviewCard(
            aTab,
            false,
            Components.interfaces.nsIMsgPrintEngine.MNAB_PRINT_AB_CARD);
          break;
        case "cmd_printpreview":
          contacttabs.CardViewTabType.printPreviewCard(
            aTab,
            true,
            Components.interfaces.nsIMsgPrintEngine.MNAB_PRINTPREVIEW_AB_CARD);
          break;
      }
    },

    printPreviewCard: function (aTab, doPrintPreview, msgType) {
      var localStorageId = aTab.browser.getUserData("LocalStorageId");
      var cardAbookTuple = contacttabs.cotaStorage.get(localStorageId, null);

      if(cardAbookTuple == null) {
        return null;
      }

      var card = cardAbookTuple.card;

      var statusFeedback =
        Components.classes["@mozilla.org/messenger/statusfeedback;1"].createInstance();
      statusFeedback =
        statusFeedback.QueryInterface(Components.interfaces.nsIMsgStatusFeedback);

      var selectionArray = new Array(1);
      var printCardUrl =
        "data:application/xml;base64," + card.translateTo("base64xml");

      selectionArray[0] = printCardUrl;

      var printEngineWindow =
        window.openDialog("chrome://messenger/content/msgPrintEngine.xul",
                          "",
                          "chrome,dialog=no,all",
                          1,
                          selectionArray,
                          statusFeedback,
                          doPrintPreview,
                          msgType);

      return true;
    },
    getBrowser: function getBrowser(aTab) {
      return aTab.browser;
    },
    // Internal function used to set up the title listener on a content tab.
    _setUpTitleListener: function setUpTitleListener(aTab) {
      function onDOMTitleChanged(aEvent) {
        document.getElementById("tabmail").setTabTitle(aTab);
      }
      // Save the function we'll use as listener so we can remove it later.
      aTab.titleListener = onDOMTitleChanged;
      // Add the listener.
      aTab.browser.addEventListener("DOMTitleChanged",
                                    aTab.titleListener, true);
    },
    /**
     * Internal function used to set up the close window listener on a content
     * tab.
     */
    _setUpCloseWindowListener: function setUpCloseWindowListener(aTab) {
      function onDOMWindowClose(aEvent) {
      try {
        if (!aEvent.isTrusted)
          return;

        // Redirect any window.close events to closing the tab. As a 3-pane tab
        // must be open, we don't need to worry about being the last tab open.
        document.getElementById("tabmail").closeTab(aTab);
        aEvent.preventDefault();
      } catch (e) {
        logException(e);
      }
      }
      // Save the function we'll use as listener so we can remove it later.
      aTab.closeListener = onDOMWindowClose;
      // Add the listener.
      aTab.browser.addEventListener("DOMWindowClose",
                                    aTab.closeListener, true);
    }
  };
