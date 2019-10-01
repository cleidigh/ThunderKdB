function saveTheOption(e) {

e.preventDefault();
    browser.storage.local.set({
      domain: document.querySelector("#domain").value
    });
    console.log("Saved locally");

    console.log("Saved " + document.querySelector("#domain").value);
}

async function onInit() {
  console.log("Init");
  var ThisManaged = true;
  var gStringBundle = new StringBundle("settings")
  translateElements(document, gStringBundle);
  var Thisdomain;
  let info = await browser.runtime.getBrowserInfo();
  saveoption.onclick = saveTheOption;
  try {
      Thisdomain = await browser.storage.managed.get("domain");
      document.querySelector("#domain").value = Thisdomain.domain;
      console.log("Found in Managed");
    } catch(e) {
        ThisManaged = false;
        Thisdomain = await browser.storage.local.get("domain");
        document.querySelector("#domain").value = Thisdomain.domain;

        if (typeof Thisdomain.domain == "undefined") {
          Thisdomain = await browser.oldPrefs.getOldPrefs("exclude","singledomain","string")
          console.log("Needed to look at old prefs");
          document.querySelector("#domain").value = Thisdomain;
          browser.storage.local.set({
            domain: document.querySelector("#domain").value
          });// If it came from old Preferences, save it locally.
        }
    }
    if (document.querySelector("#domain").value == "undefined") {
      document.querySelector("#domain").value = "";// if there's nothing there - make it blank
    }
}
var ThisManaged
document.addEventListener("DOMContentLoaded", onInit);
