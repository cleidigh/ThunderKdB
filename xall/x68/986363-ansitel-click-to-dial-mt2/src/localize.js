function localizeHtmlPage() {
  //Localize by replacing __MSG_***__ meta tags
  var title = document.getElementsByTagName('title');
  var msg = document.getElementsByTagName('div');

  for (var j = 0; j < title.length; j++) {
    var t = title[j];
    var valStrH = t.innerText.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });

    if(valNewH != valStrH) {
      t.innerText = valNewH;
    }
  }

  for (var j = 0; j < msg.length; j++) {
    var m = msg[j];
    var valStrH = m.innerText.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });

    if(valNewH != valStrH) {
      m.innerText = valNewH;
    }
  }
}

localizeHtmlPage();
