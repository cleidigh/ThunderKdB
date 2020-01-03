dispMUA.init_overlay = () =>
{
  if (dispMUA.bundle != null)
  {
    return;
  }

  //dispMUA.bundle = document.getElementById ( "dispmua-strings" ) ;
  dispMUA.bundle = Services.strings.createBundle("chrome://dispmua/locale/dispmua.properties");

  dispMUA.loadJSON("dispmua-database.json");

  var listener = {};
  listener.onStartHeaders = () => {};
  listener.onEndHeaders = dispMUA.loadHeaderData;
  gMessageListeners.push(listener);

  var elem = document.getElementById("mailContext");

  if (elem)
  {
    elem.addEventListener("popupshowing", dispMUA.checktextPopup, false);
  }

  dispMUA.loadMUAOverlayFile();
}

window.addEventListener("messagepane-loaded", dispMUA.init_overlay, true); // problem for 68
window.addEventListener("load", function() { // for 68
  var messagepane = document.getElementById("messagepane");
  if(messagepane) messagepane.addEventListener("load", function () { dispMUA.init_overlay(); }, true);
}, false);
