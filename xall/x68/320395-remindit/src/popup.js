function listenForClicks(){
    document.addEventListener("click", (e) => {

	dd=null;
	
	if( e.target.id=="+7" || e.target.id=="ok" ){
	    date=e.target.ownerDocument.getElementById("reminditdate");
	
	    if( date && date.value ){
		dd=new Date(date.value);
		if( e.target.id=="+7" ){
		    dd=new Date(dd.getTime()+7*24*3600*1000);
		}
	    }
	}
	obj={"message" : e.target.id, type : "click"};
	if( dd ){
	    obj.reminddate=dd;
	}
	browser.runtime.sendMessage(obj).catch();
	if( e.target.classList.contains("button") ){
	    window.close();
	    }
    });
}

function reportError(error){
    console.error("Error in : ${error}");
}




browser.runtime.sendMessage({type : "popup"}).then((resp)=>{
    document.getElementById("reminditdate").value=resp;
});

listenForClicks();
browser.runtime.onMessage.addListener((request,sender,sendResponse)=>{

    document.getElementById("reminditdate").value=request.info.reminddate.toISOString().slice(0,10);
    
});

