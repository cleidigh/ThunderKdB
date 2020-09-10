function onLoad(activatedWhileWindowOpen) {  
  WL.injectCSS("resource://getsendbutton/skin/getsendbutton.css");
  WL.injectElements(``,
  ["chrome://getsendbutton/locale/getsendbutton.dtd"]);
}

function onUnload(deactivatedWhileWindowOpen) {
}
