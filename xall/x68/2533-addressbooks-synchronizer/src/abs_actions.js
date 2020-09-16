/*
browser_action script
Listen for clicks in the popup. Inserted via html page
*/

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("abs")) {
    var id = e.target.id;

/*
    function handleResponse(message) {
      console.log("ggsng: response: "+message.state+' '+message.length);
    }
    function handleError(error) {
      console.log("ggsng: Error: "+error);
    }
*/
    var gettingActiveTab = messenger.tabs.query({active: true, currentWindow: true});
    gettingActiveTab.then((tabs) => {
      if (id=="abs_openoptions") {
				messenger.runtime.openOptionsPage();
      } else if (id=="abs_upload") {
        console.log("ABS: popup event: Upload");
				messenger.abs.showPopup('upload', '', 'manual', true/*force*/);
      } else if (id=="abs_download") {
        console.log("ABS: popup event: Download");
				messenger.abs.showPopup('download', '', 'manual', true/*force*/);
//      } else {
//        var sending = messenger.tabs.sendMessage(tabs[0].id, {id: id});
////        sending.then(handleResponse, handleError);
      }
    });
  }
});

/*
// receive current state information
function abs_state(request, sender, sendResponse) {
  console.log('ggsng: addon: state='+request.state+' '+'length='+request.length);
    //use this to enable/disable menu entries
//Change 'start hinding' to 'Stop hiding' or back
//enable or disable the unhide menu entries
  var undo;
  if (request.state=="started") {
    undo=document.getElementById('ggs_start');
    undo.classList.add('disabled');
    undo=document.getElementById('ggs_stop');
    undo.classList.remove('disabled');
  } else {
    undo=document.getElementById('ggs_start');
    undo.classList.remove('disabled');
    undo=document.getElementById('ggs_stop');
    undo.classList.add('disabled');
  }
  if (request.length && request.state=="started") {
    undo=document.getElementById('ggs_ul');
    undo.classList.remove('disabled');
    undo=document.getElementById('ggs_ua');
    undo.classList.remove('disabled');
  } else {
    undo=document.getElementById('ggs_ul');
    undo.classList.add('disabled');
    undo=document.getElementById('ggs_ua');
    undo.classList.add('disabled');
  }
}
messenger.runtime.onMessage.addListener(abs_state);

// request current state information
var gettingActiveTab = messenger.tabs.query({active: true, currentWindow: true});
gettingActiveTab.then((tabs) => {
  var sending = messenger.tabs.sendMessage(tabs[0].id, {id: "abs_state"});
});
*/
