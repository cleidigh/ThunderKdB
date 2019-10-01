function onInit() {

  async function findPreferences(Titles) {
    console.log("About to try managed storage");
    try {
    var domainExclude;
    var versionHeader;
      Thisdomain = await browser.storage.managed.get("domain");
      ThisVersion = await browser.storage.managed.get("version");
      console.log("Managed preferences: " + Thisdomain.domain + " " + ThisVersion.version);
      domainExclude = Thisdomain.domain;
      versionHeader = ThisVersion.version;
    } catch (e) {
      Thisdomain = await browser.storage.local.get("domain");
      ThisVersion = await browser.storage.local.get("version");
      console.log("Local " + Thisdomain.domain + " " + ThisVersion.version);
      domainExclude = Thisdomain.domain;
      versionHeader = ThisVersion.version;
    }
    if (typeof domainExclude == "undefined") {
      domainExclude = await browser.oldPrefs.getOldPrefs("exclude","singledomain","string");
    }
    if (typeof versionHeader == "undefined") {
      versionHeader = await browser.oldPrefs.getOldPrefs("Version","singledomain","string");
    }
    if (typeof versionHeader == "undefined") {
      versionHeader = "";
    }
    if (typeof domainExclude !== "undefined") {
      browser.myapi.setWindowListener(domainExclude,versionHeader,Titles);
      console.log(domainExclude + " " + versionHeader);
    }
  }

  var msgStringbundle = new StringBundle("singledomain")
  var MessageBoxTitles = [ "title", "label", "labelquestion",
  "accept","mytitle","cancel"];
  var count;
  var MessageBoxTitleList = "";
  for (count = 0; count < MessageBoxTitles.length; count++) {
    MessageBoxTitle =  msgStringbundle.get(MessageBoxTitles[count])
    MessageBoxTitleList = MessageBoxTitleList + "|" + MessageBoxTitle;
  }
  findPreferences(MessageBoxTitleList);
  browser.composeAction.setTitle({title: "Expand addresses"});
  browser.composeAction.setIcon({path:"icons/icon_toolbar.png" });
  browser.composeAction.onClicked.addListener(ExpandButton);
}

function ExpandButton() {
  browser.myapi.myExpandRecipients();
}

document.addEventListener("DOMContentLoaded", onInit);
