/*
 * Base for the whole extension: https://developer.thunderbird.net/add-ons/mailextensions
 *
 *
 * "windows" don't give access to the actual javascript global thunberbird "window"
 * Experimental API using a window listener and manipulate the UI as needed via JavaScript
 * https://developer.thunderbird.net/add-ons/updating/tb78/changes
 * We need this to have access to the messengerBox window
 * Baseline copied from restart example: https://github.com/thundernest/sample-extensions/blob/master/restart/implementation.js
 *
 * full doc: https://thunderbird-webextensions.readthedocs.io/en/78/how-to/experiments.html
 *
 * Some day, the schema & api should be something generic to add possibly multiple sidebars on 1 kind of tabs
 *
 * if implementation.js you can find/debug it in the file:// tree
 */

// Import some things we need.
var { ExtensionCommon } = ChromeUtils.import(
  "resource://gre/modules/ExtensionCommon.jsm"
);
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// windowlistener
var { ExtensionSupport } = ChromeUtils.import(
  "resource:///modules/ExtensionSupport.jsm"
);

var { ExtensionParent } = ChromeUtils.import(
  "resource://gre/modules/ExtensionParent.jsm"
);
var extension = ExtensionParent.GlobalManager.getExtension(
  "tidybird@ganast.com"
);
//var { Tidybird } = ChromeUtils.import(extension.rootURI.resolve("modules/tidybird.jsm"));

// var tidybird_api is used by TB: defined in manifest.json
// eslint-disable-next-line no-unused-vars
var tidybird_api = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {
    console.debug("Tidybird startup");
  }

  onShutdown(isAppShutdown) {
    console.debug("Tidybird shutdown");
    if (isAppShutdown) {
      return; // the application gets unloaded anyway
    }

    // we want to be sure the JSMs are unloaded
    try {
      this.getAPI({}).tidybird_api.stopWindowListener();
    } catch (error) {
      console.info("Tidybird was already removed.");
    }

    // Unload JSMs of this add-on
    const rootURI = this.extension.rootURI.spec;
    for (let module of Cu.loadedModules) {
      if (module.startsWith(rootURI)) {
        Cu.unload(module);
      }
    }

    // Clear caches that could prevent upgrades from working properly
    // https://developer.thunderbird.net/add-ons/mailextensions/experiments
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  getAPI(context) {
    //context.callOnClose(this);
    return {
      tidybird_api: {
        startWindowListener() {
          console.debug("Start tidybird windowlistener");

          ExtensionSupport.registerWindowListener("tidybirdListener", {
            onLoadWindow(thisWindow) {
              let messengerBox = thisWindow.document.getElementById(
                "messengerBox"
              );
              if (messengerBox) {
                console.debug("Found messageBox, adding tidybird");
                // no access to "messenger" here (?) -> cannot call other api

                //TODO -later- check custom elements https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
                //TODO -later- try with sidepane (?)
                //TODO -later- try with content script (?)

                // load and add the element text
                let context = {};
                Services.scriptloader.loadSubScript(
                  extension.rootURI.resolve("content/tidybirdpane.js"),
                  context,
                  "UTF-8"
                );
                //TODO -later- load here using pure javascript
                let htmlPane = thisWindow.MozXULElement.parseXULToFragment(
                  context.tidybirdPane
                );
                // only visible when messengerBox is visible
                thisWindow.document
                  .getElementById("messengerBox")
                  .appendChild(htmlPane);

                // add the css: based on WindowListener: https://github.com/thundernest/addon-developer-support
                let ns = thisWindow.document.documentElement.lookupNamespaceURI(
                  "html"
                );
                let cssLink = thisWindow.document.createElementNS(ns, "link");
                //let cssLink = thisWindow.document.createElement("link"); // for tb 78, this is enough, but it does not hurt looking up and using the correct namespace
                cssLink.setAttribute("rel", "stylesheet");
                cssLink.setAttribute("x-tidybird", "added");
                cssLink.setAttribute(
                  "href",
                  extension.rootURI.resolve("skin/tidybird.css")
                );
                thisWindow.document.documentElement.appendChild(cssLink);

                //TODO -less later- don't create folderlistener for every window
                // create module from tidybird.js and give it a way to update all tidybirdPanes in all windows
                // => split folderlistener & content script (updateButtonList)
                Services.scriptloader.loadSubScriptWithOptions(
                  extension.rootURI.resolve("content/tidybird.js"),
                  { target: thisWindow, charset: "UTF-8", ignoreCache: true }
                );
                thisWindow.Tidybird.init();
              }
            },
            onUnloadWindow(thisWindow) {
              if (thisWindow.Tidybird) {
                console.debug(
                  "Removing tidybird listeners for this closing window with Tidybird"
                );
                thisWindow.Tidybird.deinit();
              }
            },
          });
        },
        stopWindowListener() {
          console.debug("Stop tidybird listener");

          // or ExtensionSupport.openWindows
          for (let thisWindow of Services.wm.getEnumerator("mail:3pane")) {
            thisWindow.Tidybird.deinit(); // stop folder listener on all windows
            let elements = thisWindow.document.querySelectorAll(
              '[x-tidybird="added"]'
            );
            for (let element of elements) {
              element.remove(); // remove all our elements on all windows
            }
          }

          // remove our listener
          ExtensionSupport.unregisterWindowListener("tidybirdListener");
        },
        toggleWindowListener() {
          //TODO -later- do the state check using the storage which remembers the last asked state
          // we search for a tidybird element, so we have an easy way to override and be sure we cleaned up
          for (let thisWindow of ExtensionSupport.openWindows) {
            let tidybirdElements = thisWindow.document.querySelectorAll(
              '[x-tidybird="added"]'
            );
            if (tidybirdElements.length) {
              // found a tidybird element, so we should clean up and exit
              this.stopWindowListener();
              return;
            }
          }
          // no tidybird pane found, so we should show it
          this.startWindowListener();
        },
      },
    };
  }
};

/*
 * TODO -later- When ready, check this again: https://developer.thunderbird.net/add-ons/mailextensions/experiments
 */
