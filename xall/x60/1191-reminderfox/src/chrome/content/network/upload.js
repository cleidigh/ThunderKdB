if (!reminderfox)     var reminderfox = {};
if (!reminderfox.network)    reminderfox.network = {};
if (!reminderfox.network.upload)    reminderfox.network.upload = {};

if (!reminderfox.network.upload.reminderFox_upload_headless ) 
	reminderfox.network.upload.reminderFox_upload_headless = null;
	
reminderfox.network.upload.reminderFox_upload_Startup = function()
{
	reminderfox.network.upload.reminderFox_upload_headless = reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI;
  	reminderfox.network.upload.reminderFox_upload_statusTxt(reminderfox.string("rf.upload.ready.label"),0);
  	setTimeout(reminderfox.network.upload.reminderFox_upload_senddata, 0);
}

reminderfox.network.upload.reminderFox_upload_Startup_headless = function(headlessLevel)
{
	 reminderfox.network.upload.reminderFox_upload_headless = headlessLevel; 
 	 reminderfox.network.upload.reminderFox_upload_statusTxt(reminderfox.string("rf.upload.ready.label"),0);
 	 setTimeout(reminderfox.network.upload.reminderFox_upload_senddata, 0);
}

reminderfox.network.upload.reminderFox_upload_closeWindow = function() {
   if ( window.arguments != null && window.arguments[0] != null && window.arguments[0].closeOnNoErrors == 1) {
      close();
   }
   else {
      var reminderFox_upload_button= document.getElementById("reminderFox_upload_button");
      reminderFox_upload_button.setAttribute("label",reminderfox.string("rf.net.done") ); 	
   }
}

reminderfox.network.upload.reminderFox_upload_senddata = function() {
  var _uploadURL = "";
  var _ioService = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

  var proto = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, reminderfox.consts.NETWORK.PROTOCOL_DEFAULT);
  var address = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.ADDRESS, "");
  var _username = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.USERNAME, "");
  
    if ( address == null || address.length == 0 ) {
  	  reminderfox.network.upload.reminderFox_uploadCallback(reminderfox.string("rf.net.done"),-1);
  	  return;
  }
  
  
  var loginData = {
    ljURL : proto + "://" + address,
    username : _username,
    password : ''
  };

  loginData = reminderFox_getPassword(loginData);

  if (loginData == null || loginData.password == null) {
  	// no password found on password manager - user HAS TO set this password first!
    	reminderfox.network.upload.reminderFox_uploadCallback(reminderfox.string("rf.upload.noPasswordSet.label"),3);
		return;
  }
  
  // uri-encode username and password
  _username = encodeURIComponent( _username );
  var _password = encodeURIComponent (loginData.password );
 	
  _uploadURL = proto + "://" + _username + ":" + _password + "@" + address;
 
  reminderfox.network.upload.reminderFox_upload_statusTxt(reminderfox.string("rf.upload.exporting.label"),0);
  var i;

  
//  // safety check: if there are no events and no todo's in the local file, we will assume that this an error condition 
//  // (this happens frequently with icalx.com where the remote file gets cleared) and will not upload the local reminders
//  var hasTodos = false;  			 
//  for ( var n in _todosArray ) {
//		var reminderFoxTodos = reminderTodos[n];
//		if (reminderFoxTodos.length > 0  ) {
//			hasTodos = true;
//			break;
//		}	  	
//  }
//  if ( _reminderEvents.length == 0 || !hasTodos ) {
//  		reminderfox.core.logMessageLevel( 
//			  			"Failed: local file has no events or todo's...", reminderfox.consts.LOG_LEVEL_FINE);  		
//	 	return;
//  	}


  var _reminderEvents = reminderfox.core.getReminderEvents();
  var _todosArray = reminderfox.core.getReminderTodos();  // iterate over all reminders
  var str=reminderfox.core.constructReminderOutput(_reminderEvents, _todosArray, true);


  // now clear the reminders so the Add Reminder doesn't use them (because they would have escaped commas)
  reminderfox.core.clearRemindersAndTodos();

  var uploadURI = _ioService.newURI(_uploadURL,null,null);
  var mimetype = "txt/xml; charset=UTF-8"; 
  if(!str)
  {
    reminderfox.network.upload.reminderFox_uploadCallback(reminderfox.string("rf.net.done"),-3);
    return;
  }else if( ! gUploadService.start(str,
                                    uploadURI,
                                    mimetype,reminderfox.network.upload.reminderFox_uploadCallback)) {

    reminderfox.network.upload.reminderFox_uploadCallback(reminderfox.string("rf.net.done"),-1);
  }
}

