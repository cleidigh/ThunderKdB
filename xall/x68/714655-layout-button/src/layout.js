browser.mailTabs.query({ currentWindow: true }).then(function(currentTab) {
    currentTab = currentTab[0];
    for (let key of ["standard", "wide", "vertical"]) {
        let div = document.getElementById(key);
        let input = div.querySelector("input");
        let label = div.querySelector("label");
        input.checked = currentTab.layout == key;
        input.onchange = async () => {
            browser.mailTabs.update({ layout: key });
        };
        label.appendChild(document.createTextNode(" " + browser.i18n.getMessage(key)));
    }

    for (let key of ["folderPaneVisible", "messagePaneVisible"]) {
        let div = document.getElementById(key);
        let input = div.querySelector("input");
        let label = div.querySelector("label");
        input.checked = currentTab[key];
        input.onchange = async () => {
            browser.mailTabs.update({ [key]: input.checked });
        };
        label.appendChild(document.createTextNode(" " + browser.i18n.getMessage(key)));
    }
});
