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
  
function restoreOptions() {
  
    function setCurrentChoice(data) {
        if (data.showIcon == true) {
            document.getElementById("showIcon").checked = true;
            document.getElementById("iconPosition").removeAttribute(dis);
        }
        if (data.iconPosition == true) document.getElementById("iconPosition").checked = true;
    }
  
    function onError(error) {
      console.log(`Error: ${error}`);
    }

    // localization
    document.getElementById("notifyIconLbl").textContent = browser.i18n.getMessage("options.icon.notify");
    document.getElementById("showIconLbl").textContent = browser.i18n.getMessage("options.icon.show");
    document.getElementById("iconPositionLbl").textContent = browser.i18n.getMessage("options.icon.position");
    document.getElementById("applyBtn").value = browser.i18n.getMessage("options.button.apply");

    document.getElementById("applyBtn").addEventListener("click", saveOptions);
    document.getElementById("showIcon").addEventListener("change", changeOptions);
    document.getElementById("iconPosition").addEventListener("change", changePosition);

    var getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("applyBtn").addEventListener("click", saveOptions);
document.getElementById("showIcon").addEventListener("change", changeOptions);
document.getElementById("iconPosition").addEventListener("change", changePosition);

