var port = browser.runtime.connectNative("myphoneexplorer.extension");
var debugMode = false;
port.postMessage("ping");

port.onMessage.addListener((response) => {
  debugPrint("Received: " + response);
  if (response == "debug"){debugMode = true;}
  
  if (response.startsWith("pong") == false && response.startsWith("result") == false){
	  browser.MyPhoneExplorer.HandleCommand(response);
  }
});

browser.MyPhoneExplorer.onCommandResult.addListener(function(data) {
	sendNativeMessage(data);
});


function sendNativeMessage(message){
	debugPrint("Sending:  " + message);
  	port.postMessage(message);
}

function debugPrint(text){
	if (debugMode == true){console.log(text);}
}
