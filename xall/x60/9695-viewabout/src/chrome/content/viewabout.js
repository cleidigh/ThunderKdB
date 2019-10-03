Components.utils.import("resource://gre/modules/Services.jsm");

var getAboutUrls = function () {
    var l = "@mozilla.org/network/protocol/about;1?what=", it;
    var ans = [];
    for (var i in Cc) {
        if (i.indexOf(l) == 0) {
            ans.push("about:" + i.substr(l.length))
        }
    }
    return ans
}

var viewabout =
{
    onLoad : function()
    {
        var menu = document.getElementById("menu_viewAbout");
        var menuitems = menu.getElementsByTagName("menuitem");
        for (var i=0; i < menuitems.length; i++)
        {
            var aboutURL = menuitems[i].value;

            detectedBool = false;
            detectedAboutUrlsArray = getAboutUrls();
            // Look for all the detected about: URLs in the application.
            for (var j=0; j < detectedAboutUrlsArray.length; j++) {
                detectedAboutURL = detectedAboutUrlsArray[j];
                // Compare with known about: URLs in ViewAbout with .xul files.
                if (aboutURL == detectedAboutURL) {
                    detectedBool = true;
                    break
                }
            }
            // Not valid URL; hide it
            if (detectedBool == false) {
                menuitems[i].hidden = true;
            }
        }
    },

    openUrl : function(aboutURL)
    {
      var filename = aboutURL.replace(":","").replace("?","").replace("=","");
      var versionCheck = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);

      if (Services.appinfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}" &&
          versionCheck.compare(Services.appinfo.version, "3.0") >= 0) {

        // This is Thunderbird
        let tabmail = document.getElementById("tabmail");
        if (!tabmail) {
          // Try opening new tabs in an existing 3pane window
          let mail3PaneWindow =
            Components.classes["@mozilla.org/appshell/window-mediator;1"]
                      .getService(Components.interfaces.nsIWindowMediator)
                      .getMostRecentWindow("mail:3pane");
          if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
          }
        }

        const tabParams = {
          contentPage: aboutURL,
          clickHandler: "specialTabs.aboutClickHandler(event);"
        };

        if (tabmail)
          tabmail.openTab("contentTab", tabParams);
        else
          window.openDialog("chrome://messenger/content/", "_blank",
                            "chrome,dialog=no,all", null,
                            { tabType: "contentTab",
                              tabParams: tabParams });
      }
      else
        // This is SeaMonkey/Firefox etc
        window.openDialog("chrome://viewabout/content/dialogs/"+filename+".xul", filename, "chrome,resizable=yes,width=800,height=500,centerscreen");
    }
};

window.addEventListener("load", function() { viewabout.onLoad(); }, false);