reminderfox.network.upload.reminderFox_uploadCallback = function(aStatus,aError) {
   reminderfox.core.logMessageLevel( "  Uploaded reminders...", reminderfox.consts.LOG_LEVEL_FINE);

  if(aStatus != reminderfox.string("rf.net.done") && aError==0) {
    reminderfox.network.upload.reminderFox_upload_statusTxt(aStatus,aError);
    return;
   }
  switch(aError){
    case -2:
      reminderfox.network.upload.reminderFox_upload_statusTxt(aStatus,aError);
		if ( reminderfox.network.upload.reminderFox_upload_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS) {
			var status =   (aError)?reminderfox.network.upload.reminderFox_upload_getErrorMsg(aError):aStatus;
			alert( reminderfox.string("rf.add.network.status.msg.error") + ": " + status );
  		}         
      break;
    case 0:
       	if ( !(window.arguments != null && window.arguments[0] != null && window.arguments[0].closeOnNoErrors == 1)) {
      		 reminderfox.network.upload.reminderFox_upload_statusTxt(aStatus,aError);
      	}    	
      break;
    case -3:
      reminderfox.network.upload.reminderFox_upload_statusTxt(reminderfox.string("rf.upload.sourceFileNotFound.label"),0);
		if ( reminderfox.network.upload.reminderFox_upload_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS) {
			var status =   (aError)?reminderfox.network.upload.reminderFox_upload_getErrorMsg(aError):aStatus;
			alert( reminderfox.string("rf.add.network.status.msg.error") + ": " + status );
  		}         
      break;
    case 201:
      reminderfox.network.upload.reminderFox_upload_statusTxt(reminderfox.string("rf.upload.created.label"),0);
		if ( reminderfox.network.upload.reminderFox_upload_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS) {
			var status =   (aError)?reminderfox.network.upload.reminderFox_upload_getErrorMsg(aError):aStatus;
			// 201 means that the file was created successfully - we don't need to show this message - icalexchange, for 
			// instance, returns this code every time you write the file (I guess because it recreates it each time)
			//alert( "ReminderFox: " + status );
  		}         
      break;
    default:
     	 reminderfox.network.upload.reminderFox_upload_statusTxt(aStatus,aError);
		if (reminderfox.network.upload.reminderFox_upload_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS) {
			var status = null;
			if (aError == -1) {
				status = aStatus;
			}
			else {
				(aError) ? reminderfox.network.upload.reminderFox_upload_getErrorMsg(aError) : aStatus;
			}
			alert( reminderfox.string("rf.add.network.status.msg.error") + ": " + status );
  		}      
      return;
      break;
  }

//    if ( aError == 0 ) { 
      if ( reminderfox.network.upload.reminderFox_upload_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
		  reminderfox.network.upload.reminderFox_upload_closeWindow();
  	  }

//  }


}

reminderfox.network.upload.reminderFox_upload_statusTxt = function(aStatus,aError)
{
	if (reminderfox.network.upload.reminderFox_upload_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI ) {
  			 document.getElementById("status").value =(aError)?reminderfox.network.upload.reminderFox_upload_getErrorMsg(aError):aStatus;
  		}
  		else {
  			var value = (aError)?	reminderfox.network.upload.reminderFox_upload_getErrorMsg(aError):aStatus;
			reminderfox.core.logMessageLevel("RmFX  Upload (headless): " + new Date() + " " + value, reminderfox.consts.LOG_LEVEL_FINE);
  		}	
}

reminderfox.network.upload.reminderFox_cancelUpload = function()
{
  gUploadService.cancel();
	close();
}


reminderfox.network.upload.reminderFox_upload_getErrorMsg = function(aStatus)
{
  if(aStatus==0)
    return reminderfox.string("rf.ok");;

  var status=aStatus % 0x804b0000;
  var error=reminderfox.string("rf.upload.unexpected.label");
  switch(status)
  {
    case 1:
      error=reminderfox.string("rf.upload.unexpected.label");
      break;
    case 2:
      error=reminderfox.string("rf.upload.usercancel.label");
      break;
	case 3:
      error=reminderfox.string("rf.upload.noPasswordSet.label");
      break;	  
    case 13:
      error=reminderfox.string("rf.upload.refused.label");
      break;
    case 14:
      error=reminderfox.string("rf.upload.netTimeout.label");
      break;
    case 16:
      error=reminderfox.string("rf.upload.netOffline.label");
      break;
    case 21:
      error=reminderfox.string("rf.upload.loginfailure.label");
      break;
    case 22:
      error=reminderfox.string("rf.upload.ftpcwd.label");
      break;
    case 23:
      error=reminderfox.string("rf.upload.ftppasv.label");
      break;
    case 24:
      error=reminderfox.string("rf.upload.ftppwd.label");
      break;
    case 25:
      error=reminderfox.string("rf.upload.ftplist.label");
      break;
    case 30:
      error=reminderfox.string("rf.upload.unknown.label");
      break;
    case 201:
      reminderfox.network.upload.reminderFox_upload_statusTxt(reminderfox.string("rf.upload.created.label"),0);
      break;
    case 401:
      error=reminderfox.string("rf.upload.loginfailure.label");
      break;
    case 405:
      error=reminderfox.string("rf.upload.methodNotAllowed.label");
      break;
    case 409:
      error=reminderfox.string("rf.upload.DestFileNotDefined.label");
      break;
    default:
      error=reminderfox.string("rf.upload.unexpected.label");
      break;
  }

  var formatted= (aStatus<0x804b0000)?
          aStatus.toString(10) : "0x" + aStatus.toString(16).toUpperCase();
  return  error + " (" + formatted + ")\n";
}
