const dis = "disabled";
function changeOptions() {
    if (document.getElementById("showIcon").checked) document.getElementById("iconPosition").removeAttribute(dis);
    else document.getElementById("iconPosition").setAttribute(dis, dis);
}

function changePosition() {
    let target = document.getElementById("iconPosition") ? "expandedHeaders2" : "otherActionsBox";
    browser.dispmuaApi.move("dispMUAicon", target);
}

function saveOptions(e) {
    browser.storage.local.set({
      showIcon: document.getElementById("showIcon").checked,
      iconPosition: document.getElementById("iconPosition").checked
    });
    e.preventDefault();
}

function saveOverlay(e) {
    browser.storage.local.set({
      overlay: document.getElementById("overlayDef").value,
      overlayChanged: true
    }).then( () => { console.log("overlay saved.", document.getElementById("overlayDef").value); });
}

function importOverlay(e) {
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(e) {
        let result = e.target.result;
        browser.storage.local.set({overlay: result});
        document.getElementById("overlayDef").value = result;
    }
}

function exportOverlay(e) {
    let data = document.getElementById("overlayDef").value;
    console.log("data: ", data);
    let blob = new Blob([data], {type: "text/plain"});
    browser.downloads.download({
      url: URL.createObjectURL(blob),
      filename: "dispMUAOverlay.csv",
      saveAs: true
    });
}

function restoreOptions() {
  
    function setCurrentChoice(data) {
        if (data.showIcon == true) {
            document.getElementById("showIcon").checked = true;
            document.getElementById("iconPosition").removeAttribute(dis);
        }
        if (data.iconPosition == true) document.getElementById("iconPosition").checked = true;
        //if (data.overlay.length > 0) document.getElementById("overlayDef").textContent = data.overlay;
        if (data.overlay.length > 0) document.getElementById("overlayDef").value = data.overlay;
    }
  
    function onError(error) {
      console.log(`Error: ${error}`);
    }

    // localization
    document.getElementById("notifyIconLbl").textContent = browser.i18n.getMessage("options.icon.notify");
    document.getElementById("showIconLbl").textContent = browser.i18n.getMessage("options.icon.show");
    document.getElementById("iconPositionLbl").textContent = browser.i18n.getMessage("options.icon.position");
    document.getElementById("overlayLbl").textContent = "User overrides(dispMuaOverlay.csv)"; //browser.i18n.getMessage("options.icon.position");
    document.getElementById("applyBtn").value = browser.i18n.getMessage("options.button.apply");
    document.getElementById("importBtnLbl").textContent = browser.i18n.getMessage("options.button.import");
    document.getElementById("exportBtn").value = browser.i18n.getMessage("options.button.export");
    document.getElementById("applyOlBtn").value = browser.i18n.getMessage("options.button.applyOl");
    document.getElementById("overlayExamples").innerHTML = "<b>Example override</b><br />#Lines beginning with # are comment lines<br />#X-Mailer/User-Agent, URI *file:/// support is not good enough<br />thunderbird,file:///data/grafik/mytbicon.png<br />exampleagent,http://example.com/icons/agent.gif<br />\"agent,with,comma\",http://example.com/icons/commaagent.png";

    // event registration
    document.getElementById("applyBtn").addEventListener("click", saveOptions);
    document.getElementById("showIcon").addEventListener("change", changeOptions);
    document.getElementById("iconPosition").addEventListener("change", changePosition);
    document.getElementById("exportBtn").addEventListener("click", exportOverlay);
    document.getElementById("applyOlBtn").addEventListener("click", saveOverlay);

    var getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("applyBtn").addEventListener("click", saveOptions);
document.getElementById("showIcon").addEventListener("change", changeOptions);
document.getElementById("iconPosition").addEventListener("change", changePosition);
document.getElementById("importBtn").addEventListener("change", importOverlay);
