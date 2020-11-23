/*
browser_action script
Listen for clicks in the popup. Inserted via html page
*/

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("abs")) {
    var id = e.target.id;

    var gettingActiveTab = messenger.tabs.query({active: true, currentWindow: true});
    gettingActiveTab.then((tabs) => {
      if (id=="abs_openoptions") {
				messenger.runtime.openOptionsPage();
      } else if (id=="abs_upload") {
        //console.log("abs_actions: popup event: Upload");
				messenger.abs.showPopup('upload', '', 'manual', true/*force*/);
      } else if (id=="abs_download") {
        //console.log("abs_actions: popup event: Download");
				messenger.abs.showPopup('download', '', 'manual', true/*force*/);
//      } else {
//        var sending = messenger.tabs.sendMessage(tabs[0].id, {id: id});
////        sending.then(handleResponse, handleError);
      }
    });
  }
});

