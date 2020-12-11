var tbdialoutPassWarn = {
  onPassWarnLoad: function() {
    this.extension = window.arguments[0];
    document.title = this.extension.localeData.localizeMessage("warningDefaultTitle");
    document.getElementById("tbdoPassWarnBrowser").setAttribute('src', "https://www.oak-wood.co.uk/oss/tbdialout/passwordwarning");
  },
}

document.addEventListener('DOMContentLoaded', () => {
  i18n.updateDocument({
    extension: window.arguments[0],
  });
}, { once: true });