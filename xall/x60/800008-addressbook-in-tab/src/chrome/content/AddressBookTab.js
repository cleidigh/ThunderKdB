Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function getAbToolbox()
{
  return document.getElementById("ab-toolbox");
}

var addressBookTabType = {
    __proto__: contentTabBaseType,
    name: "addressBookTab",
    perTabPanel: "vbox",
    lastBrowserId: 0,
    get loadingTabString() {
      delete this.loadingTabString;
      return this.loadingTabString = document.getElementById("bundle_messenger")
                                             .getString("loadingTab");
    },

    modes: {
      addressBookTab: {
        type: "addressBookTab",
        maxTabs: 1
      }
    },

    /**
     * This is the internal function used by content tabs to open a new tab. To
     * open a contentTab, use specialTabs.openTab("contentTab", aArgs)
     *
     * @param aArgs The options that content tabs accept.
     * @param aArgs.contentPage A string that holds the URL that is to be opened
     * @param aArgs.clickHandler The click handler for that content tab. See the
     *  "Content Tabs" article on MDC.
     * @param aArgs.onLoad A function that takes an Event and a DOMNode. It is
     *  called when the content page is done loading. The first argument is the
     *  load event, and the second argument is the xul:browser that holds the
     *  contentPage. You can access the inner tab's window object by accessing
     *  the second parameter's contentWindow property.
     */
    openTab: function contentTab_onTabOpened(aTab, aArgs) {
      if (!"contentPage" in aArgs)
        throw("contentPage must be specified");

      // First clone the page and set up the basics.
      let clone = document.getElementById("contentTab").firstChild.cloneNode(true);

      clone.setAttribute("id", "addressBookTab");
      clone.setAttribute("collapsed", false);

      let toolbox = clone.firstChild;
      toolbox.parentNode.removeChild(toolbox);


      aTab.panel.appendChild(clone);
      aTab.root = clone;

      aTab.browser = aTab.panel.querySelector("browser");
      aTab.toolbar = aTab.panel.querySelector(".contentTabToolbar");

      // As we're opening this tab, showTab may not get called, so set
      // the type according to if we're opening in background or not.
      let background = ("background" in aArgs) && aArgs.background;
      aTab.browser.setAttribute("type", "content");

      if (background)
        aTab.browser.removeAttribute("primary");
      else
        aTab.browser.setAttribute("primary", "true");

      aTab.browser.setAttribute("id", "addressBookBrowser");

      aTab.clickHandler = "clickHandler" in aArgs && aArgs.clickHandler ?
                          aArgs.clickHandler :
                          "specialTabs.defaultClickHandler(event);";
      aTab.browser.setAttribute("onclick", aTab.clickHandler);

      // Set this attribute so that when favicons fail to load, we remove the
      // image attribute and just show the default tab icon.
      //aTab.tabNode.setAttribute("onerror", "this.removeAttribute('image');");

      aTab.browser.addEventListener("DOMLinkAdded", DOMLinkHandler, false);
      gPluginHandler.addEventListeners(aTab.browser);

      // Now initialise the find bar.
      aTab.findbar = aTab.panel.querySelector("findbar");
      aTab.findbar.setAttribute("browserid","addressBookTabBrowser");

      // Default to reload being disabled.
      aTab.reloadEnabled = false;

      // Now set up the listeners.
      this._setUpLoadListener(aTab);
      this._setUpTitleListener(aTab);
      this._setUpCloseWindowListener(aTab);

      if ("onLoad" in aArgs) {
        aTab.browser.addEventListener("load", function _contentTab_onLoad (event) {     	
        	if(!aTab.browser.contentWindow.document.getElementById("mail-bar3")){
	        	let iframeDocument = aTab.browser.contentWindow.document;

	      //add stylesheets from parent
				Array.prototype.forEach.call(document.styleSheets, function(style) {
					var pi = iframeDocument.createProcessingInstruction('xml-stylesheet', 'href="'+style.href+'" type="text/css"');
					iframeDocument.insertBefore(pi, iframeDocument.firstChild);
	    	});


          var stylePropertyValid = function(name,value){
                            //checking that the value is not a undefined
                    return typeof value !== 'undefined' &&
                            //checking that the value is not a object
                            typeof value !== 'object' &&
                            //checking that the value is not a function
                            typeof value !== 'function' &&
                            //checking that we dosent have empty string
                            value.length > 0 &&
                            //checking that the property is not int index ( happens on some browser
                            value != parseInt(value)

                };

				function setStyleFrom_To(from_id,to_id,remove_id) {
            let copystyle = window.getComputedStyle(document.getElementById(from_id));
               for(property in copystyle){
                if(stylePropertyValid(property,copystyle[property])) {
                  //applying the style property to the target element
                  iframeDocument.getElementById(to_id).style[property] = copystyle[property];
                } 
              }
              iframeDocument.getElementById(to_id).style["margin-top"] = '-1px'
				};
	
	        	iframeDocument.getElementById('ab-toolbox').setAttribute("class","mail-toolbox contentTabToolbox");

	      		let toolbar = iframeDocument.getElementById('ab-bar2');
	      		toolbar.setAttribute("class","inline-toolbar chromeclass-toolbar");

	      		let windowMenu = iframeDocument.getElementById('addrbook-toolbar-menubar2');
	      		windowMenu.setAttribute("class","inline-toolbar chromeclass-toolbar");
				windowMenu.removeAttribute("type");

				let newMenu = iframeDocument.createElement('toolbarbutton');
				newMenu.setAttribute('id','ab-appmenu-button');
				newMenu.setAttribute('class','toolbarbutton-1 button-appmenu');
				newMenu.setAttribute('tooltiptext','Display the AddressBook Menu');
				let newPopup = iframeDocument.createElement('menupopup');
				
				newPopup.appendChild(windowMenu.firstChild.firstChild);
				newMenu.appendChild(newPopup);
				toolbar.insertBefore(newMenu, toolbar.firstChild);
				windowMenu.parentNode.removeChild(windowMenu);

        setStyleFrom_To('mail-toolbox','ab-toolbox','ab-toolbox')
        setStyleFrom_To('mail-bar3','ab-bar2','ab-bar2')
        	}
          aArgs.onLoad(event, aTab.browser);
          aTab.browser.removeEventListener("load", _contentTab_onLoad, true);
        }, true);
      }

      // Create a filter and hook it up to our browser
      let filter = Components.classes["@mozilla.org/appshell/component/browser-status-filter;1"]
                             .createInstance(Components.interfaces.nsIWebProgress);
      aTab.filter = filter;
      aTab.browser.webProgress.addProgressListener(filter, Components.interfaces.nsIWebProgress.NOTIFY_ALL);

      // Wire up a progress listener to the filter for this browser
      aTab.progressListener = new tabProgressListener(aTab, false);

      filter.addProgressListener(aTab.progressListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);

      if ("onListener" in aArgs)
        aArgs.onListener(aTab.browser, aTab.progressListener);

      // Initialize our unit testing variables.
      aTab.pageLoading = false;
      aTab.pageLoaded = false;

       // Now start loading the content.
      aTab.title = this.loadingTabString;

      aTab.browser.loadURI(aArgs.contentPage);

      this.lastBrowserId++;
    },
    tryCloseTab: function onTryCloseTab(aTab) {
      let docShell = aTab.browser.docShell;
      // If we have a docshell, a contentViewer, and it forbids us from closing
      // the tab, then we return false, which means, we can't close the tab. All
      // other cases return true.
      return !(docShell && docShell.contentViewer
        && !docShell.contentViewer.permitUnload());
    },
    persistTab: function onPersistTab(aTab) {
      if (aTab.browser.currentURI.spec == "about:blank")
        return null;

      let onClick = aTab.clickHandler;

      return {
        tabURI: aTab.browser.currentURI.spec,
        clickHandler: onClick ? onClick : null
      };
    },
    restoreTab: function onRestoreTab(aTabmail, aPersistedState) {
      aTabmail.openTab("addressBookTab", { contentPage: aPersistedState.tabURI,
                                       clickHandler: aPersistedState.clickHandler,
                                       background: true,
                                       onLoad: function(){}
                                    } );
    }

  }

window.addEventListener("load", function(e) {
    let tabmail = document.getElementById('tabmail');
    if( tabmail ) tabmail.registerTabType(addressBookTabType);
}, false);

