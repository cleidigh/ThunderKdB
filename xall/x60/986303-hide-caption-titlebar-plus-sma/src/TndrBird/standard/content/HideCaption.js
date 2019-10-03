
/**
window.addEventListener('load'        , function()  {
	//HideCaption.FloatToolbarsHandler= new HideCaption.FloatToolbarsHr_class();
	
	HideCaption.OnLoad();     
}, false);
**/


var HideCaption = {

	unloaders: [],
	
	fx4_titlebar_enabled: false,
	titlebar_elem: null,

	
    // <window id="messengerWindow"  .......  onclose="return HideCaption.onCloseWindow();" >
    onCloseWindow : function onCloseWindow() {
    
        var alert_listener = {
            observe: function(subject, topic, data) {
                //alert("subject=" + subject + ", topic=" + topic + ", data=" + data);
                if( topic == "alertclickcallback" ){
                    window.close();   // CLOSE WINDOW!
                }
            }
        };
        function popup(title, text) {
            try {
                Components.classes['@mozilla.org/alerts-service;1'].
                          getService(Components.interfaces.nsIAlertsService).
                          showAlertNotification(null, title, text, true , 'cookie_close', alert_listener);
                          //owAlertNotification(null, title, text, false, '', null);
            } catch(e) {
                // prevents runtime error on platforms that don't implement nsIAlertsService
                if( confirm(title +" \n\n"+ text) ){
                    window.close();   // CLOSE WINDOW!
                }
            }
        };
        

    
        var close_firsttime_alert= HCPlusLib.close_firsttime_alert? HCPlusLib.close_firsttime_alert.getVal(): false;
        if( close_firsttime_alert ){
            HCPlusLib.close_firsttime_alert.setVal(false);
            HCPlusLib.close_firsttime_alert.Save();
        }
        
		var optionVal= HCPlusLib.option_close_button_action? HCPlusLib.option_close_button_action.getVal(): "";
        if       (optionVal == "minimize"){
            window.minimize();
            return false; //prevent default.
        }else if (optionVal == "exitapp"){
            goQuitApplication();
            return false; //prevent default.
        }else if (optionVal == "closetab"){

            if( close_firsttime_alert ){
                if( confirm(
                    " 'Hide C. Titlebar Plus Lite' Addon:  (one time only message) \n\n" +
                    " Close-Button / ALT+F4 keys: \n" + 
                    " Please note that 'Close current Tab' (default & recommended setting) \n" +
                    " is currently activated for this button/key combination. \n" +
                    " You can change this in Tools -> H.C.T.P Options \n\n\n" +
                    " Open Options Dialog now ? ") ){
                    
                    setTimeout( function(){
                        HCPlusLib.openOptionDialog(null);
                    }, 100);
                    return false; //prevent default.
                }
            }

            // continue with closetab ... 
            
        }else{ // DEFAULT ACTION !
            return true;  //TRUE -> DEFAULT CLOSE WINDOW
		}

    
        var do_close= false;
        
        try{
        
          var tabmail = document.getElementById('tabmail');
          
          if( tabmail.tabInfo.length == 1  &&  Services.prefs.getBoolPref("mail.tabs.closeWindowWithLastTab") ) { //from CloseTabOrWindow()
          
            // continue to CloseTabOrWindow() ... It WILL close window here!
          } else {
            if ( tabmail.tabContainer.selectedIndex == 0 ) { //can't close if there is other tabs....

                popup("Mail folders Tab can't be closed", "\nClick here to Close Window.\n\n"+
                        "(You can also Exit Application with\nFile > Exit  or  Main-Menu > Exit)");
                
            }
          }
        
        }catch(ex){
            HideCaption.myDumpToConsole("   onCloseWindow(): error !... "+ex);
        }
        
        CloseTabOrWindow();

        return false; //prevent default.
    },
    
    
    OnLoad : function() {
	
		//load debug flag!!
		HCPlusLib.LoadDebugFlag();

        HideCaption.mainW         = document.getElementById("messengerWindow");
        HideCaption.titlebar_elem = document.getElementById("titlebar");
		

		// LOAD OVERLAY XUL !!!
		HideCaption.LoaderXUL.LOAD_XUL_DOCUMENT( this.unloaders );
		

		//Load ALL options values !!!  -- do this AFTER FloatToolbarsHandler init !
		HCPlusLib.Load_AllOptions();


		HideCaption.hcp_platformPlus= HCPlusLib.getPlatformPlus();
		HCPlusLib.setAttribute_withBkp( HideCaption.mainW, "hcp_platformPlus", HideCaption.hcp_platformPlus);

		
		//HOME TOOLBAR !!
		HideCaption.HomeToolbarHandler.initHomeToolbar();
		

		HideCaption.set_All_EventListeners = function( bAdd ){
			// ---------------------------------------------------------------------------------------------
			// (from firefox)  called these AT LAST, bc onresize had been called BEFORE onload() finished!!!
			HideCaption.set_EventListener( bAdd, window, "sizemodechange", HideCaption.On_sizemodechange, true ); // capture = true !
			
			HideCaption.set_EventListener( bAdd, window, 'resize'        , HideCaption.OnResize_adjust_state, false);
			HideCaption.set_EventListener( bAdd, window, 'unload'        , HideCaption.OnClose   , false);
			// 'beforeunload' -- called BEFORE "leave page" popup!
		}

		HideCaption.set_All_EventListeners( true );

		// UNLOADERS ------------------------------ 
		HideCaption.unloaders.push(function() {
			HideCaption.set_All_EventListeners( false );  // HideCaption
		});
		
		
		setTimeout( function(){
			
			// HCPlusLib.setAttribute_withBkp( HideCaption.mainW, "chromemargin", "0,4,4,4"); // ONLY works if delayed!
			
			HideCaption.OnResize_adjust_state();
			
			setTimeout( function(){
				HideCaption.Delayed_calcSpaceForMinMaxCloseButtons( true );  // includes doButtonWidth() !
			}, 1200); //button's dropmarker appears very late on my main profile

		}, 10);
		
		
  		//HCPlusLib.setAttr_smart("appmenu-button-xxxxx" , "context", "hcp-menu-windowcontrols", false);
	},
	
	Delayed_calcSpaceForMinMaxCloseButtons: function( addMuchDelayed ){

		HCPlusLib.doButtonWidth();
		if( addMuchDelayed ){
			setTimeout( function(){  HCPlusLib.doButtonWidth(); }, 200);
		}
	},
	
	onTitlebarMax : function() {
		if (window.windowState == window.STATE_MAXIMIZED) { 
			window.restore(); 
		} else { 
			window.maximize(); 
		} 
	},
	
	onTitlebarClose : function() {
		window.close(); 
	},

	
	On_sizemodechange:   function(ev){
		HideCaption.OnResize_adjust_state(ev);
		
		setTimeout( function(){ // para q pueda agarrar el ancho del boton en UNMAX!!
			HideCaption.Delayed_calcSpaceForMinMaxCloseButtons( false );
		}, 300);
	},
	
	// NEW METHOD for Firefox 4 !!
	OnResize_adjust_state:   function(ev){
		
		//NICE speed performance in styling added !!!
		HideCaption.Delayed_OnResize_adjust_state();

		setTimeout( function(){

			HideCaption.Delayed_OnResize_adjust_state();

			setTimeout( function(){
					HideCaption.Delayed_OnResize_adjust_state();
			}, 100);
				
		}, 1);
	},

	WinState: undefined,
	old_windowState: -1,
	
	Delayed_OnResize_adjust_state:   function(){

			var old_WinState= this.WinState;
			
			if( this.WinState === undefined ){
				this.WinState = 0;
			}
			
			var my_windowState= window.windowState;
			
			if( window.fullScreen ){
				if( this.WinState < 2 ){
					this.WinState |= 2;
				}
			}else{
				this.WinState &= 1; // just to make sure to UNSET the FULLSCR flag!
				
				if(       my_windowState == window.STATE_MAXIMIZED ){ // 1
					this.WinState |= 1;
				}else if( my_windowState == window.STATE_NORMAL    ){ // 3  
					this.WinState = 0;
				}else{
					// NEW states!!!
					// STATE_MINIMIZED   2
					// STATE_FULLSCREEN  4
					
					if( my_windowState != this.old_windowState ){

						HideCaption.myDumpToConsole( " NEW STATE detected !!! \n" +
								 "    my_windowState == "+my_windowState );
					}
				}
			}
			
			if( my_windowState != this.old_windowState ){
				HideCaption.myDumpToConsole( "    changed! - now my_windowState= " + my_windowState + "  -> does NOTHING yet here ");
			}
			
			this.old_windowState= my_windowState;

			//there's a STATE CHANGE !!!
			if( old_WinState != this.WinState){
				HideCaption.myDumpToConsole( "    changed! - now  this.WinState= " + this.WinState );
				
				HideCaption.Delayed_calcSpaceForMinMaxCloseButtons( false );
				
				//this.ResetBorder(); q hago aqui??
				
				//Mar 2012: now we have values for MAX and UNMAX window!
				//HCPlusLib.set_tab_marginTop_delta();
			}
	},


	
	
	//CLASS Hc_EventListener !!! -----------------------------------------------------------------------------------------------------
	Hc_EventListener: function EventListener( _myElem, _event_type, _callback, _useCapture){
		
		var myElem    = _myElem;
		var event_type= _event_type;
		var callback  = _callback;
		var useCapture= _useCapture;
		
		var added= false;
		
		this.addEventListener   = function(){
			if(added){return;}
			added= true;
			myElem.addEventListener   (event_type, callback, useCapture);
			//HideCaption.myDumpToConsole("       Hc_EventListener.addEventListener   () event_type="+event_type+"  - callback="+callback);
		};
		this.removeEventListener= function(){
			if(!added){return;}
			added= false;
			myElem.removeEventListener(event_type, callback, useCapture);
			//HideCaption.myDumpToConsole("       Hc_EventListener.removeEventListener() event_type="+event_type+"  - callback="+callback);
		};
		//Good utility method to add/remove things!!
		this.set_EventListener   = function( bAdd ){
			if( bAdd ){		this.addEventListener();
			}else{			this.removeEventListener();
			}
		};
	},
	//GLOBAL (same) utility method
	set_EventListener: function( bAdd, _myElem, _event_type, _callback, _useCapture){
		// HideCaption.myDumpToConsole("    set_EventListener("+bAdd+","+_myElem+","+_event_type+","+_callback+","+_useCapture+")");
		if( bAdd ){		_myElem.addEventListener   (_event_type, _callback, _useCapture);
		}else{			_myElem.removeEventListener(_event_type, _callback, _useCapture);
		}
	},
	
	
	onClose_called: false,
    OnClose : function() {
		if( HideCaption.onClose_called ){
			return;
		}
		HideCaption.onClose_called= true;
		
		HideCaption.myDumpToConsole("   OnClose(): finishing !... ");
		
		HCPlusLib.onShutDown_lib();
    },
	

	// SHUTDOWN 
    hc_shutdown : function() {

		// con esto 'saca' el 'HideCaption-listener' y entonces No da error al desabilitar y luego el close!
		document.documentElement.setAttribute("onclose", "void(0);");
	
		this.OnClose();

		// UNLOADERS!!
		this.unloaders.reverse().forEach(function (f) { // reverse() so unload FIRST the LAST thing added, and so on 
			try {
				HCPlusLib.myDumpToConsole( "hc_shutdown >>>>  \n"+f );
				f();
			} catch (ex) {
				HCPlusLib.debugError(" hc_OnClose():  ex= "+ex, ex);
			};
		});

    },
	
	

	// DEBUG ---------------------------------------------------------

	debugError      : function(aMessage, theException){	HCPlusLib.debugError     (aMessage, theException);	},
	myDumpToConsole : function(aMessage){				HCPlusLib.myDumpToConsole(aMessage);	},
	
};

