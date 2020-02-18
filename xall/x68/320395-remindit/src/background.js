var displayedMsg;
var tagsOk=true;
//var reminders=new Map();
var tmp=new Map();

var reminders=new Reminders();
function cmpHdr(a,b){
    return a.author==b.author
	&& a.date.toString()==b.date.toString()
	&& a.recipients.toString()==b.recipients.toString()
	&& a.subject==b.subject;
}
function storedhdrToHdr(storedhdr){
    storedhdr.date=new Date(storedhdr.date);
    storedhdr.reminddate=new Date(storedhdr.reminddate);
}

function hdrSign(hdr){
    return hdr.author+hdr.date.toString()+hdr.subject+hdr.recipients.toString();
}

function handleList(list){
    if( list && list.messages && list.messages.length>0 ){
	for( m of list.messages ){
	    storedhdr=tmp.get(hdrSign(m));
	    
	    if( cmpHdr(m,storedhdr) ){
		m.reminddate=storedhdr.reminddate;
		reminders.set(m);
		return;
	    }
	}
    }
    if( list.id ){
	browser.messages.continueList(list.id).then((l)=>{
	    handleList(l,storedhdr);
	});
    }  
}
function Reminders(){

    this.map=new Map();

    this.set=function(hdr){
	this.map.set(hdr.id,hdr);
	this.store();

	this.setTagAndAlarm(hdr);
    }

    this.setTagAndAlarm=function(hdr){
	if(   hdr.reminddate ){
	    delay=Math.floor((hdr.reminddate.getTime()- Date.now())/(60*1000));
	    tag="remindit_expired";
	    if( delay>0 ){
		tag="remindit_pending";
		browser.alarms.create( "remindit-"+hdr.id,
				   { delayInMinutes : delay });
	    }
	    p={};
	    p.tags=hdr.tags
		.filter(t => (t!= "remindit_pending" && t!="remindit_expired"));
	    p.tags.push(tag);
	    browser.messages.update(hdr.id,p);
	}
	
    }

    this.clear=function(){
	this.map=new Map();
    }

    this.get=function(id){
	return this.map.get(id);
    }

    this.delete=function(hdr){
	if( this.map.delete(hdr.id) ){
	    this.store();
	    browser.alarms.clear( "remindit-"+hdr.id );
	    p={}
	    p.tags=hdr.tags
		.filter(t => (t!= "remindit_expired" && t!="remindit_pending"));
	    browser.messages.update(hdr.id,p);
	}

    }

    this.handleItem=function(item){
	p=[];
	if( item && item.remindit &&
	    item.remindit.list && Array.isArray(item.remindit.list)){
	    for( storedhdr of item.remindit.list){
		if( storedhdr.reminddate ){
		    storedhdrToHdr(storedhdr);
		    q={fromDate: storedhdr.date,
		       toDate: storedhdr.date };
		    tmp.set(hdrSign(storedhdr), storedhdr);
		    p.push(browser.messages.query(q).then(handleList));
		}
		else{
		    console.log("No reminddate in stored header, giving up");
		    console.log(storedhdr);
		}
	    }
	    Promise.all(p);
	}
    }
    
    this.load=function (){
	this.map=new Map();
	tmp=new Map();
	browser.storage.sync.get("remindit")
	    .then(this.handleItem);
    }

    this.store=function(){
	remindit={list:[]};
	for( [k,v] of this.map){
	    remindit.list.push(v);
	}
	browser.storage.sync.set({remindit});
    }


    this.show=function(){
	
	for( [k,v] of this.map ){
	    console.log("k="+k+" v="+v);
	}
    }

    this.showInfo=function(info){
	return info.id+"\n"+info.messageid+"\n"+info.subject+"\n"+info.date;
    }
}

function recordDisplayedMessage(tabId, hdr){
    displayedMsg=hdr;
    browser.runtime.sendMessage({hdr: hdr})
	.then((msg)=>{}, (err)=>{});;
}




function onAlarm(alarm){
    header=reminders.get(Number.parseInt(alarm.name.slice(9)));
    reminders.setTagAndAlarm(header);
}

function handleMessage(request,sender,sendResponse){
    if( request.type && request.type=="popup" ){
	hdr=reminders.get(displayedMsg.id);
	
	if( hdr && hdr.reminddate ){
	    sendResponse(hdr.reminddate.toISOString().slice(0,10));
	}
	else{
	    d=new Date(new Date().getTime()+7*24*3600*1000);
	    sendResponse(d.toISOString().slice(0,10));
	}
	return;
    }
    if( request.message ){
	header=displayedMsg;
	
	prop={};
	prop.tags=header.tags;

	if(  request.message=="ok"  ){
	    header.reminddate=new Date(request.reminddate);
	    reminders.set(header);
	}
	if( request.message=="remove" ){
	    reminders.delete(displayedMsg);
	   
	}
    }
    
}




// Check for remindit tags
var neededTags=["remindit_pending", "remindit_expired"];

browser.messages.listTags().then((l)=>{
    for( i in l ){
	neededTags=neededTags.filter( k => k!=l[i].key);
    }
    if( neededTags.length!=0 ){
	console.error("Please create tags before : "+
		      neededTags.reduce((a,b) => a+" "+b,""));
	tagsOk=false;
    }
});


if( tagsOk ){
    browser.runtime.onMessage.addListener(handleMessage);
    browser.messageDisplay.onMessageDisplayed.addListener(recordDisplayedMessage);
    browser.alarms.onAlarm.addListener(onAlarm);
    reminders.load();
    reminders.show();
}
