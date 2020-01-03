var refwdformatter = {
  
  editing: false,

  format: function () {

    if (refwdformatter.editing) {
      return;
    }
    refwdformatter.editing = true;

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.refwdformatter.");
    var ret = true; try { ret = (prefs.getBoolPref("replytext.on") !== false); } catch(error) { prefs.setBoolPref("replytext.on", true); }
    var reh = true; try { reh = (prefs.getBoolPref("replyhtml.on") !== false); } catch(error) { prefs.setBoolPref("replyhtml.on", true); }
    var lit = true; try { lit = (prefs.getBoolPref("listtext.on") !== false); } catch(error) { prefs.setBoolPref("listtext.on", true); }
    var lih = true; try { lih = (prefs.getBoolPref("listhtml.on") !== false); } catch(error) { prefs.setBoolPref("listhtml.on", true); }

    var t = gMsgCompose.type;
    var msgHtml = gMsgCompose.composeHTML;

    var version;  
    if ("@mozilla.org/xre/app-info;1" in Components.classes) {
      version = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).version;  
    } else {
      version = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).getCharPref("app.version");  
    }
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);

    if ((ret || reh || lit || lih) && (t == 1 || t == 2 || t == 6 || t == 7 || t == 8 || t == 13)) {
      // Reply (1: Reply, 2: ReplyAll, 6: ReplyToSender, 7: ReplyToGroup, 8: ReplyToSenderAndGroup, 13: ReplyToList)

      //var b = document.getElementById("content-frame").contentDocument.body;
      var e = GetCurrentEditor() 
      var b = e.rootElement; 

      var h = b.innerHTML;
      ////// If you develop and test this add-on logic code, remove the following comment-out temporarily to get the whole html source of the current mail.
      // b.innerHTML = h.replace(/[&"'<>]/g, function(m) { return { "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" }[m]; });
      // return;

      var brCounter = 2;  // There should be two <br> tags as FirstChildren in a mail.

      /// Logic Debug: https://liveweave.com/qfF3oS
      if (h !== "<br>") {

        if ((ret || lit) && !msgHtml) {

          if (b.hasChildNodes()) {
            var children = b.childNodes;
            //console.log(children);

            var isFirstChildren = true;
            for (var i = 0; i < children.length; i++) {

              if (brCounter <= 0) isFirstChildren = false;
              var curChildNode = children[i];

              if (curChildNode.nodeType === Node.TEXT_NODE) {
                //console.log(curGChildNode); 
                refwdformatter.removeQuoteMarksInTextMessage(curChildNode);  // Basically, this code-block won't be run.

              } else {
                //console.log(curChildNode.tagName);
                switch (curChildNode.tagName) {

                  case "BR":
                    if (isFirstChildren) {
                      brCounter--;
                    }
                    break;

                  case "SPAN":
                  case "DIV":
                    if (isFirstChildren) isFirstChildren = false;
                    if (curChildNode.hasChildNodes()) {
                      var grandChildren = curChildNode.childNodes;
                      //console.log(grandChildren);
                      for (var n = 0; n < grandChildren.length; n++) {
                        var curGChildNode = grandChildren[n];
                        if (curGChildNode.nodeType === Node.TEXT_NODE) {
                          //console.log(curGChildNode); 
                          refwdformatter.removeQuoteMarksInTextMessage(curGChildNode);
                        }
                      }
                    }
                    break;

                  default:
                    if (isFirstChildren) isFirstChildren = false;
                    break;
                }

              }

            }

            refwdformatter.addLineBreakJustInCase(brCounter);
          }

        } else if ((reh || lih) && msgHtml) {

          if (b.hasChildNodes()) {
            var childNodes = b.childNodes;
            //console.log(childNodes);
            var is1stChild = true;
            for (var l = 0; l < childNodes.length; l++) {
              if (childNodes[l].tagName == "BLOCKQUOTE") {
                is1stChild = false;
                // Replace the first <blockquote> tag with new <div> tag
                var newdiv = document.createElement("div");
                while (childNodes[l].firstChild) {
                  newdiv.appendChild(childNodes[l].firstChild); // *Moves* the child
                }
                newdiv.setAttribute('class', 'replaced-blockquote');
                for (var index = childNodes[l].attributes.length - 1; index >= 0; --index) {
                  newdiv.attributes.setNamedItem(childNodes[l].attributes[index].cloneNode());
                }
                childNodes[l].parentNode.replaceChild(newdiv, childNodes[l]);
                break;
              }
              if (!is1stChild) break;
            }

            // To redraw. If there aren't these code, the width of the top <div> tag will shirink - I do not know why. It may be a Thunderbird bug.
            var resethtml = b.innerHTML;
            while (b.hasChildNodes()) b.removeChild(b.firstChild);
            e.beginningOfDocument();
            e.beginTransaction();
            e.insertHTML(resethtml);
            e.endTransaction();

            refwdformatter.addLineBreakJustInCase(brCounter);
          }

        }

        refwdformatter.initCursorPosition();

      }

    }
    window.setTimeout(function () {
      refwdformatter.editing = false;
    }, 700);
  },

  removeQuoteMarksInTextMessage: function (curNode) {
    /// [--- liveweave debug 2 - START copy here ---]
    //console.log(curNode.previousSibling);
    if ((curNode.previousSibling === null) ||
        (curNode.previousSibling.tagName === "BR")) {
      //console.log(curNode.data);
      curNode.data = curNode.data.
        replace(/^> {2}/g, " ").
        replace(/^> /g, "").
        replace(/^>((>)+) /g, "$1 ").
        replace(/^>((>)+)$/g, "$1 ");
      //console.log(curNode.data);
    }
    /// [--- liveweave debug 2 - END copy here ---]
  },

  addLineBreakJustInCase: function (brCounter) {
    if (brCounter > 0) {
      var e = GetCurrentEditor();
      e.beginningOfDocument();
      while (brCounter > 0) {
        brCounter--;
        e.insertHTML("<br>");
      }
    }
  },
 
  initCursorPosition: function () {
    var e = GetCurrentEditor();
    e.beginningOfDocument();
    e.insertHTML(" ");
    e.undo(1);
  },

  onDelayLoad: function () {
    window.setTimeout(function () {
      refwdformatter.format();
    }, 700);
  },

  onDelayReopen: function () {
    window.setTimeout(function () {
      refwdformatter.format();
    }, 700);
  },

  onLoad: function () {
    opening = false;
    document.getElementById("content-frame").addEventListener("load", refwdformatter.onDelayLoad, true);
    window.addEventListener("compose-window-reopen", refwdformatter.onDelayReopen, true);
  }

};

window.addEventListener("load", refwdformatter.onLoad, true);
