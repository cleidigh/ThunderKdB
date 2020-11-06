var refwdformatter = {
  
  editing: false,

  kCurrentLegacyMigration: 1,  // Migration flag. 0: not-migrated, 1: already-migrated
  kPrefDefaults: {
    replytext_on: true,
    replyhtml_on: true
  },
  loadPrefs: async function () {

    const results = await browser.storage.local.get("preferences");
  
    const currentMigration =
      results.preferences && results.preferences.migratedLegacy
        ? results.preferences.migratedLegacy
        : 0;
  
    if (currentMigration >= refwdformatter.kCurrentLegacyMigration) {
      return results.preferences;
    }
  
    let prefs = results.preferences || {};
  
    if (currentMigration < 1) {
      for (const prefName of Object.getOwnPropertyNames(refwdformatter.kPrefDefaults)) {
        let oldName = prefName.replace("_on", ".on");
        prefs[prefName] = await browser.myapi.getPref(`extensions.refwdformatter.${oldName}`);
        if (prefs[prefName] === undefined) {
          prefs[prefName] = refwdformatter.kPrefDefaults[prefName];
        }
      }
    }

    prefs.migratedLegacy = refwdformatter.kCurrentLegacyMigration;
    await browser.storage.local.set({ "preferences": prefs });
    return prefs;
  },

  format: async function (tab) {

    if (refwdformatter.editing) {
      return;
    }
    refwdformatter.editing = true;
    //console.log(tab);

    const prefs = await refwdformatter.loadPrefs();
    var ret = prefs.replytext_on
    var reh = prefs.replyhtml_on;

    let notCompose = false;
    let details;
    try { details = await browser.compose.getComposeDetails(tab.id);} catch(error) { notCompose = true; }
    if (notCompose) {
      refwdformatter.editing = false;
      return;
    };

    let indexCite = details.body.indexOf("class=\"moz-cite-prefix\"");
    let indexFwd = details.body.indexOf("class=\"moz-forward-container\"");
    if (indexCite === -1) {
      //console.log("Not-Reply Type");
      refwdformatter.editing = false;
      return;
    }
    if (indexFwd !== -1) {
      if (indexFwd < indexCite) {
          //console.log("Forward Type");
          refwdformatter.editing = false;
          return;
        }
    }

    let isPlainText = details.isPlainText;
    let isHtml = !isPlainText;

    if (ret || reh) {

      let htmlbody = details.body;//b.innerHTML;
      //console.log(details);

      // Main Logic
      if (htmlbody !== "<br>") {

        if (ret && isPlainText) {

          let textbody = details.plainTextBody;

          textbody = textbody.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\r\n").
            replace(/\n> {2}/g, "\n ").
            replace(/\n> /g, "\n").
            replace(/\n>((>)+) /g, "\n$1 ").
            replace(/\n>((>)+)\r/g, "\n$1\r").
            replace(/\n>((>)+)$/g, "\n$1");

          browser.compose.setComposeDetails(tab.id, { plainTextBody: textbody });

        } else if (reh && isHtml) {

          let document = new DOMParser().parseFromString(htmlbody, "text/html");

          if (document.body.hasChildNodes()) {
            var childNodes = document.body.childNodes;
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

            let html = new XMLSerializer().serializeToString(document);
            //console.log(html);
            browser.compose.setComposeDetails(tab.id, { body: html });
          }

        }
      }

    }
    window.setTimeout(function () {
      refwdformatter.editing = false;
    }, 700);
  },

  onDelayLoad: function (tab) {
    //console.log("onDelayLoad"); // for test
    window.setTimeout(function () {
      refwdformatter.format(tab);
    }, 700);
  },


  onLoad: function () {
    browser.tabs.onCreated.addListener(refwdformatter.onDelayLoad);
  }

};

window.addEventListener("load", refwdformatter.onLoad, true);
