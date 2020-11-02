const { ExtensionCommon } = ChromeUtils.import(
    "resource://gre/modules/ExtensionCommon.jsm");

this.ex_raisetoolbar = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    const extension = context.extension;

    let windows = []; // Windows we were raised the main toolbar in

    // Attempts to move the main toolbar above the tabbar in the given DOM
    // window
    const raiseMainToolbar = function(window, attempt) {
      const document = window.document;
      const toolbox = document.getElementById("mail-toolbox");
      const newparent = document.getElementById("navigation-toolbox");
      if (!(toolbox && newparent)) {
        if (attempt < 10) {
          // Repeatedly retry in the first ~5 seconds after loading the window.
          // (with a zero-delay after the onload event is too early in some
          // cases)
          window.setTimeout(function(){
            raiseMainToolbar(window, attempt + 1);
          }, 500);
          return;
        }
        console.error("Cannot raise toolbar: missing toolbar and/or its new "
            + "parent.");
        return;
      }
      windows.push(window);
      
      // Save the position for restoring if we get disabled / uninstalled, also
      // our attrchange handler
      toolbox.riseofthetools = {
        parent: toolbox.parentNode,
        next: toolbox.nextSibling
      };
      
      // Move the toolbox
      for (let node of newparent.childNodes){
        if (node.id == "tabs-toolbar")
          newparent.insertBefore(toolbox, node);
      }
      
      // Inject CSS fixing some visual issues
      const css = document.getElementById("messengerWindow").appendChild(
          document.createElementNS("http://www.w3.org/1999/xhtml", "style"));
      css.setAttribute("type", "text/css");
      css.id = "riseofthetools-style";
      const csstext = '#tabs-toolbar {-moz-box-ordinal-group: 30 !important;} '
          + '#mail-toolbox{-moz-box-ordinal-group: 20 !important;'
          + 'background: none !important;} '
          + '#mail-toolbar-menubar2 {-moz-box-ordinal-group: 10 !important;} '
          + '.mail-toolbox::after { border-bottom: 0 !important; } '
          + '#navigation-toolbox::after {-moz-box-ordinal-group: 40;'
          + 'content: "";display: -moz-box;height:1px;'
          + 'border-bottom: 1px solid var(--chrome-content-separator-color);}'
          + '#mail-toolbox:not([labelalign="end"]) .toolbarbutton-1,'
          + '#mail-toolbox:not([labelalign="end"]) '
          + '.toolbarbutton-1[type="menu-button"] > '
          + '.toolbarbutton-menubutton-button {-moz-box-orient: vertical;}';
      css.appendChild(document.createTextNode(csstext));

      // Disallow tabs in the titlebar, which will break as the tabbar is no
      // longer below the title bar
      window.TabsInTitlebar.allowedBy("riseofthetools", false);
    };

    context.callOnClose({
      close() {
        for (let window of windows) {
          try {
            const document = window.document;
            const toolbox = document.getElementById("mail-toolbox");
            toolbox.riseofthetools.parent.insertBefore(toolbox,
                toolbox.riseofthetools.next);
            delete toolbox.riseofthetools;
            const css = document.getElementById("riseofthetools-style");
            css.parentNode.removeChild(css);
            window.TabsInTitlebar.allowedBy("riseofthetools", true);
          } catch (e) {
            // Log errors, but continue with the next window
            console.error(e);
          }
        }
        windows = [];
      }
    });

    return {
      ex_raisetoolbar: {
        raiseMainToolbar(windowId) {
          const window = extension.windowManager.get(windowId, context).window;
          raiseMainToolbar(window, 0);
        }
      }
    };
  }
};
