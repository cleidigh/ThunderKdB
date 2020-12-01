
addEventListener("click", async (event) => {
	if (event.target.id.startsWith("register")) {
	  messenger.Utilities.openLinkExternally("https://sites.fastspring.com/quickfolders/product/smarttemplate4?referrer=landing-install");
	}
	if (event.target.id.startsWith("extend") || event.target.id.startsWith("renew")) {
	  messenger.Utilities.showXhtmlPage("chrome://smarttemplate4/content/register.xhtml");
    window.close();
	}
	if (event.target.id.startsWith("donate")) {
	  messenger.Utilities.openLinkExternally("https://smarttemplates.quickfolders.org/contribute.html#donate");
	}
});  



  addEventListener("load", async (event) => {
    const manifest = await messenger.runtime.getManifest(),
          browserInfo = await messenger.runtime.getBrowserInfo(),
          addonName = manifest.name, // or mxUtilties.getAddonName()); == 'quickFilters'
          addonVer = manifest.version,
          appVer = browserInfo.version,
          hoursWorked = 290;
    const mxUtilties = messenger.Utilities;

    // force replacement for __MSG_xx__ entities
    // using John's helper method (which calls i18n API)
    i18n.updateDocument();

    let h1 = document.getElementById('heading-installed');
    if (h1) {
      // this api function can do replacements for us
      h1.innerText = messenger.i18n.getMessage('heading-installed', addonName);
    }
    
    let thanksInfo = document.getElementById('thanks-for-installing-intro');
    if (thanksInfo) {
      thanksInfo.innerText = messenger.i18n.getMessage("thanks-for-installing-intro", addonName);
    }
    
    let verInfo = document.getElementById('active-version-info');
    if (verInfo) {
      // use the i18n API      
      // You are now running <b class="versionnumber">version {version}</b> on Thunderbird {appver}.
      // for multiple replacements, pass an array
      verInfo.innerHTML = messenger.i18n.getMessage("active-version-info", [addonVer, appVer])
        .replace("{boldStart}","<b class='versionnumber'>")
        .replace("{boldEnd}","</b>");
    }    
    
    let suggestion = document.getElementById('support-suggestion');
    if (suggestion) {
      suggestion.innerText = messenger.i18n.getMessage("support-suggestion", addonName);
    }
    
    let preference = document.getElementById('support-preference');
    if (preference) {
      preference.innerText = messenger.i18n.getMessage("support-preference", addonName);
    }

    let title = document.getElementById('window-title');
    if (title)
      title.innerText = messenger.i18n.getMessage("window-title", addonName);
    
    updateActions(addonName);

    addAnimation('body');
  });  
  





