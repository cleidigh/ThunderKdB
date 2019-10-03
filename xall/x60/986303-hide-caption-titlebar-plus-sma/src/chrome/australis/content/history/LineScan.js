
"use strict";

var EXPORTED_SYMBOLS = ["LineScan_class"];


var LineScan_class= function( _win ){

	const window      = _win;
	const document    = window.document;
	
	const HCPlusLib   = window.HCPlusLib;

	
	const thySelf= this;
	
	//------------------------------------------
    
	// CREATES ELEMENT #hctp_scan_box  !!! - y se limpia solo cuando se va el parent!
	
	var play_negative_Audio= true;
	
    var scanBox_setted= false;
    var hctp_scan_box= null;
    function scanBox_set( _value, _scanBox_setted ){
    	if(!hctp_scan_box ){
    		hctp_scan_box= document.getElementById("hctp_scan_box");
    		
    		if(!hctp_scan_box){
    			const parentBox = document.getElementById("hcp-root-box");
    			const newBox    = document.createElement("box");
    			newBox.id= "hctp_scan_box";
    			//newBox.classList.add("test71");
    			parentBox.insertBefore(newBox, null);

    			//again!
        		hctp_scan_box= document.getElementById("hctp_scan_box");
    		}
			
			play_negative_Audio= HCPlusLib.z_sys_intFlags.indexOf("noNavAudio") < 0; // es una clave para anular!
			
			/***
			// TODO: usar el evento "transitionend"
			function transitionend(event) {
				window.console.log('Transition has finished:  '+event.propertyName+"   "+event.elapsedTime);
				if( left || right ...){ // NO probado aun
					scanBox_set("", false);
				}
			}
			hctp_scan_box.addEventListener("transitionend", transitionend, false);
			***/
    	}
    	
    	hctp_scan_box.setAttribute("doScan",""+_value);
    	scanBox_setted= _scanBox_setted;
    	//turn hctp_scan_box;
    };
    
	const scanBox_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
    function  scanBox_doScan( goFw ){
    	if( scanBox_setted ){
    		scanBox_setted= false; // redundant, to be SURE!
        	scanBox_set("", false);
        	scanBox_tOut.setTimeout(function(){
        		scanBox_doScan( goFw ); // call it again ...
        	}, 10);
        	return; // !!!
    	}
    	
    	scanBox_set(goFw?"forw":"back", true);
    	scanBox_tOut.setTimeout(function(){
        	scanBox_set("", false);
    	}, 600);
    };
	
	// THIS section -------------------------------
	
    this.doScan= function( goFw ){
		if( HCPlusLib.HcSingleton.PgHistory.ls_hcLine ){
       		scanBox_doScan( goFw );
		}
	};
	
	
	function fixKey( bSet, _id, _myCommand, _myOncommand ){
		
		var _elem= document.getElementById(_id);
		if( _elem ){
			if( bSet && play_negative_Audio ){  /// solo es util para el audio
				var comm= _elem.getAttribute("command");
				if( comm == _myCommand){
					_elem.setAttribute("oncommand", _myOncommand);
					_elem.setAttribute("BAK_command", comm);
					_elem.removeAttribute("command");
				}
			}else{ // !bSet
				if( _elem.hasAttribute("BAK_command") ){
					var BAK_comm= _elem.getAttribute("BAK_command");
					_elem.setAttribute("command", BAK_comm);
					_elem.removeAttribute("oncommand");
					_elem.removeAttribute("BAK_command");
				}
			}
		}
	}
	
	
	var iBounced= 0;
	
	// NEW test! - 2016/03
	this.set__history_lineScan_full= function(bSet) {
		if( bSet ){
			if( !HCPlusLib.HcSingleton.PgHistory.ls_scanFull ){
				return;
	  		}
			if( !("hctp_goBack" in window.gBrowser) ){
				window.gBrowser.hctp_goBack   = window.gBrowser.goBack;
			    window.gBrowser.goBack   = function(par){
					var _canGoBack= this.canGoBack; // get this BEFORE executing go....
					this.hctp_goBack();      
					if( _canGoBack    ){  if(!(par&&par.fromHc)){ scanBox_doScan(false); } }
					else{ if( play_negative_Audio ){  HCPlusLib.audioError_playFor_action1(true);  }
						if( iBounced > 0 ){
							window.goDoCommand( 'cmd_scrollTop' ); // solo para go-back vd?
						}else{
							iBounced ++;
							window.setTimeout(function(){
								iBounced = 0;
							}, 800);
						}
					}
				}

			    window.gBrowser.hctp_goForward= window.gBrowser.goForward;
			    window.gBrowser.goForward= function(par){
					var _canGoForward= this.canGoForward;
					this.hctp_goForward();   
					if( _canGoForward ){  if(!(par&&par.fromHc)){ scanBox_doScan(true ); } }
					else{ if( play_negative_Audio ){  HCPlusLib.audioError_playFor_action1(true);  } 
					}
				}
	    	}
		}else{ // !bSet
	    	if( "hctp_goBack" in window.gBrowser ){
	    		window.gBrowser.goBack    = window.gBrowser.hctp_goBack; 
	    		delete                      window.gBrowser.hctp_goBack;

	    		window.gBrowser.goForward = window.gBrowser.hctp_goForward; 
	    		delete                      window.gBrowser.hctp_goForward;
	    	}
		}
		
		// para el sonido!
		fixKey( bSet, "goBackKb"   , "Browser:Back"   , "BrowserBack();   " );
		fixKey( bSet, "goForwardKb", "Browser:Forward", "BrowserForward();" );
		
	};
}; 
//end  LineScan_class
