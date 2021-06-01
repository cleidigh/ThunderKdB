function onLoad(activatedWhileWindowOpen) {  
  WL.injectCSS("resource://attachmentextractor_cont/skin/aec_buttons.css");
  WL.injectElements(``,
  ["chrome://attachmentextractor_cont/locale/attachmentextractor.dtd"]);
}

function onUnload(deactivatedWhileWindowOpen) {
}
