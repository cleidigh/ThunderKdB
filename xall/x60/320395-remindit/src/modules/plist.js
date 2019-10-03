var EXPORTED_SYMBOLS = ["stop","start","setReminder","setTimer"];
var logger=Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);

var list=[];
var byUri={}
var prefname="extensions.remindit-2.0.0.plist";
var keyTags={};
var messenger;
var timewin;
var timeout=null;


function start(){
    
    initTag(); 
    

    try{
	s=Services.prefs.getCharPref(prefname);
	list=JSON.parse(s);
	for(i=0; i<list.length; i++){
	    list[i].expire=new Date(list[i].expire);
	    list[i].soon=new Date(list[i].soon);
	    byUri[list[i].uri]=list[i];
	    setTag(list[i]);
	}	

    }
    catch(e){
	logger.logStringMessage(e.toString());

	
    }	

    
    manageListeners(true);

    setTimer();


    
}

function getT(t,n,x){
    if( x<n ){
	return t;
    }
    return (t==null || x<t ) ? x : t;
}

function clearTimer(){
    if( timeout==null ){
	return;
    }
    
    if( !timewin ){
	logger.logStringMessage("no win timeout");
	return;
    }
    
    if( timeout!=null ){
	timewin.clearTimeout(timeout);
    }

}

function setTimer(){
    clearTimer();
    if( !timewin ){
	manageListeners(true);
    }
    if( !timewin ){
	return;
    }

    var t=null;
    var n=new Date();

    for(i=0; i<list.length; i++){
	setTag(list[i]);
	t=getT(t,n,list[i].soon);
  	t=getT(t,n,list[i].expire);
    }
   

    if( t>n ){
	timeout=timewin.setTimeout(setTimer, t.getTime()-n.getTime());	
    }

}

function stop(){
    save();
    manageListeners(false);
    for(uri in byUri ){
	clearTag(uri);
    }
    clearTimer();
    
}

function initTag(){

    var ts=Components.classes["@mozilla.org/messenger/tagservice;1"]
		.getService(Components.interfaces.nsIMsgTagService);
    
    var tags={"RemindIt": "#F0F0F0",
	      "RemindIt Pending" :"#33CC00",
	      "RemindIt Soon" : "#FF9900",
	      "RemindIt Expired" : "#FF0000"};
	    
    i=0;
    for(k in tags){
	keyTags[k]=ts.getKeyForTag(k);
	if( ! keyTags[k] ){
	    ts.addTag(k,tags[k],"RemindIt."+i);
		    
	    keyTags[k]=ts.getKeyForTag(k);
	    if( !keyTags[k] ){
		logger.logStringMessage("Error, unable to create tag "+k);
		    }
	}
	i++;
    }

    messenger=Components.classes["@mozilla.org/messenger;1"]
	.createInstance(Components.interfaces.nsIMessenger);

}

function manageTag(uri,k,add){

    if( !messenger ){
	logger.logStringMessage("No messenger");
	return;
    }
    try{
	hdr=messenger.msgHdrFromURI(uri);
    }
    catch(e){
	logger.logStringMessage("No hdr fund "+e.toString()+" "+uri);
	return;
    }
    var msg = Components.classes["@mozilla.org/array;1"]
	.createInstance(Components.interfaces.nsIMutableArray);
    msg.clear();
    msg.appendElement(hdr,false);
	    
    if(add){
	hdr.folder.addKeywordsToMessages(msg,keyTags[k]);
    }
    else{
	hdr.folder.removeKeywordsFromMessages(msg,keyTags[k]);
    }
   
}

function setTag(x){
    clearTag(x.uri);
    var n=new Date(Date.now());
    var k;
    if( x.expire<=n ){
	k="RemindIt Expired";
    }
    else if( x.soon <=n ){
 	k="RemindIt Soon";
    }
    else {
 	k="RemindIt Pending";
    }
    manageTag(x.uri,k,true);
    
}

function clearTag(uri){
    for( k in keyTags ){
	manageTag(uri,k,false);
    }
}

function setAllTags(){
    for(i=0; i<list.length; i++){
	if( list[i].uri!=0 ){
	    setTag(list[i]);
	}
    }
}

function save(){
    x=[]
    for(i=0; i<list.length; i++){
	if( list[i].uri!=0 ){
	    x.push(list[i]);
	    setTag(list[i]);
	}
    }
    Services.prefs.setCharPref(prefname, JSON.stringify(x));
}

function setReminder(e){
    var dd=Date.parse(e.target.value);
    if( isNaN(dd) ){
	return;
    }
    var d=new Date(dd);
    var uri=Services.ww.activeWindow.gFolderDisplay.selectedMessageUris[0];

    setReminderOnUri(d,uri);

}
	
function setReminderOnUri(d,uri){
    var n=new Date();

        
    if( d<n ){
	if( byUri[uri] ){
	    clearTag(uri);
	    byUri[uri].uri=0;
	    delete byUri[uri];
	}
	setTimer();
	save();
	return;
    }
    d.setHours(n.getHours());
    d.setMinutes(n.getMinutes());
    d.setSeconds(n.getSeconds());

    var x={};
    if( byUri[uri] ){
	x=byUri[uri];
    }else{
	list.push(x);
    }
    x.uri=uri;
    x.expire=d;
    x.soon=new Date(d.getTime()-3*24*3600*1000);
    byUri[uri]=x;
    setTimer();
    save();
}

function getISODate(x){
    return x.getFullYear()+"-"+(x.getMonth()+1)+"-"+x.getDate();
}

function handleHdrView(event){
    //logger.logStringMessage("handleHdrView");
    
    // to avoid tags not updated after pc sleep
    // could check time of timer first
    setTimer();

    doc=event.currentTarget.ownerDocument;

    elt=doc.getElementById("RemindIt.MailDatePicker");

    if( !elt  ){
	return;
    }
    var uri;
    if( !Services.ww.activeWindow || !Services.ww.activeWindow.gFolderDisplay ){
	return;
    }
    var smUris=Services.ww.activeWindow.gFolderDisplay.selectedMessageUris;
    if( smUris && smUris.length>0 ){
	uri=smUris[0];
    }
    
    if( uri &&  byUri[uri] ){	
	   elt.value=getISODate(byUri[uri].expire);
    }
    else{
	elt.value=getISODate(new Date());
    }

}

function manageListeners(add){

    // Header view listener
    
    wins=Services.ww.getWindowEnumerator();
    while( wins.hasMoreElements() ){
	win=wins.getNext();
	if( win.document.location==
	    "chrome://messenger/content/messenger.xul" ){
	    timewin=win;
	    
	    elt=win.document.getElementById("messagesBox");
	    if( add ){
		elt.addEventListener("load",handleHdrView,true);

	    }
	    else{
		elt.removeEventListener("load",handleHdrView,true);

	    }
	}
    }

    
    let ns = 
    Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
	.getService(Components.interfaces.nsIMsgFolderNotificationService);
    if( add ){
	ns.addListener(FolderListener,ns.msgAdded |
		       ns.msgsMoveCopyCompleted);
    }
    else{
	ns.removeListener(FolderListener);
    }
    


}

var     FolderListener={
    msgAdded: function(aMsgHdr){
	//logger.logStringMessage("msgAdded "+aMsgHdr)
    },

    msgsMoveCopyCompleted: function( aMove, aSrcMsgs, DestFolder, DstMsgs){	
	//logger.logStringMessage("msg moved ?"+aMove)

    }
}
