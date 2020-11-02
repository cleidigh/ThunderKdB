 async function loadIntoWindow(window) {
    await browser.fpvs_api.loadIntoWindow()
}
async function forEachOpenWindow() {
      var bool= await browser.fpvs_api.on_start()
      loadIntoWindow(window);
  }
  var listner = function(){
      try{browser.fpvs_api.on_start();browser.fpvs_api.onLoad();}
      catch(err){console.error(err);}
    };browser.runtime.onInstalled.addListener(listner);
    forEachOpenWindow();


var listnerUninstalled=function(){
    browser.fpvs_api.unLoad();
}
   // browser.management.onUninstalled.removeListener(listnerUninstalled);
    browser.management.onUninstalled.addListener(listnerUninstalled)