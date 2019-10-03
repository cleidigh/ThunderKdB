var EXPORTED_SYMBOLS = ["manage","setReminder","addHeader"];

Components.utils.import("resource://gre/modules/Services.jsm");

var logger=Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);

var locations={
    "chrome://messenger/content/messenger.xul" :
    [
	{
	    "type" : "datepicker",
	    "id" : "RemindIt.MailDatePicker", 
	    "attrs" : [
		["type", "popup"]
	    ],
	    "eventlistener" : {
		"type" : "change",
		"listener" : setReminder
	    },
	    "action" : "insertBefore",
	    "anchor" : "otherActionsBox"
	}
	
    ],
    
    "chrome://messenger/content/messengercompose/messengercompose.xul" :
    [
	{    "type" : "datepicker",
	     "id" : "RemindIt.ComposeDatePicker", 
	     "attrs" : [
		 ["type" , "popup"]
	     ],
	     "action" : "appendChild",
	     "anchor" : "composeToolbar2"
	}

    ]
};


function setReminder(e){
    plist.setReminder(e);
    
}

function manage(add){
   
    wins=Services.ww.getWindowEnumerator();
    while( wins.hasMoreElements() ){
	win=wins.getNext();
	setElements(locations[win.document.location],add,win);
    }

    if(add){
	Services.wm.addListener(windowListener);
    }
    else{
	Services.wm.removeListener(windowListener);
    }

}

function setElements(ll,add,win){
    if( !ll ){
	return;
    }
    
    var xul="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    for(e=0;e<ll.length; e++){
	var l=ll[e];

	if( add ){
	    var elt=win.document.getElementById(l.id);
	    if( elt ){
		elt.parentNode.removeChild(elt);
	    }
	    elt=win.document.createElementNS(xul,l.type );
	    elt.setAttribute("id", l.id);
	    for(i=0; i<l.attrs.length; i++){
		var v=l.attrs[i];
		elt.setAttribute(v[0],v[1]);
	    }
		    
	    if( l.eventlistener ){
		var el=l.eventlistener;
		elt.addEventListener(el.type,el.listener);
	    }
	    

	    var a=win.document.getElementById(l.anchor);
	    if( l.action=="insertBefore" ){
		a.insertBefore(elt,a.firstChild);
	    }
	    else if( l.action=="appendChild" ){
		a.appendChild(elt);
	    }

	}
	else{
	    var elt=win.document.getElementById(l.id);
	    if( elt ){
		elt.parentNode.removeChild(elt);
	    }
	}
    }

 
	    
}



function onWinLoad(event){
    var win=event.currentTarget;
    setElements(locations[win.document.location],true,win );
    if(win.document.location=="chrome://messenger/content/messenger.xul" ){
	plist.setTimer();
    }
    
}

// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWindowMediator#addListener()
var windowListener = {
    onOpenWindow: function (aWindow) {
        // Wait for the window to finish loading
        let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);

        domWindow.addEventListener("load", onWinLoad, true);
	domWindow.addEventListener("compose-send-message", onComposeSendMessage, true);
	
   },
    onCloseWindow: function (aWindow) {},
    onWindowTitleChange: function (aWindow, aTitle) {}
};

function onComposeSendMessage(event){
    if( event.type=="compose-send-message" ){
	var win=event.currentTarget;
	var doc=event.currentTarget.document;
	var d=new Date(doc.getElementById("RemindIt.ComposeDatePicker").value);
	if( d>new Date()){	
	    win.gMsgCompose.compFields.setHeader("X-RemindIt",d.toString());
	    //logger.logStringMessage("header set");
	}
	else{
	}
    }
}

