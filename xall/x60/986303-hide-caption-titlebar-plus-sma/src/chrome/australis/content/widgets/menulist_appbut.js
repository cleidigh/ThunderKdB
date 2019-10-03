/*

Usar esto para llamar dsd el XML del futuro XBL_binding?

var js_url= "xxxx.js" + "?"+Date.now();  //  Date.now() ONLY at development time to BYPASS CACHE!!!

var mozIJSSubScriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                            .getService(Components.interfaces.mozIJSSubScriptLoader);
mozIJSSubScriptLoader.loadSubScript(js_url, targetObj); // in charset Optional

*/

/*         ---  Menulist_Appbutton  object!  ----            */
HideCaption_opt.Menulist_Appbutton= new (function Menulist_Appbutton_class(){

	// INIT
	this.init_All_My_Menulists= function(){
			
			setTimeout( function(){
				var menulists= document.getElementsByTagName('menulist');
				for (var i = 0; i < menulists.length; ++i){
					if( menulists[i].getAttribute("hctp_appbutton") == "true" ){ // case sensitive!
						try{
							HideCaption_opt.Menulist_Appbutton.doMenuListAppButton(menulists[i]);
						}catch(ex){ 
							HCPlusLib.debugError     (""+ex, ex);
						}
					}
				}
			}, 10);
	};

	this.doMenuListAppButton= function(elem){

		const isMax= elem.getAttribute("hctp_fx_isMax") == "true";
		
		if( !elem.labelElem ){ 			//INITIALIZATION!
			elem.labelElem=  elem.firstChild.firstChild; //document.getElementById("appbutton-"+elem.id);
			
			//oncommand="HideCaption_opt.Menulist_Appbutton.doMenuListAppButton(this);"
			elem.addEventListener("command", function(event){ HideCaption_opt.Menulist_Appbutton.doMenuListAppButton(elem); }, false);
			
			//set LABEL-element! for more performance here!
			//HCPlusLib.set_Firefox_button(elem.labelElem, elem.selectedItem.value);

			setTimeout(function(){
			  Array.slice( elem.menupopup.getElementsByTagName( "menuitem" ) ).forEach(function(mItem){

				//HCPlusLib.myDumpToConsole("  mItem.value  = "+mItem.value );

				/* -- attempt to handle anon content....
				var mtFirstChild= null;
				
				var anonChildren= document.getAnonymousNodes(mItem);
				if( anonChildren ){
					mtFirstChild= anonChildren.length > 0? anonChildren[0]: null;

					try{
						if( mtFirstChild ){
							mtFirstChild.parentNode.removeChild(mtFirstChild); //error like "Node not found"!, even INSPECTOR can't insert a sibling of anonchild with NON-anon parent!
						}
					}catch(ex){
						HCPlusLib.debugError(" removechild():  "+ex, ex );
					}
						
				}else{
					HCPlusLib.myDumpToConsole(" anonChildren  is null " );
				}
				*/
				
				
				/*
				if( mItem.firstChild ){
					mItem.removeChild(mItem.firstChild);
				}
				*/
				
				//var XUL_ns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
				var button= document.createElement("button"); //createElementNS(XUL_ns, ..)
				
				//NamedNodeMap
				Array.slice(elem.labelElem.attributes).forEach(function(mAttr){
					if( mAttr.name != "id" ){
						button.setAttribute(mAttr.name, mAttr.value);
					}
				});
				
				var fx_data  = {	icon: mItem.value,	text: "",	};
				
				HCPlusLib.set_Firefox_button( button, fx_data);

				button.keepApStyle= true;

				//tem.appendChild (button);
				mItem.insertBefore(button, null);  //mtFirstChild
				
				/*
				if( mtFirstChild ){
					mtFirstChild.insertBefore(button, null); //parentNode  //success, but anon-parent box has display:none
				}else{
					mItem.insertBefore(button, null);  //mtFirstChild
				}
				*/
				
			  });
			}, 10);
		}
		
		if( elem.selectedItem != null ){
			const fx_data= HCPlusLib.HcSingleton.getFxData(isMax);
			fx_data.icon= elem.selectedItem.value;
			HCPlusLib.set_Firefox_button(elem.labelElem, fx_data);
		}
	};

})();
