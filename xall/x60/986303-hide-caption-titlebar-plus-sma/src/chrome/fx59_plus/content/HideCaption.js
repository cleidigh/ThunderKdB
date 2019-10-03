
"use strict"; 

var EXPORTED_SYMBOLS = ["HideCaption_class"];

var HideCaption_class = function( _win ){

	const window      = _win;
	const document    = window.document;
	const setTimeout  = window.setTimeout;
	const clearTimeout= window.clearTimeout;
	const screen      = window.screen;
	const getComputedStyle= window.getComputedStyle;
	const parseInt    = window.parseInt;
	const parseFloat  = window.parseFloat;
	
	const HCPlusLib   = window.HCPlusLib;
	const HideCaption = this;

	
	//unloaders
	const unloaders = [];

	this.myUnloaders= unloaders;
	
	const listener_list= [];

	const arrElem_hcHolders= [];
	// window.Cu.forceGC(); //para probar weakRefs
	
	//------------------------------------------
	

	this.hctp_current_version = "4.2.0";
	

	//BEGIN: these vars here is my poor-man's way to avoid errors in MyEclipse validation ...
	
	//FloatToolbarsHr_class: function (){ },
	//FloatToolbarsHandler: null,
		
	//FloatHelper: null,
	//END: 'MyEclipse' vars
	
	
	this.WinState= 0, 
	this.Resizing= 0, 
	this.InitPos= 1,

	
	this.isPopup= false,

	
	this.haveCaption    = false,
	
	this.mainW          = null,
	this.tabBrowserContent= null,
	
	this.gPrefConfig=  null,
	
	this.nav_platform= "(not setted yet)",
	
	this.ffVersionNumber= 0,

	
 	
	this.hcp_root_box= null; 

	// for floatbars
	this.floatBars_extraGap= 0;
	
	
	// mouse button events ----------------------------------------------------------------------------------
	
	this.closebut_mouseClick= false;
	
	this.primarBut= function( event, func ){	if( event.button == 0 ){ 	HideCaption.butDown( event, func );	}   }; // raise error if no event obj!
	this.secondBut= function( event, func ){	if( event.button == 2 ){ 	HideCaption.butDown( event, func );	}	};
	this.middleBut= function( event, func ){	if( event.button == 1 ){ 	HideCaption.butDown( event, func );	}	};
	
	var   bannedButDown= false;
	const bannedBut_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
	this.bannedBut_timeout= 50;
	
	this.butDown= function( event, func ){
		
		function setBanned_and_delayedReset() {
		    bannedButDown= true;
		    bannedBut_tOut.setTimeout(function () { //Esto pegado al TRUE, para ASEGURARME de q se resetee y NO quede trabado si falla func() (como paso con TMPlus al intentar cerrar un tab)
		    	bannedButDown= false;
		    }, HideCaption.bannedBut_timeout); // solo se puede 'chocar' apretando 2 botones casi al mismo tiempo? (tb cuando esta cerrando tabs a full)
		}
		
		if( bannedButDown && event.type != "dblclick" ){
			HideCaption.myDumpToConsole(">>		bannedButDown still true!     (timeout is: "+HideCaption.bannedBut_timeout+")");
			
			if( HCPlusLib.Audio_Sound_tic1.hasValidAudio() ){ // if user CHOOSED a sound for closeTab then play() audio-for-banned too! :-)
				HCPlusLib.get_bannedBut_audio().play();
			}
			
			return;
		}
		
		HideCaption.bannedBut_timeout = 50;
		setBanned_and_delayedReset();

	    before_action( event ); // blocks tt ...

	    func( event ); // al final!, por si falla.
	    
	    if( HideCaption.bannedBut_timeout != 50 ){
	    	setBanned_and_delayedReset(); // SET AGAIN banned timeout!
	    }
	    
	    after_action( event ); // turns-off floating things....
	};


	// --- WHEEL --------------------------------------------------------------------------------------------------------
	
	this.wheel_Vert = function( event, func ){	if( event.deltaY != 0 ){ 	HideCaption.do_wheel( event, func );	}   };
	this.wheel_Left = function( event, func ){	if( event.deltaX <  0 ){ 	HideCaption.do_wheel( event, func );	}   };
	this.wheel_Right= function( event, func ){	if( event.deltaX >  0 ){ 	HideCaption.do_wheel( event, func );	}   };

    var  wheel_banned= false;
    this.wheel_timeout_default= 50;
    this.wheel_timeout_now= this.wheel_timeout_default;

	this.do_wheel= function( event, func ){

	    if(!wheel_banned ){
		    wheel_banned= true;

			HideCaption.wheel_timeout_now= HideCaption.wheel_timeout_default;
			
			before_action( event ); // blocks tt ...
			
			try {
			    func( event ); // en un try, por si falla.
			} catch (ex) {  HCPlusLib.debugError("", ex);  }
			
			if( HideCaption.wheel_timeout_now > 0 ){
				setTimeout( function(){ // el timeout ahora va al final para tomar el timeout seteado por el evento en curso!
				    wheel_banned= false;
				}, HideCaption.wheel_timeout_now);
			}else{ // is ZERO
			    wheel_banned= false;
			}
			
		    after_action( event ); // turns-off floating things....

	    }else{ // wheel_banned == true 
			HideCaption.myDumpToConsole(">>		wheel_banned still true!    (timeout is: "+HideCaption.wheel_timeout_now+")");
			if( event.deltaX != 0 ){
				if( HCPlusLib.Audio_Sound_tic1.hasValidAudio() ){ // if user CHOOSED a sound for closeTab then play() audio-for-banned too! :-)
					HCPlusLib.get_bannedBut_audio().play();
				}
			}
	    }
	};
	
	this.CloseBut_onWheel= function( event ) {

		event.h_butHold= HideCaption.Holder_CloseButtons;
		
		HideCaption.wheel_Vert ( event, HideCaption.CloseBut_wheelVert  );
		HideCaption.wheel_Left ( event, HideCaption.CloseBut_wheelLeft  );
		HideCaption.wheel_Right( event, HideCaption.CloseBut_wheelRight );
	};
	
	this.fxbut_wheel     = function( event ) {

		event.h_butHold= HideCaption.Holder_FxButtons;
		
		HideCaption.wheel_Vert ( event, HideCaption.fxbut_wheelVert  );
		HideCaption.wheel_Left ( event, HideCaption.fxbut_wheelLeft  );
		HideCaption.wheel_Right( event, HideCaption.fxbut_wheelRight );
	};
	
	
	// mouseenter
	this.clBut_mEnter = function( event ) {		HideCaption.TipConf.tt_mouseEnter( event );		};
	this.fxBut_mEnter = function( event ) {		HideCaption.TipConf.tt_mouseEnter( event );		};

	
	
	// BEFORE
	function before_action( event ) {
		try {
			// BLOCK tooltip!
			event.h_butHold.ttHolder.block_tt(event); 

		} catch (ex) {  HCPlusLib.debugError("", ex);  }
	};
	// AFTER
	function after_action( event ) {
		// tOut SIN delay, solo para q:  1) no retarde el current thread  y 2) ya no necesito el try-catch!
		setTimeout(function() {
			if( event.h_butHold.ttHolder.afterAction_executed ){
				HideCaption.myDumpToConsole(">>		afterAction_executed is TRUE, skipping ");
				return; // RETURN!
			}
			event.h_butHold.ttHolder.afterAction_executed= true;
			
			// turn-OFF float menu (1ero)
			if( HideCaption.HomeToolbarHandler.hotspot_mouse_hover.isActive() ){
				HideCaption.HomeToolbarHandler.mouse_activate({}, false);
			}
			
			// turn-OFF Float-bars
			if( HideCaption.FloatToolbarsHandler.floatEnabled ){
				HideCaption.FloatToolbarsHandler.DynamicElemPos.mouse_activate({}, false);
			}
			// turn-OFF Dynamic-Bars
			if( HideCaption.TBoxHide.            DynamicElemPos.hotspot_mouse_hover  &&
				HideCaption.TBoxHide.            DynamicElemPos.hotspot_mouse_hover.isActive() ){
				HideCaption.TBoxHide.            DynamicElemPos.mouse_activate({}, false);
			}
		}, 0); 
	};
	
	//CLOSE_BUTTON actions!
    this.Close           	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_close_button_action 		   ,
    /* */    																			  HCPlusLib.option_close_button_act1_primary_dblclk   );  };
    this.Close_secondBut 	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_close_button_act2_secondary ,
    /* */																				  HCPlusLib.option_close_button_act2_secondary_dblclk );  };
    this.Close_middleBut 	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_close_button_act3_middle	   ,
    /* */																				  HCPlusLib.option_close_button_act3_middle_dblclk    );  };
    this.CloseBut_wheelVert = function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_close_button_act_wheel	 	);  };
    this.CloseBut_wheelLeft = function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_close_button_act_wheelLeft	);  };
    this.CloseBut_wheelRight= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_close_button_act_wheelRight	);  };
	
	//FIREFOX_BUTTON actions!
    this.fxbut_primary    	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_fxbut_act1_primary	, 
    /* */    																			  HCPlusLib.option_fxbut_act1_primary_dblclk   );  };
    this.fxbut_secondary  	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_fxbut_act2_secondary,
    /* */																				  HCPlusLib.option_fxbut_act2_secondary_dblclk );  };
    this.fxbut_middle     	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_fxbut_act3_middle   ,
    /* */																				  HCPlusLib.option_fxbut_act3_middle_dblclk );  };
    this.fxbut_wheelVert  	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_fxbut_act_wheel 		);  };
    this.fxbut_wheelLeft  	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_fxbut_act_wheelLeft  );  };
    this.fxbut_wheelRight 	= function( event ) {	HideCaption.do_button_action2( event, HCPlusLib.option_fxbut_act_wheelRight );  };

    
    var winClosedCount= 0;
    
    function do_Zoom_EnlargeReduce( isEnlarge, event) {
    	
		event= event || {};
		
		if( event.type == "wheel" && event.deltaY != 0 ){
			isEnlarge= event.deltaY < 0;
		}
    	
		//window.content.focus();


		if(    	    event.altKey  ){	
			//HideCaption.wheel_timeout_now  =  0; // ALLOW QUICK events!
								window.FullZoom.reset();
		}else{
			//HideCaption.wheel_timeout_now += 20; // *DELAY* event
			
			if( isEnlarge ){	window.FullZoom.enlarge();					
			}else{				window.FullZoom.reduce();
			}
			// command:  'cmd_fullZoomEnlarge' , etc 
		}
		/***
		else  	if( event.ctrlKey )	
					window.xxxx();
		 ***/
    };
    
    
    function do_Page_UpDown( isUp, event, isLine ) {
		
		event= event || {};
		
		if( event.type == "wheel" && event.deltaY != 0 ){
			isUp= event.deltaY < 0;
		}
    	
		//window.content.focus();
		// these 2 lines from  RemoteFinder.jsm
		window.gBrowser.selectedBrowser.focus();  // tb esta 'mCurrentBrowser' ...  
		//ndow.gBrowser.selectedBrowser.messageManager.sendAsyncMessage("Finder:FocusContent"); // este ya no haria falta. (sirve si quiero q el Fx-win mismo gane el foco)

		
		if(    	    event.altKey  ){	
					HideCaption.wheel_timeout_now  =  0; // ALLOW QUICK events!
					window.goDoCommand(isUp? 'cmd_scrollLeft'  : 'cmd_scrollRight'   );
		}else  	if( event.ctrlKey ){	
					window.goDoCommand(isUp? 'cmd_scrollTop'   : 'cmd_scrollBottom'  );
					// TBoxHide
					HideCaption.TBoxHide.set_TBox_floating_smart(isUp);
		}else{ 	if( isLine ){
					HideCaption.wheel_timeout_now  =  0; // ALLOW QUICK events!
					window.goDoCommand(isUp? 'cmd_scrollLineUp': 'cmd_scrollLineDown');
				}else{ // !isLine -> so it's PageUp/Dn!!
					HideCaption.wheel_timeout_now += 40; // *DELAY* event
					window.goDoCommand(isUp? 'cmd_scrollPageUp': 'cmd_scrollPageDown');
				}
				// TBoxHide
				HideCaption.TBoxHide.set_TBox_floating_smart(isUp);
		}

		//window.goDoCommand(isUp? 'cmd_movePageUp'  : 'cmd_movePageDown'  );

		/***
    	var new_KeyEvent; 
		if( isLine ){
			HideCaption.wheel_timeout_now  =  0; // ALLOW QUICK events!
	    	new_KeyEvent= isUp? 
		        function(evType){ return new window.KeyboardEvent( evType , {bubbles: true, cancelable: true, key:"ArrowUp"  , code:"ArrowUp"  , keyCode: 38}); } :
		        function(evType){ return new window.KeyboardEvent( evType , {bubbles: true, cancelable: true, key:"ArrowDown", code:"ArrowDown", keyCode: 40}); } ;
		}else{ // !isLine -> so it's PageUp/Dn!!
			HideCaption.wheel_timeout_now += 40; // *DELAY* event
	    	new_KeyEvent= isUp? 
	        	function(evType){ return new window.KeyboardEvent( evType , {bubbles: true, cancelable: true, key:"PageUp"   , code:"PageUp"   , keyCode: 33}); } :
	        	function(evType){ return new window.KeyboardEvent( evType , {bubbles: true, cancelable: true, key:"PageDown" , code:"PageDown" , keyCode: 34}); } ;
		}
		
		window.content.focus();
		const focused= 
			document.commandDispatcher.focusedElement || 
			document.commandDispatcher.focusedWindow.document.activeElement || 
			window.content.document.documentElement;
		
		focused.dispatchEvent( new_KeyEvent("keydown" ) );
		focused.dispatchEvent( new_KeyEvent("keypress") );
		***/
	};
    
    function hc_doCommand( _cId, _compareStr, _func) {
    	
    	var done     = false;

    	var retVal   = null;
    	var actionStr= "(none)";
    	
    	//goDoCommand( "History:UndoCloseTab" ); // doesn't work!
    	const commandElem= document.getElementById( _cId );  //"History:UndoCloseTab"
    	if(   commandElem ){
    		if( (commandElem.getAttribute("oncommand")+"").trim() != (_compareStr+"").trim() ){ // if NOT equal...
    			retVal= commandElem.doCommand();
    			if(!retVal ){	retVal= "doCommand()_returned_"+retVal; } // return 'something' to play audio !
    			actionStr= _cId;
    			done= true;
    		}
    	}
    	
    	if( !done ){
    		// use raw js function
    		if( _func ){
    			retVal= _func();
    			actionStr= "func(){...}";
    		}
    	}
    	
    	HCPlusLib.myDumpToConsole("  hc_doCommand()   actionStr= "+actionStr+"        retVal= "+retVal );

//    	//TODO:  dps COMENTAR !!!!
//    	if( HCPlusLib.bPrintDebug ){
//    		HideCaption.retVal_hc_doCommand= retVal;
//    	}

    	return retVal;
    };
    
	
    const shiftKey_defaults= {
    		closetab: 			"undoCloseTab",
    		closeWithHistory: 	"undoCloseTab",
    		closeNewerWindow: 	"undoCloseWindow",
    		
    		mainPanelUI:	"hc_context",
    		hc_context: 	"mainPanelUI",
    		
    		zapFrames: 	"zapImages",
    		zapImages: 	"zapFrames",
    		superStop:  "BrowserReload_0",
    		
    		FullScreen: 		"Maximize",
    		Maximize: 			"FullScreen",
    		quitApplication:	"closewin",
    		closewin:			"quitApplication",
    		
    		PageUp: 		"LineUp",
    		PageDown: 		"LineDown",
    		Page_UpDown: 	"Line_UpDown",
    		Line_UpDown: 	"Page_UpDown",

    		ZoomEnlarge: "PageUp",
    		ZoomReduce:  "PageDown",
    		Zoom_EnlRed: "Page_UpDown",

    		goForward: "mainPanelUI",
    		goBack   : "mainPanelUI",
    		//go_BackForw: "xxx", // shiftKey: lo hago en la funcion misma
    		
    		ShowAllTabs: "undoCloseTab",
    		undoCloseTab: "closetab",
    		NewTab: "undoCloseTab",
			
    		/**
    		xxx: "",
    		**/
    };
    
    const actions_list_fn= {
    		minimize: 			function(event) { 		window.minimize();		},	
    		closetab: 			function(event) {      	HideCaption.hc_close_tab(event);   		},
    		closeWithHistory: 	function(event) {      	HideCaption.closeWithHistory( event ); 		},
    		
    		closewin: 			function(event) {  // CloseBut: DEFAULT PRIMARY BUTTON ACTION !
    			try {
    				window.BrowserTryToCloseWindow();
    			} catch (ex) {
    				//HCPlusLib.debugErr0r("Firefox Internal Error in BrowserTryToCloseWindow(): trying default code...  ex= "+ex, ex); 
    				// COMENTADO para q no se vea como error de HCTP! (+ el link al codigo)
    				window.Services.console.logStringMessage("Firefox Internal Error in BrowserTryToCloseWindow(): trying default code...  ex= "+ex);
    				setTimeout(function(){ throw ex; }, 0); // <-- from console2 page

    				setTimeout(function(){
    					try {
    						if( window.gBrowser.warnAboutClosingTabs(window.gBrowser.closingTabsEnum.ALL) ){
    							window.close();
    						}
    					} catch (ex) {
    						//HCPlusLib.debugErr0r("Firefox Internal Error in XXXXXXXXXXX ...  ex= "+ex, ex);
    						window.Services.console.logStringMessage("Firefox Internal Error in window.gBrowser.warnAboutClosingTabs(...): trying default close...  ex= "+ex);
    						setTimeout(function(){ throw ex; }, 0); // <-- from console2 page
    						
    						if( window.confirm(" (Firefox Internal Error checking opened tabs before closing) \n\n Close Window?")){
    							window.close();
    						}
    					};
    				}, 50);
    			};
    		},
    		undoCloseTab: 		function(event) {	if( hc_doCommand( "History:UndoCloseTab", "undoCloseTab();", function(){ return window.undoCloseTab(); } ) ){
														HCPlusLib.Audio_Sound_tic1.play(); //Same AUDIO as close-tab
    												}else{
    													if( HCPlusLib.Audio_Sound_tic1.hasValidAudio() ){ // if user CHOOSED a sound then play() for-banned too!
    														HCPlusLib.audio_notFound_play();
    													}
    												}
    		},
    		undoCloseWindow:	function(event) {	if( hc_doCommand( "History:UndoCloseWindow", "undoCloseWindow();", function(){ return window.undoCloseWindow(); } ) ){
														HCPlusLib.Audio_Sound_action1.play();
													}else{
									    				HCPlusLib.audioError_playFor_action1();  // if user CHOOSED a sound then play() for-banned too!
													}
    		},
    		
    		hc_context: 		function(event) {  	HideCaption.openPopup_hc_context( event.target, event );	}, // DEFAULT ACTION for Secondary!
    		hc_context_cancel:	function(event) {	document.getElementById("hcp-menu-windowcontrols").hidePopup();			},
    		mainPanelUI:		function(event) {	HCPlusLib.openAppmenuPopup(event,  event? event.target: null,  true);		},
    		mainPanelUI_cancel:	function(event) {	setTimeout( function(){ window.PanelUI.hide();}, 30 );	},
    		
    		advSelTab:			function(event) {
    			if( event.type != "wheel"){
            	    HCPlusLib.myDumpToConsole(" WARN  advSelTab:  still forbidden event?  type="+event.type);
    				return;
    			}
    			
        	    //HCPlusLib.myDumpToConsole("  on_wheel()   deltaY= "+event.deltaY+"   deltaX= "+event.deltaX);
        	    
    		    var myDelta= event.deltaY != 0? event.deltaY : event.deltaX;

    		    if( myDelta != 0 ){
    		    	if( event.altKey || event.ctrlKey || event.shiftKey ){
    		    		do_Page_UpDown( myDelta < 0 , event );  /* isUp */
    		    	}else{
            		    window.gBrowser.tabContainer.advanceSelectedTab( myDelta>0? 1: -1, true);

    					HideCaption.wheel_timeout_now  =  0; // ALLOW QUICK events!

            		    //play AUDIO
                    	HCPlusLib.Audio_wheel1.play();
    		    	}
    		    }
    		},
    		
    		PageUp:  			function(event) {	do_Page_UpDown( true , event );	},
    		PageDown:			function(event) {	do_Page_UpDown( false, event );	},
    		Page_UpDown:		function(event) {	do_Page_UpDown( false, event );	},         // Page_UpDown  to use Eg. for wheel (vertical), call like 'PageDown'
    		
    		LineUp:				function(event) {	do_Page_UpDown( true , event, true );	}, // estos 2 serian solo para los SHIFT de page Up/Dn vd?
    		LineDown:			function(event) {	do_Page_UpDown( false, event, true );	},
    		Line_UpDown:		function(event) {	do_Page_UpDown( false, event, true );	}, // Line_UpDown  to use Eg. for wheel (vertical), call like 'LineDown'
    		
    		ZoomEnlarge:		function(event) {	do_Zoom_EnlargeReduce( true  , event );	},
    		ZoomReduce: 		function(event) {	do_Zoom_EnlargeReduce( false , event );	},
    		Zoom_EnlRed:		function(event) {	do_Zoom_EnlargeReduce( false , event );	},
    		
    		zapFrames: 			function(event) {
    			// known code of: 'Zap plugins' from  https://www.squarefree.com/bookmarklets/zap.html#zap_plugins
    			HCPlusLib.openUILinkIn( window, "javascript:(function(){function R(w){try{var d=w.document,j,i,t,T,N,b,r=1,C;for(j=0;t=['object','embed','applet','iframe'][j];++j){T=d.getElementsByTagName(t);for(i=T.length-1;(i+1)&&(N=T[i]);--i)if(j!=3||!R((C=N.contentWindow)?C:N.contentDocument.defaultView)){b=d.createElement('div');b.style.width=N.width; b.style.height=N.height;b.innerHTML='<del>'+(j==3?'third-party '+t:t)+'</del>';N.parentNode.replaceChild(b,N);}}}catch(E){r=0}return r}R(self);var i,x;for(i=0;x=frames[i];++i)R(x)})()",
					"current");
    			//window.content.location=
    			
    			HCPlusLib.Audio_Sound_action1.play();
    		},
    		zapImages: 			function(event) {
    			// Adapted from known code from  https://www.squarefree.com/bookmarklets/zap.html
    			HCPlusLib.openUILinkIn( window, 
    				"javascript:Array.slice(document.images).forEach(function(img){ img.parentNode.replaceChild( document.createTextNode(img.alt), img) });",
    				"current");
    			//window.content.location=
    			
    			HCPlusLib.Audio_Sound_action1.play();
    		},
    		superStop: 			function(event) {	window.BrowserStop();  	},
    		BrowserReload_0:	function(event) {	window.BrowserReload();	}, //unconditonally uses cache
    		BrowserReload:  	function(event) {	if (event.shiftKey){ window.BrowserReloadSkipCache(); }else{ window.BrowserReload();  }   },
    		
    		closeNewerWindow: 				function(event) {

    			function delayed_closeWin( recursionLevel ){
    				if( recursionLevel < 1 ){
    					return; // RETURN!
    				}
        			setTimeout(function(){
        				if(!winToClose.closed ){
            				delayed_closeWin( recursionLevel - 1 );
            				
                			winToClose.close();
        				}
					}, 400);
    			};
    			
    			const winToClose= HCPlusLib.HcSingleton.getLastOpenedWindow(); 
    			if(   winToClose && winToClose != window ){ // make sure It isn't ME!
        			
        			const winToClose_webTitle= (winToClose.gBrowser.selectedBrowser.contentTitle    +"").substring(0, 400); // ...content.document.title
        			const winToClose_url	 = (winToClose.gBrowser.selectedBrowser.currentURI.spec +"").substring(0, 400); // ...content.location.href
        			var    msg_win_closed     = " \n\n " + winToClose_webTitle + "\n\n " + winToClose_url;

        			setTimeout(function(){ // mejor en otro thread vd?

        				try {
        					const numTabs= winToClose.gBrowser.browsers.length; // INCLUDES tabs in OTHER GROUPS (panorama)
        					if(   numTabs > 1 ){
        						msg_win_closed= " \n   ("+numTabs+" tabs/pages) "+msg_win_closed;
        					}
        				} catch (ex) {	HCPlusLib.debugError(" ignoring error: "+ex );	}

        				//try again (delayed) if confirm-dialog blocking!
        				delayed_closeWin(5);


        				//RIGHT BEFORE  winToClose.close(); !!! because apparently it can hold even other timeouts!! (confirm-dialog)
        				bannedButDown= false;
        				// close it!
        				winToClose.close();

        				if( winToClose.closed ){
        					msg_win_closed= "Closed Window: "+msg_win_closed;
        					HCPlusLib.Audio_Sound_action1.play();
        				}else{ // NOT closed
        					msg_win_closed= "Apparently the window couldn't be closed yet (please check): "+msg_win_closed;
        					HCPlusLib.audioError_playFor_action1();
        				}
        				//anchor_ID == ""  pq se agregaba al class del anchorElement,  en Fx40 beta(2015-jul-30)
        				HCPlusLib.popupNotification_plus( msg_win_closed, 30000, "hctp_winClosed_"+(winClosedCount++), "", null, { timeout_dismiss: 6000 } );

        			}, 10);

    			}else{
    				HCPlusLib.audioError_playFor_action1();
    			}
    		},
    		
    		FullScreen:			function(event) {	window.BrowserFullScreen(); 	}, // command: "View:FullScreen"
    		Maximize:			function(event) {	HideCaption.Maximize(); 		},
    		quitApplication:	function(event) {	HideCaption.alert_panel( event, null,	"Exiting Firefox Application...");
    			setTimeout(function(){
        			hc_doCommand( "cmd_quitApplication", "goQuitApplication()", function(){ return window.goQuitApplication(); } );	
    			}, 10);
			},

    		DynBars_toggle:		function(event) {	HideCaption.TBoxHide.toggle_enable();  },

    		goBack:   			function(event) {	history_goBack_or_Forward( event.ctrlKey, true);  }, // event.ctrlKey  INVERTS DIRECTION!
    		goForward:			function(event) {	history_goBack_or_Forward(!event.ctrlKey, true);  },
    		go_BackForw:  		function(event) {	
    			event= event || {};
    			
    			if( event.type == "wheel" && event.deltaY != 0 ){
    				var isFw= event.deltaY > 0;

    		    	if( event.altKey || event.ctrlKey || event.shiftKey ){
    		    		do_Page_UpDown( !isFw , event );  /* isUp */
    		    	}else{
    					HideCaption.wheel_timeout_now = 50; // *DELAY* event
        				history_goBack_or_Forward(isFw , true);
    		    	}    				
    			}
    		},

    		ShowAllTabs:		function(event) {
				var done= false;
				if( window.allTabs && window.allTabs.canOpen == false ){ // in PaleMoon:  canOpen == undefined
					if( HCPlusLib.getComputedStyle_property(document.getElementById("alltabs-popup"), "visibility") == "visible"  &&
						window.allTabs && window.allTabs.toolbarButton ){
						// window.allTabs.toolbarButton.getAttribute("type") == "menu"
						window.allTabs.toolbarButton.open= true;
						done= true;
					}
				}
				if( !done ){
					hc_doCommand( "Browser:ShowAllTabs", "aaaa_dummy" );
				}
			},
			// <command   id="Browser:ShowAllTabs" oncommand="window.allTabs.open();" />
    		ShowAllTabs_cancel:	function(event) {
				if( window.allTabs && window.allTabs.toolbarButton ){
					window.allTabs.toolbarButton.open= false;
				}
			},

    		NewTab:				function(event) {	hc_doCommand( "cmd_newNavigatorTab", "aaaa_dummy" ); },
			// command="cmd_newNavigatorTab"  >>  oncommand="BrowserOpenTab(event);"

    		toggleCssDevPx:			function(event) {	
				var pref_name = "extensions.hide_caption.plus.z_ex_cssDevPx";
				var cssDevPx= "-1.0";
				if( window.Services.prefs.getCharPref("layout.css.devPixelsPerPx") == cssDevPx ){
					cssDevPx= window.Services.prefs.prefHasUserValue( pref_name )? 
					/* */     window.Services.prefs.getCharPref     ( pref_name ):  "1.25";
					cssDevPx= ""+HCPlusLib.HcSingleton.hc_parseNumber(cssDevPx, 1.25, 0.5, 3);
				}
				var msg__areYouSure= HCPlusLib.HcSingleton.getTextFromElement( document, "txt__are_you_sure"  , "Are You sure?");
				var msg__sysDefault= HCPlusLib.HcSingleton.getTextFromElement( document, "txt__system_default", "System Default");
				var confirmMsg= "" + ((cssDevPx*100)+"%").replace("-100%", msg__sysDefault) + " \n\n" + msg__areYouSure +" \n";
				if( window.Services.prompt.confirm(null, "  ", confirmMsg) ){
					HCPlusLib.Audio_Sound_tic1.play();
					window.Services.prefs.setCharPref("layout.css.devPixelsPerPx",    cssDevPx);
				}
			},
    		
    		none: 				function(event) {  	; }, // NONE! - no action!
    		
    		dummy: null
    };
    
    var last_optionVal= null;
    
    function cancel_last_optionVal() {
    	try {
    		if( last_optionVal ){
    			const func_id= last_optionVal+"_cancel";
    		    const action_fn= actions_list_fn[func_id]; // <MyOption>_cancel
    	    	if(   action_fn ){
    	    	    HCPlusLib.myDumpToConsole("  cancel_last_optionVal() , will execute: "+func_id);

    	    		action_fn();
    	    	}
    		}
		} catch (ex) {
			HCPlusLib.debugError(" "+ex, ex);
		}
	}
    
    this.do_button_action2 = function( event, optionObject, optionObject_dblclick ) {

    	// [event] obj exists here, or primarBut()/etc will fail already! 
    	
    	// Check "dblclick" !!
    	if( event.type == "dblclick" ){
    		if( optionObject_dblclick ){
    			optionObject= optionObject_dblclick;
    			
    			cancel_last_optionVal(); // CANCEL e.g. main-UI-popup, etc!!
    		}else{
    		    HCPlusLib.myDumpToConsole("    no action for dblclick! "); 
    			return; // RETURN !
    		}
    	}
    	
    	var   optionVal= optionObject? optionObject.getVal()    : "(option-obj-not-init-yet)";
    	const optionKey= optionObject? optionObject.getPrefKey(): "(option-obj-not-init-yet)";
    	
    	const shiftKey = event.shiftKey; 
    	var   msg_shift= ""+shiftKey;
	    if( shiftKey ){
	    	const shift_action= shiftKey_defaults[optionVal];
	    	if( shift_action ){
	    		msg_shift += "_changedOrig("+optionVal+")!!  ";
	    		optionVal= shift_action;
	    	}
	    }

	    HCPlusLib.myDumpToConsole("  do_button_action2():   Key= "+optionKey+"    shiftKey= "+msg_shift+"     option= "+optionVal);
    	
    	const action_fn= actions_list_fn[optionVal];
    	if(   action_fn ){
    		last_optionVal= optionVal;
    		
    		action_fn( event );
    	}else{ // !action_fn
            HideCaption.debugError("ERROR doing button action!!  optionVal= "+optionVal);
    	}
    };


    // BEGIN \/: HISTORY ! ------------------------------------------------------
    
    this.popup_backForwardMenu= null;
    this.backFwd_already_opened= false;
    
    var popupOpened_data= {}; // contains several vars
    
    var banned_closeWithHistory= false;

	var popupAnchor= null;

    this.closeWithHistory= function( event ){

    	if( banned_closeWithHistory ){
    		HideCaption.myDumpToConsole( "closeWithHistory()  banned_closeWithHistory="+banned_closeWithHistory+"   RETURNING!" );
    		return; // RETURN!
    	}

    	if(!event){ event= {}; }

		const mainAction= ""+HCPlusLib.HcSingleton.PgHistory.mainAction;

    	if( ! HideCaption.backFwd_already_opened ) {

			// esto por si 'alguna vez' viene un mousedown ANTES del up!
			if( event.type=="mouseup" ){ // mouseup SOLO permitido si venimos de un OPENED menu!
				HideCaption.myDumpToConsole( "closeWithHistory()  misplaced 'mouseup', ignoring (err0r?) ");
				return; // RETURN!
			}
			
    		if(!event.altKey  &&   // con ALT key SE IGNORA si hay 'Historia', llama a closeTab()
    		   (sessionHistory_canGoBack()   ||  
    			sessionHistory_canGoForward() && event.ctrlKey) ){ // con CTRL abre -casi- incondicionalmente! (ALT no permite q se abra el menu!)

    			//more delay for ban!
    			HideCaption.bannedBut_timeout += 30;

				//DON'T open Popup!
   				if( mainAction.indexOf("NOpopup") >= 0 ){ 
					const goFw = event.ctrlKey;
    				if( mainAction.indexOf( goFw? "goForward": "goBack") >= 0 ){
    					if( history_goBack_or_Forward(goFw, true) ){
    						//play AUDIO
    						HCPlusLib.Audio_wheel1.play();
    					}
    					// backFw_doRefresh= true;
    				}

					return; // RETURN !!!
   				}


    			// open menu!
    			if(!popupAnchor){
        			popupAnchor= document.getElementById('hcp-rightbar-fixed'); // 'hctp-controls-top-fixed' <- este puede ser desabilitado con mmc == disabled!
    			}
    			if( event.target && 
    			   (event.type=="mousedown" || 
    				event.type=="mouseup"   ||
    				event.type=="click"     ||
    				event.type=="wheel"  ) ){

    				popupAnchor= event.target;
    			}

    			if( HideCaption.popup_backForwardMenu.state != "open"    &&
    				HideCaption.popup_backForwardMenu.state != "showing"  ){

    				popupOpened_data= {};
    				popupOpened_data.last_Anchor	  = popupAnchor;
    				popupOpened_data.last_selectedTab = window.gBrowser.selectedTab;
    				popupOpened_data.last_event_button= event.button;
    				
					
					// new 2018! for Fx57+ (with extra flag)
					if(  HCPlusLib.HcSingleton.newCall_openHistoryPopup !== false  &&
					    (HCPlusLib.HcSingleton.newCall_openHistoryPopup || HCPlusLib.HcSingleton.isFx57orLater)  &&
						window.SessionStore && window.SessionStore.getSessionHistory ){

						// See:  resource:///modules/sessionstore/SessionStore.jsm
						var historyTest1= window.SessionStore.getSessionHistory( window.gBrowser.selectedTab, function(){
							
							HideCaption.open__popup_backForwardMenu( popupAnchor, event );
						});

						// can be like this (unloaded data yet?):  { index: NaN, entries: Array[0] } 
						if( HCPlusLib.bPrintDebug ){  window.console.log( "    historyTest1: ", historyTest1 );  }
					}else{
						HideCaption.myDumpToConsole( "    old call for :  open__popup_backForwardMenu()");
						// old call
						HideCaption.open__popup_backForwardMenu( popupAnchor, event );
					}

    				const goFw = event.ctrlKey;
    				if( mainAction.indexOf( goFw? "goForward": "goBack") >= 0 ){
    					history_goBack_or_Forward(goFw);
    					backFw_doRefresh= true;
    				}
    				
    				HCPlusLib.Audio_Sound_info1.play();
    			}
    			
    		}else{ // no 'history' or ALT key pressed
    			HideCaption.hc_close_tab(event);
    		}

    	}else{ // HideCaption.backFwd_already_opened == true!
    		
    		HideCaption.backFwd_already_opened= false; // bloquear q pueda cerrar mas de 1 tab de seguido vd??
    		HideCaption.popup_backForwardMenu.hidePopup(); // quedaba abierto aunque haya cerrado el tab!

    		// close that tab!
    		if( popupOpened_data.last_selectedTab == window.gBrowser.selectedTab ){
    			HideCaption.hc_close_tab(event);
    		}else{
    			HideCaption.myDumpToConsole( "closeWithHistory()  war...: selectedTab changed! ");
    		}

    		popupOpened_data= {};
    	}

    	//HideCaption.myDumpToConsole( "closeWithHistory(): menu.state= "+HideCaption.popup_backForwardMenu.state );
    };

	this.open__popup_backForwardMenu= function( popupAnchor, event ){

    				HideCaption.popup_backForwardMenu.setAttribute   ("hc_aboutToOpen", "true  "+(event.ctrlKey?"goFw":""));
    				if( event.fromKey ){
    					var posY= HideCaption.content_deck && HideCaption.content_deck.boxObject? 
    							  HideCaption.content_deck.boxObject.screenY - 5:
    					          HideCaption.mainW.boxObject.screenY        + HideCaption.mainW.boxObject.height/10;
        				HideCaption.popup_backForwardMenu.openPopupAtScreen( 
        						  HideCaption.mainW.boxObject.screenX        + HideCaption.mainW.boxObject.width /2 - 80,  posY );
    				}else{
						const p_position= popupAnchor.boxObject.height > 0 || popupAnchor.boxObject.parentBox ? 'after_end': 'start_before'; // eg. check disabled mmc!    
						
        				HideCaption.popup_backForwardMenu.openPopup( popupAnchor, p_position, 0, 0, false, false, event.type? event: undefined);
        				//deCaption.popup_backForwardMenu.openPopupAtScreen( 100, 30 );
    				}
	};

	
    function get_sessionHistory(){

		function check_history(ind, cou){
			if( window.gBrowser.canGoBack     !=  (ind>0)  ||
				window.gBrowser.canGoForward  !=  (ind<cou-1) ){
				setTimeout(function(){
					HideCaption.debugError("  error in 'canGoBack / forw' logic:   "+"   old-i:"+ind+"   old-c:"+cou);
				}, 0);
			}
		}

    	// probando bien el  SessionStore.getSessionHistory()  cuyos valores quedan ATRASADOS en tiempo de los de  gBrowser.sessionHistory 
    	function updateSessionHistory(sessionHistory, initial)
    	{
    		let count = sessionHistory.entries.length;
    		let index = sessionHistory.index;
    	}
    	//window.FillHistoryMenu(HideCaption.popup_backForwardMenu);
    	
    	if( window.SessionStore && window.SessionStore.getSessionHistory ){ // ...SessionStore is NULL in [Pale Moon] 27.4.x
    		var sesHistory= window.SessionStore.getSessionHistory(window.gBrowser.selectedTab, updateSessionHistory);
    		var result= {	
    				index: sesHistory? sesHistory.index         : 0, 
    				count: sesHistory? sesHistory.entries.length: 0,
    		}
    		if( !window.gMultiProcessBrowser ){
    			
    			// It'll fetch this *only* if not MULTIPROCESS Fx, 
    			// so no prob with msg: "Warning: ... will no longer work"  when pref: [dom.ipc.shims.enabledWarnings = true]
    			const old_sessionHistory= window.gBrowser.sessionHistory; 
    			if(   old_sessionHistory ){
        			const ind= old_sessionHistory.index;
        			const cou= old_sessionHistory.count; 
        			
        			check_history(ind, cou);
        			
        			if( ind != result.index  ||
        				cou != result.count ){
        				
        				setTimeout(function(){
        					var errmsg= "Debug: history [index] and/or [count] NOT EQUAL!!    sesHistory:"+sesHistory+"  i:"+result.index+"  c:"+result.count
    								+"   old-i:"+ind+"   old-c:"+cou;
        					HideCaption.myDumpToConsole(" warn:  "+ errmsg );
        					//window.alert( errmsg );
        				}, 0);
        			}
    			}
    		}
    		return  result; //TODO: valores de  SessionStore.getSessionHistory()  no se actualizan inmediatamente! 
    		
    	}else{
			const ind= window.gBrowser.sessionHistory.index;
			const cou= window.gBrowser.sessionHistory.count; 
			check_history(ind, cou);
			
        	return  window.gBrowser.sessionHistory;
    	}
    };

    function history_goBack_or_Forward(goFw, bHandleAudio){
    	try {
    		if( goFw ){
    			if( window.gBrowser.canGoForward ){
    				window.gBrowser.goForward( {fromHc: true} );
    				
    				HideCaption.LineScan.doScan( goFw );
    				return true;
    			}
    		}else{
    			if( window.gBrowser.canGoBack ){
       				window.gBrowser.goBack   ( {fromHc: true} );		

       				HideCaption.LineScan.doScan( goFw );
       				return true;
    				// HCPlusLib.openUILinkIn( window, "javascript:history.back();",  "current"); // DM: not preferred by me! 
    			}
    		}
		} catch (ex) {
			HCPlusLib.myDumpToConsole("  IGNORING ERR in goBack_or_Forward(): "+ex, ex);
		}
		if( bHandleAudio ){
			HCPlusLib.audioError_playFor_action1(true);
		}
		return false;
    };
    
    
    function sessionHistory_canGoBack(){
       	//return  get_sessionHistory().index > 0;
    	get_sessionHistory(); // for testing ... 1 time only
       	return  window.gBrowser.canGoBack; // webNavigation.
    };
    function sessionHistory_canGoForward(){
       	//return  get_sessionHistory().count > 1;
    	//get_sessionHistory(); // for testing ...
    	return  window.gBrowser.canGoForward;
    };

	// CLASS Two_State_AsyncMod  --------------------------------------------------------
    this.Two_State_AsyncMod = function() {

    	const   active_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
    	const inActive_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();

    	this.setTimeout_inActive=  function ( callback, _inactive_millis ) {
    		
    		active_tOut.clear_removeTimeout();

    		inActive_tOut.setTimeout( callback, _inactive_millis );
    	};

    	this.setTimeout_active  =  function ( callback,   _active_millis ) {
    		
    		inActive_tOut.clear_removeTimeout();
    		
    		active_tOut.setTimeout( callback, _active_millis );
    	};
    };


    var backFw_doRefresh= false;
    
    this.backForwardMenu_Async= new this.Two_State_AsyncMod();
    
    //backForwardMenu...
	this.backForwardMenu_popupshown_or_hidden= function( event ) {

		//HCPlusLib.myDumpToConsole("BEGIN: event is "+event.type+ "    target.state= "+(event.target? event.target.state: "(no-target)"));
		
		switch (event.type) {
		case "popupshowing": // el "...shown" podia aparecer DESPUES del "..hidden" con 2 clicks rapidos probados en Linux!
		    
			//HCPlusLib.myDumpToConsole("  event.hc_isRefresh = "+event.hc_isRefresh);
			if( event.hc_isRefresh ){
				return; // RETURN!
			}
			
			HideCaption.backForwardMenu_Async.setTimeout_active  ( function(){
  				HideCaption.backFwd_already_opened= true;
			    HCPlusLib.myDumpToConsole("  HideCaption.backFwd_already_opened="+HideCaption.backFwd_already_opened);
  			}, 30); // with delay!!
			break;
		case "popuphidden":
			const needs_mouseup= HCPlusLib.getPlatformPlus() != "windows";  //mouseup for linux (and Mac?) 
			
			const delay_popHidden= HideCaption.closebut_mouseClick || needs_mouseup ? 800: 10; // inmediately only if from "mousedown" AND windows !

			put_mouseup( needs_mouseup, popupOpened_data, delay_popHidden );
			
			HideCaption.backForwardMenu_Async.setTimeout_inActive( function(){
  				HideCaption.backFwd_already_opened= false;
			    HCPlusLib.myDumpToConsole("  HideCaption.backFwd_already_opened="+HideCaption.backFwd_already_opened);
				popupOpened_data= {}; //reset all vars!
			    
  			},  delay_popHidden); //delay 
			
			break;
		case "popupshown"  : // para no imprimir error (y ahora ya esta puesto este listener)

			if( backFw_doRefresh ){
				backFw_doRefresh= false;
				  // HISTORY popup refresh!
				  HideCaption.popup_backForwardMenu__refresh();
			}

			HideCaption.popup_backForwardMenu.removeAttribute("hc_aboutToOpen");
			break;
		case "popuphiding" :
			break;
		default:
		    HCPlusLib.myDumpToConsole("  backForwardMenu_popupshown_or_hidden():  ERROR!, event is "+event.type);
			break;
		}
	};

	// put_mouseup
	function put_mouseup( _needs_mouseup, _local__popupOpened_data, _delay_popHidden ){
		
		function mouseup_handler(mup_event) {
			_local__popupOpened_data.last_Anchor.removeEventListener("mouseup", mouseup_handler);
    		
		    //HCPlusLib.myDumpToConsole("  'mouseup' begin");
    		
		    // make sure is SAME event and buttons!
		    if( mup_event.button == _local__popupOpened_data.last_event_button ){
	    		HideCaption.closeWithHistory( mup_event );
		    }else{
    		    HCPlusLib.myDumpToConsole("  'mouseup'  (war...):  NOT same mouse button!");
		    }
		}
		
	    if( _needs_mouseup && _local__popupOpened_data.last_Anchor ){
	    	// CLOSE_THE_TAB on mouseup but only if it is 'quick' after popuphidden
	    	
	    	_local__popupOpened_data.last_Anchor.addEventListener("mouseup", mouseup_handler);

	    	setTimeout(function() {
	    		_local__popupOpened_data.last_Anchor.removeEventListener("mouseup", mouseup_handler);
    		    //HCPlusLib.myDumpToConsole("  'mouseup' removed");
			}, _delay_popHidden); // tiene q ser igual q delay_popHidden
	    } // mouseup
	};
	
	
	const backFw_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();

	this.popup_backForwardMenu__refresh= function() {
		// atento a la performance pq esto es llamado dsd [ onLocationChange !! ]
		if( HideCaption.popup_backForwardMenu    && 
			HideCaption.popup_backForwardMenu.state == "open" ){	// quick check here for PERFORMANCE!
			backFw_tOut.setTimeout(function(){
				// HideCaption.backFwd_already_opened
				if( HideCaption.popup_backForwardMenu    && 
					HideCaption.popup_backForwardMenu.state == "open" ){  // make SURE to no dispatch this 'wrongly'
					
					// con esto, funciona con qualquier cosa q este puesto en este evento!
					var evPopupShowing= new window.PopStateEvent("popupshowing");
					evPopupShowing.hc_isRefresh= true;
					HideCaption.popup_backForwardMenu.dispatchEvent( evPopupShowing );
				}
			}, 50); // si uso por ej. 400 es peor el tema del checked(dot) q no coincide con el bold-text!
		}
	};


	//END close-with-history -> backForwardMenu 
    
    this.hc_close_tab= function( event ) {

    	if( event.type=="mouseup" ){ // esto por si alguna vez viene un 'click' luego del mouseup!
    		banned_closeWithHistory= true;
    		setTimeout(function () {
    			banned_closeWithHistory= false;
    		}, 150);
    	}

		HideCaption.wheel_timeout_now = 200; // *DELAY* event if it's wheel!
    	
    	window.BrowserCloseTabOrWindow();
    	
    	HCPlusLib.Audio_Sound_tic1.play();
	};


	this.openPopup_hc_context= function( _anchorElem, event ) {
		document.getElementById("hcp-menu-windowcontrols").openPopup( _anchorElem, "bottomcenter topleft", 0, -1, true, false, event ); // true -> is_context! // "bottomcenter topleft"
	};
	
	
    ///////////////////////////////////////////////////////////////////////////////////////
	
	// MAIN & VERY simple method now !!
    this.Maximize= function() {
			
			if( window.fullScreen ){
				HideCaption.my_BrowserFullScreen();
			}else{
				if( window.windowState != window.STATE_MAXIMIZED ){
					HideCaption.my_maximize();
				}else{
					HideCaption.my_restore();
				}
			}
			//NICE speed performance in styling added !!!
			//HideCaption.Delayed_OnResize_adjust_state(); <- parece q no ayuda en nada, y por seguridad lo desactivo aca!
    };

    this.RestoreWin = function() {

		HideCaption.my_restore();
	};

	
	// change winstate method/s -------------------------------------------------------------------------

	const tOut_fullscr= new HCPlusLib.HcSingleton.Hc_Timeout();
	
	this.onFullScreen=  function( event ) {

		const is_fullScreen= HCPlusLib.HcSingleton.isFx41orLater? window.fullScreen: !window.fullScreen; // forFx40-: inverted value espected here... 

		//HCPlusLib.myDumpToConsole("  *HideCaption*.onFullScreen(), BEFORE DELAY (value is):   window.fullScreen= "+window.fullScreen );

		// ONLY in windows 
		if( HCPlusLib.getPlatformPlus() == "windows" ){ 
			if( is_fullScreen ){
				// aug-2015, 1er touch q ARREGLA el issue de fullscr video q aborta!... (este solo ya arregla en mis pruebas)
				HideCaption.mainW.setAttribute(    "dz_adv_sysbut_winappear_calc_unmax", "" );

				// este NO justamente pq el valorde fullscr todavia esta invertido!
				//deCaption.Delayed_OnResize_adjust_state();
			}
	    }

		tOut_fullscr.setTimeout( function(){ // using tOut_fullscr 
			if( is_fullScreen != window.fullScreen ){ // now we espect normal value!
				var warn_word= "war_"; // no full warning in linux,etc bc I still dunno the behavior there....
				if( HCPlusLib.getPlatformPlus() == "windows" ){ 
					warn_word= "warn";
				}
				HCPlusLib.myDumpToConsole("  onFullScreen() AFTER DELAY: "+warn_word+"? bad value.  is_fullScreen= "+is_fullScreen+"  window.fullScreen= "+window.fullScreen );
			}
		}, 30);
	};

	
	//      fullscreenElement
	this.hc_fullscreenElement= function() {
		return "fullscreenElement" in document?  document.fullscreenElement: document.mozFullScreenElement;
		// Pagina MDN sobre 'fullscreenElement': PREF (solo vale en fx47??):	full-screen-api.unprefix.enabled
	};
	

	// ---------- OnResize ----------------------------------------------
    
    this.OnResize = function(e) {
		HideCaption.OnResize_adjust_state(e); // NEW METHOD !!!!
    };
	// oct-16: called also from  SIZEMODECHANGE !
	this.OnResize_adjust_state=   function(ev){
		
		// HORRIBLE Fx14 + Win7-64 DOESN'T GIVE BACK the MAXIMIZED-state event on-resize after MINIMIZED!!! and also receives FAKE MINIMIZED-state events!!
		var skip_changes= false; 
		if( window.windowState == window.STATE_MINIMIZED ){
			skip_changes= true; // puede depender de mas factores en el futuro
		}

		// aug-2015, 2do touch q ARREGLA el issue de fullscr video q aborta!  (este solo ya arregla, pero pongo los 2 pq se ve mucho mejor la transicion a fullscr)
		var doQuickTry= true;

		if( HideCaption.hc_fullscreenElement() ){ // DOMFULLSCR! videos, etc
			//HideCaption.myDumpToConsole( "  onresize ...  DOMFULLSCREEN! " );
			
			if( HideCaption.old_windowState == window.STATE_NORMAL ){
				
				doQuickTry= false;
				
				// este causo el issue del video fullscr q salia de fullscr inmediatamente.
				//HideCaption.mainW.setAttribute(    "dz_adv_sysbut_winappear_calc_unmax", "" );
			}
			HideCaption.myDumpToConsole( " DOMFULLSCREEN:  onresize ...  doQuickTry= "+doQuickTry );
		}
		
		if( doQuickTry ){
			//NICE speed performance in styling added !!!
			HideCaption.Delayed_OnResize_adjust_state();  // skip_changes: this does that already
		}
		
		if( !skip_changes ){
			//now  attached to RESIZE event!  (getting rid of MUTATION events)
			HideCaption.Delayed_Adjust_For_MenuBar_change_Fx4_Plus();
		}

		setTimeout( function(){
				HideCaption.Delayed_OnResize_adjust_state();  // skip_changes: this does that already
				
				if( !skip_changes ){
					HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(); // tested to fix cal..() at maximize time.
				}else{
					HideCaption.myDumpToConsole( "  onresize ...  skip_changes= " + skip_changes );
				}
			}, 1);
	};
	
	this.old_windowState= -1;
	
	this.Delayed_OnResize_adjust_state=   function(){

			this.haveCaption= this.mainW.getAttribute("hcp_hiddencaption") != "true";
			var old_WinState= this.WinState;
			
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
					// ago-2012: NEW CHECK for horrible bug (FAKE MINIMIZE event!) detected when upgraded from fx11 to Fx14.
					//if( this.mainW.getAttribute("sizemode") == "normal" )
					this.WinState = 0;
				}else{
					// NEW states!!!
					// STATE_MINIMIZED   2
					// STATE_FULLSCREEN  4
				}
			}
			
			if( my_windowState != this.old_windowState ){
				HideCaption.myDumpToConsole( "    changed! - now my_windowState= " + my_windowState + "  -> does NOTHING yet here ");
			}
			
			this.old_windowState= my_windowState;

			//there's a STATE CHANGE !!!
			if( old_WinState != this.WinState){
				HideCaption.myDumpToConsole( "    changed! - now  this.WinState= " + this.WinState );
				
				//handle fx4_titlebar visibility
				HideCaption.Adjust_fx4_titlebar();
			
				
				HideCaption.Adjust_ChromeMargin();
				
				this.ResetBorder();
				
				//Mar 2012: now we have values for MAX and UNMAX window!
				HCPlusLib.set_tab_marginTop_delta();
			}
	};

	
	this.use_hidechrome_option= "";
	
	//hiddencaption_count: 0,
	
	this.previous_hcp_hiddencaption= null; // different (!=) from false and true
	this.my_set_Hcp_Hiddencaption= function(_hcp_hiddencaption){
		
		//AVOIDS RECURSION! (with Adjust_ChromeMargin()) &  more general performance!
		if( HideCaption.previous_hcp_hiddencaption == _hcp_hiddencaption ){  
			return;
		}
		HideCaption.previous_hcp_hiddencaption= _hcp_hiddencaption;

		
		//HideCaption.hiddencaption_count ++;
		HideCaption.debug_move("my_set_Hcp_Hiddencaption("+_hcp_hiddencaption+")");

		HideCaption.mainW.setAttribute("hcp_hiddencaption", _hcp_hiddencaption? "true"   : "false");
		HideCaption.haveCaption= !_hcp_hiddencaption; //HideCaption.mainW.getAttribute("hcp_hiddencaption") != "true";

		// Attr "hidechrome" - Works in GNU/LINUX+GNOME!!
		if( HideCaption.use_hidechrome_option == "uhc_yes" ){

			const wasMaxim= window.windowState == window.STATE_MAXIMIZED;
			
			HideCaption.debug_move("Setting attr:  hidechrome ="+_hcp_hiddencaption+"");
			HideCaption.mainW.setAttribute("hidechrome", _hcp_hiddencaption? "true"   : "false");
			
			setTimeout( function(){
				if( _hcp_hiddencaption && wasMaxim  &&  window.windowState != window.STATE_MAXIMIZED ){ 
					HideCaption.my_maximize(); // RESTORE maxim state!
				}
			}, 1200);
		}else{
			// user is forced to RESTART firefox to take the OFF value
		}
		
		HideCaption.Adjust_ChromeMargin();
	},

	
	this.fx4_titlebar_enabled= false,

	this.Adjust_fx4_titlebar=  function(){
	
		var dz_fx4_titlebar = this.mainW.getAttribute( "dz_fx4_titlebar" );
		
		//handle fx4_titlebar visibility
		if(       "ti_unmaximized" ==  dz_fx4_titlebar ){
			this.mainW.setAttribute( HCPlusLib.sAttr_hcp_fx4_titlebar_visible, this.WinState == 0 );
		}else if( "ti_enabled"     ==  dz_fx4_titlebar ){ // in fullscr titlebar is hidden
			this.mainW.setAttribute( HCPlusLib.sAttr_hcp_fx4_titlebar_visible, this.WinState <  2 );
		}else if( "ti_never"       ==  dz_fx4_titlebar ){
			this.mainW.setAttribute( HCPlusLib.sAttr_hcp_fx4_titlebar_visible, "false" );
		}
		
		HideCaption.fx4_titlebar_enabled= "true" == HideCaption.mainW.getAttribute( HCPlusLib.sAttr_hcp_fx4_titlebar_visible );
		
		HideCaption.calc_sysbuttons_active();
		
		//oct 2012: fixed for new fx12+ CMargin behavior 
		setTimeout( function(){ // better delay this here also..
		    HideCaption.do_setRightBorderButtonBox(HideCaption.mainW.getAttribute("chromemargin"));
		}, 10);
	};

	
	
	
	
	// section about sysbuttons problem in Fx12+
	this.hcp_chromeMargin_forceZero_dummytest= false; // ahora (2015) solo sirve p/ q llame una sola vez a calc_sysbuttons_active() 
 
	this.adv_sysbut_winappear= "";
	
	this.sysbuttons_active= false;  // in GLASS, they *CAN* be active even if NOT visible!

	this.userChromeMargin= 7;

	
	this.Adjust_ChromeMargin=  function( recurseLevel ){
		
		if( typeof(recurseLevel) != "number" ){ // RECURSION LEVEL
			recurseLevel= 30;
		}
		if( recurseLevel < 0 ){  // BREAK OUT !!
			HideCaption.myDumpToConsole( "  Adjust_ChromeMargin()   BREAKING OUT from recurse  (warn?) ........  ");
			return;
		}

		
		//for  test firefox 12a+ Bug 7xxxxx ... 

		if( ! HideCaption.hcp_chromeMargin_forceZero_dummytest ){
			
			// setTimeout ... great delay for fx12+
			setTimeout( function(){
				
				HideCaption.hcp_chromeMargin_forceZero_dummytest= true; 

				HideCaption.calc_sysbuttons_active();

			}, 200);
		}

	
		// oct-16: la llamada final luego del viejo calc_1 o 2  
		// HideCaption.set_content_Position();

			
    	// set-2012:  Fx12+ -> can use SAME chromemargin always right?
    	const _chromemargin= "0,"+
    					HideCaption.userChromeMargin+"," +
    					HideCaption.userChromeMargin+"," +
    					HideCaption.userChromeMargin+"";
			    
		
    	//2011-aug-26: this DELAYED stays anyway, to assure things in the future (Fx9 alpha restored-mode bug)
    	//2012-03-05 : used DELAYED also for MAXIMIZED (& FULLSCREEN). Solved TODAY's BUG ! (BLACK-BACKGROUND (win loses glass effect) that HIDES system-buttons after doing: RESTORE -> FULLSCR -> RESTORE -> MAXIM.) 
    	//2011-early?: DELAYED for restored(and maxim!)-mode! fixes a visual problem in my Win7 64    (_chromemargin == "0,0,0,0")
    	setTimeout( function(_chromemargin_local){
    		//HideCaption.debug_move( "Adjust_ChromeMargin(..) with DELAY!" );
    		HideCaption.conditional_setChromemargin(_chromemargin_local);
    	}, 1, _chromemargin);
	};


	this.calc_sysbuttons_active=  function(){

		var bMaximized= HideCaption.WinState > 0;
		
		// evaluate the .._calc attribute 1st! - DONT use if fx4_titlebar_enabled 
		var adv_sysbut_winappear_calc =  HideCaption.fx4_titlebar_enabled ?  
													"": 
													(""+HideCaption.adv_sysbut_winappear); //make sure it's NO null
		HideCaption.mainW.setAttribute(    "dz_adv_sysbut_winappear_calc"      ,              adv_sysbut_winappear_calc     );
		HideCaption.mainW.setAttribute(    "dz_adv_sysbut_winappear_calc_unmax", !bMaximized? adv_sysbut_winappear_calc: "" );

		
		var old_sysbuttons_active= HideCaption.sysbuttons_active;
		
		HideCaption.sysbuttons_active=
					adv_sysbut_winappear_calc == ""  &&  !window.fullScreen;
					//TODO: agregar lo de aero-*BASIC* tb vd?

		if( old_sysbuttons_active != HideCaption.sysbuttons_active ){
			HCPlusLib.myDumpToConsole("  this have changed, new value is:  HideCaption.sysbuttons_active= " + HideCaption.sysbuttons_active ); 
		}
					
		//setAttribute for CSS!
		HideCaption.mainW.setAttribute( "hcp_sysbuttons_active", ""+HideCaption.sysbuttons_active );
		
		
		HideCaption.conditional_set_winbkg_color(); // llama aqui tb para max-unmax y seteo del fx4-titlebar vd?
	},
	
	
	this.winbkg_color_enablelist= "",
	this.winbkg_color       = "",
	this.conditional_set_winbkg_color= function( bReset ){ // bReset  <---- Reset & add-a-DELAY!! --> lwtheme itself changed or lwt-related-option changed! 

		function do__conditional_set_winbkg_color(){
		
			//"--adv_sysbut_winappear_calc--".indexOf("winbkg_color");
			
			var bSet= HideCaption.winbkg_color_enablelist != "" && !HideCaption.sysbuttons_active;
			
			var color_done= false;
			
			var lwtheme_filter_str= HideCaption.winbkg_color_enablelist == "not_in_lwtheme" ? ":not(:-moz-lwtheme)": "";
			
			// NICE lwtheme catch! ...querySelectorAll_forEach("#hctp_special_bkg:-moz-lwtheme,  #hctp-toolsubparent_box", ... )
			// And GLASS catch will work too?     :-moz-system-metric(windows-compositor)
			
			// custom-color  setted in CSS now !
			// if( bReset ) ...

			
			HideCaption.querySelectorAll_forEach( // '#navigator-toolbox' pq TIENE q existir al menos 1 elem p/ q se setee bien 'color_done' (PD: no se pq NO! anda ':root' ni 'window', etc!!)
			         "#navigator-toolbox"+lwtheme_filter_str+" ",
				function(elem){
					if( bSet ){
						// custom-color  setted in CSS now !
						// se ponia un "box-shadow" aca ...
						
						color_done= true;
					}
			});
		
			//for css
			HideCaption.mainW.setAttribute(    "dz_calc_winbkg_color", ""+color_done );
		
			HideCaption.mainW.style.setProperty("--hctp_winbkg_color", HideCaption.winbkg_color +"", "");

			/**  INCREIBLE!!: En Fx 60 TUVE q poner #hctp-toolsubparent_box{width: 100% !important;} en el css para que acepte!!, no acepta lo puesto en el attr "style".
			     Y HASTA RECIEN anduvo pq se lo tocaba aca en el .js!)
			     (debe ser la fuerte optimizacion del 'nuevo Quantum-css engine' o algo asi)
			**/

		} // do__.....()

		if( !bReset ){
			do__conditional_set_winbkg_color();
		}else{ // do DELAY!!
			setTimeout(function(){
				do__conditional_set_winbkg_color();
			}, 50); // 50
		}
	},
	
	this.querySelectorAll_forEach= function( cssString, callbackFunc ){

		HCPlusLib.querySelectorAll_forEach(HideCaption.mainW, cssString, callbackFunc);
	},

	
	this.old_WinState= null,
	this.conditional_setChromemargin=  function(_chromemargin){
		var WinState_changed= false;
		if( HideCaption.old_WinState != HideCaption.WinState ){
			HideCaption.old_WinState  = HideCaption.WinState;
			WinState_changed= true;
		}
		
		var _old_chromemargin = HideCaption.mainW.getAttribute("chromemargin");
		if( _old_chromemargin != _chromemargin ){
			//New cm !!
			if( ! WinState_changed ){ //Feb 2012: does it below with 'anti bad-resize' AVOIDING more flickering!
				HideCaption.do_setChromemargin(_chromemargin);
			} 

	        var toolbox  = document.getElementById("navigator-toolbox");
			
			var cm_top= (""+_chromemargin).split(",")[0];
			var system_buttons_active= HideCaption.sysbuttons_active || cm_top == "-1";  // cm_top == "0"
			if( system_buttons_active ){
				toolbox          .removeAttribute( "customtheme_tbar_appearance");
				HideCaption.mainW.removeAttribute( "customtheme_bkg_appearance" );
			}else{ // !system_buttons_active
				toolbox          .setAttribute(    "customtheme_tbar_appearance", "default" );
				HideCaption.mainW.setAttribute(    "customtheme_bkg_appearance" , "important" );
			}
		}
	},
	
	
	this.systemCaption_present= false,
	this.previous_systemCaption_present= null, // different (!=) from false and true
	
	this.do_setChromemargin=  function(_chromemargin){

		HideCaption.systemCaption_present= false; //fix for fx-menubar-behavior (prev. commit)
		var cmargin_fx= HideCaption.mainW.getAttribute("chromemargin");
		//HCPlusLib.myDumpToConsole("cmargin_fx= "+cmargin_fx);
		if( cmargin_fx != null && cmargin_fx.length > 0 ){
			var arrSplit = cmargin_fx.split(",", 5);
			//HCPlusLib.myDumpToConsole("arrSplit= "+arrSplit);
			if( arrSplit.length > 0 && (""+arrSplit[0]).replace(/\s+/g,'') == "-1" ){  // this replace == trim()
				HideCaption.systemCaption_present= true;
			}
		}else{ //cm == null or empty
			HideCaption.systemCaption_present= true;
		}
		
		//set "hctp_systemCaption_present" attribute
		HideCaption.mainW.setAttribute("hctp_systemCaption_present"     , HideCaption.systemCaption_present ); //
		// set 'hcp_Hiddencaption' attr ---  for windows only !!
		if( HCPlusLib.getPlatformPlus() == "windows" ){ 
			HideCaption.my_set_Hcp_Hiddencaption( ! HideCaption.systemCaption_present );
		}

		//was changed?
		if( HideCaption.previous_systemCaption_present != HideCaption.systemCaption_present ){
			HideCaption.previous_systemCaption_present  = HideCaption.systemCaption_present;
			
			HCPlusLib.set_sysborder_settings();
		}

		//
		if( HideCaption.systemCaption_present ){
			HideCaption.myDumpToConsole(" NOT changing chromemargin.  'systemCaption_present'  detected in Firefox 'chromemargin':  "+cmargin_fx);
			// dont touch!  
			return;
		}
		
		
		HideCaption.debug_move( "do_setChromemargin("+_chromemargin+")" );
		HideCaption.mainW.setAttribute("chromemargin"     , _chromemargin ); // 

		setTimeout( function(){ // better delay this after a CM change
			HideCaption.do_setRightBorderButtonBox(_chromemargin);
		}, 10);
	},

	this.myDeltaRight= 0,
	this.do_setRightBorderButtonBox=  function(_chromemargin){
		
		//var old_myDeltaRight= HideCaption.myDeltaRight;
		
		var bMaximized= HideCaption.WinState > 0;
		
		if( bMaximized ){
			return;  // RETURN !!
		}
		
		/** @type HTMLElement */
		var buttonbox= document.getElementById( "titlebar-buttonbox-container" );
		if( buttonbox ){
			
			var removeProp= false;
			if( (""+_chromemargin).indexOf("0,0,0") >= 0 ){ // string hack checking for now....
				//setea aca sincronizadamente el #titlebar-buttonbox-container, margin-right: {HideCaption.hcp_chromeMargin_ToXXX}px junto con el borde derecho del _chromemargin, vd?
				var referenceBox= document.getElementById( "hcp-root-box" );
				// aca uso mejor 'screenX'  y listo vd??
				
				// TODO: NEW17:  revisar en win8!
				const fullSysGap= 8; // oct-16: valor FIJO q anda en Win7!  // HideCaption.hcp_chromeMargin_Top_XXXXXX  
				HideCaption.myDeltaRight= fullSysGap - 
							  (referenceBox? (referenceBox.boxObject.screenX - HideCaption.mainW.boxObject.screenX): 3); // usa el delta left asumiendo que es IGUAL al right
	/*
	#main-window:not([hcp_fx4_titlebar_visible="true"])[hcp_sysbuttons_active="true"][hctp_hidden_sysborder="true"]:not(xxx_MAXIMIZED)  #titlebar-buttonbox-container {
	  right     :   3px  !important;
	}
	 */
				if( !HideCaption.fx4_titlebar_enabled && HideCaption.sysbuttons_active && !bMaximized ){ // hctp_hidden_sysborder ->  cmargin ~= "0,0,0"
					HideCaption.myDeltaRight += 3;
				}
				
				if( getComputedStyle(buttonbox).position == "static" ){ // new topEdge_titlebar_css(new15)!, (old is 'fixed')
					HideCaption.myDeltaRight -= 3;
				}
				
			}else if( (""+_chromemargin).indexOf(",-1,-1,-1") >= 0 ){ // extra comma at beginning :)
				//HideCaption.myDeltaRight= 0;
				removeProp= true;
			}else{
		    	HideCaption.myDeltaRight= HideCaption.userChromeMargin - 4; // cm=7 -> margin=3, etc
		    	if( HideCaption.myDeltaRight < 0 ){
		    		HideCaption.myDeltaRight = 0;
		    	}
			}
			
			if( bMaximized ){     
				HideCaption.myDeltaRight= 0;
			}
			if( removeProp ){
				buttonbox.style.removeProperty("margin-right");  // needed in walnut2
			}else{ // ! removeProp
				//if( old_myDeltaRight != HideCaption.myDeltaRight ) -> // this FAILED for sysborder full to disabled! ('removeProp' changed also!)
				buttonbox.style.setProperty("margin-right", HideCaption.myDeltaRight+"px", ""); // not important
			}
		}
	},
	
	
	// oct-16: la llamada final luego del viejo calc_1 o 2  
	//xxx.set_content_Position= function(){	 XXX_REMOVED;	};

	
	// .......Adjust_For_MenuBar_change_Fx4() functions <<<<--- equivalen a Adjust_For_SYS_CAPTION_change() ..... por ej cuando el user activa el "Title"...
	this.alreadyScheduled_adjustFx4= false,
    this.Delayed_Adjust_For_MenuBar_change_Fx4_Plus= function(_milliSecs) {
		if( ! HideCaption.alreadyScheduled_adjustFx4 ){
			// 1st call WITHOUT DELAYED for performance sake ...
			HideCaption.Adjust_For_MenuBar_change_Fx4();
		}
		HideCaption.Delayed_Adjust_For_MenuBar_change_Fx4(_milliSecs);
    },
    this.Delayed_Adjust_For_MenuBar_change_Fx4= function(_milliSecs) {
	
			if(!HideCaption.alreadyScheduled_adjustFx4 ){
				HideCaption.alreadyScheduled_adjustFx4= true;

				if( !_milliSecs ){ 
					_milliSecs= 0; 
					//HideCaption.myDumpToConsole(" ... _milliSecs set to "+_milliSecs); 
				}
				// using DELAYED here ...
				setTimeout( function(){
						HideCaption.alreadyScheduled_adjustFx4= false;
						HideCaption.Adjust_For_MenuBar_change_Fx4();
					}, _milliSecs);
			}else{ // skipping: alreadyScheduled!
				//HideCaption.myDumpToConsole    (          "  SKIPPING ...   alreadyScheduled_adjustFx4 == true");
			}
	},
	
	this.Adjust_For_MenuBar_change_Fx4=  function(){
	
		HideCaption.Adjust_ChromeMargin();

		HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus();

		//set attr in bottomBOX ! //set for findBar-present too ? I think NOT, bc findbar is temporarily toggled and will provoke flickering...
		var bottomBox= document.getElementById("browser-bottombox");
		if( bottomBox ){
			var addonBar= document.getElementById("addon-bar");
			bottomBox.setAttribute("hcp_empty", addonBar && addonBar.boxObject.height > 3? "false": "true");
		}
	},
	
	/*
	this.my_moveTo_pos= function(thePos){
		this.my_moveTo(thePos.X, thePos.Y);	
	},
	this.my_moveTo= function(_x, _y){
		this.debug_move("moveTo("+_x+","+_y+")");
		window.moveTo  (_x, _y);	
	},
	this.my_resizeTo_pos= function(thePos){
		this.my_resizeTo(thePos.W, thePos.H);	
	},
	this.my_resizeTo= function(_x, _y){
		this.debug_move("resizeTo("+_x+","+_y+")");
		window.resizeTo(_x, _y);
	},
	*/
	
	this.my_maximize= function(){
		this.debug_move("maximize()");
		window.maximize();
	},
	this.my_restore= function(){
		this.debug_move("restore()");
		window.restore();
	},
	// BrowserFullScreen()
	this.my_BrowserFullScreen= function(){
		this.debug_move("BrowserFullScreen()");
		window.BrowserFullScreen();
	},

	
	this.debug_move= function(_sMsg){
		//HCPlusLib.mywait(400);
		this.myDumpToConsole("        >> about to: "+_sMsg);
	},
	
	// ----------------------------------------------------------------------

	
	
	this.xul_onLoad=  function(xul_document, the_unloaders) {

			//xul_document.documentElement.firstChild
			
		    //HCPlusLib.myDumpToConsole("  xul_document.documentElement.firstChild id="+xul_document.documentElement.firstChild.id);

			/***
			ZZZfunction cleanNode( elem ){
				//HCPlusLib.myDumpToConsole( "  "+elem.tagName+"   id="+elem.id );
				for( var n = elem.firstChild; n; ) {
					var nBak= n;
					n = n.nextSibling;
					
					if (nBak.nodeType != nBak.ELEMENT_NODE ) { //|| !nBak.hasAttribute("id")
						nBak.parentNode.removeChild(nBak);
					}else{
						cleanNode(nBak);
					};
				};
			};

		    ZZZcleanNode( xul_document.documentElement );
		    ***/
		    
		    
		    function printNode( elem, strGap, iLevel ){
		    	if( iLevel < 1 ){
		    		return;
		    	}
			    HCPlusLib.myDumpToConsole( strGap + "  "+elem.tagName+"   id="+elem.id );
			    
			    for (var n = elem.firstChild; n; n = n.nextSibling) {
			    	
			        //let id = n.getAttribute("id");
			        //xul[id] = n;
			        printNode(n, strGap+"\t", iLevel-1 );
			      };
		    };
		    

		    
		    var arrIds_canBeMissing= [];
			if( HCPlusLib.getPlatformPlus() != "windows" ){ 
				arrIds_canBeMissing= ["titlebar-buttonbox","prefSep"];
		    }
		    
		    //printNode( xul_document.documentElement, "", 3 );
		    //printNode( myNode, "" );

		    
			// hcp-root-box
		    //var   myNode = document.adoptNode( xul_document.documentElement ); // document.importNode() ->  make a copy
		    // DO SOMETHING! :-)
		    //document.getElementById('PersonalToolbar').insertBefore( myNode , null); //'hctp-float-bottombox'

		    
		    function getElem_mandat(_id){
		    	var el= document.getElementById(_id);
		    	if(!el ){
		    		const errWord= arrIds_canBeMissing.indexOf(_id) < 0? "error": "err"; 
	    			HCPlusLib.myDumpToConsole(" Ignoring "+errWord+": NO element found! --  id= "+_id );
		    	};
		    	return el;
		    }
		    function getElem_mandat_nextSibling(_id){
		    	var el= getElem_mandat(_id);
		    	return el? el.nextSibling: null;
		    }
		    
	    	//var $= document.getElementById;
		    
		    const elemList= [];

		    function overlayNode( elem, strGap, targetParent){

		    	let target= elem.id? document.getElementById( elem.id ): null; 
				
		    	if( elem.nodeType == elem.ELEMENT_NODE && elem.tagName.toLowerCase() == "hctp_special_palette" ){

					if( HCPlusLib.HcSingleton.get_CustomizableUI() ) {
						
						HCPlusLib.myDumpToConsole( "Skipping: " + strGap + "  "+elem.tagName+"   id="+elem.id );
						return;
					}else{
						// old code, eg. PALEMOON !!
						target= window.gNavToolbox.palette;
					}
		    	}
				
		    	if( target == null && elem.id == "BrowserToolbarPalette" && window.gNavToolbox.palette && window.gNavToolbox.palette.id == elem.id ){ // check PALETTE!
		    		target= window.gNavToolbox.palette;
		    	}
		    	if( target || elem.nodeType == elem.ELEMENT_NODE && elem.tagName.toLowerCase() == "overlay" ){ // if ALREADY exists  *OR*  is OVERLAY ROOT NODE

		    		//copy ATTRIBUTES
	    			var textAttrs = ""; 
		    		if( target && elem.hasAttributes() ) {
		    			var attrs = elem.attributes;
		    			for(var i=attrs.length-1; i>=0; i--) {
		    				if( attrs[i].name == "id" ){
		    					continue;
		    				}
		    				HCPlusLib.setAttribute_withBkp( target, attrs[i].name,         attrs[i].value );
		    				//target.setAttribute(                  attrs[i].name,         attrs[i].value );
		    				textAttrs +=                            attrs[i].name + "='" + attrs[i].value + "'   ";
		    			}
		    		} 

		    		HCPlusLib.myDumpToConsole( " -        " + strGap + "  "+elem.tagName+"   id="+elem.id+"               ATTRIBUTES:  " + textAttrs );
		    		
		    		//do childs 
		    		for (var n = elem.firstChild; n; ) {
		    			var nBak= n;
		    			n = n.nextSibling;

		    			overlayNode(nBak, strGap+"\t", target);
		    		};
		    	}else{ // MOVE this
		    		HCPlusLib.myDumpToConsole( "*MOVING*: " + strGap + "  "+elem.tagName+"   id="+elem.id );

		    		if( targetParent ){
		    			var positionId= null;
		    			if(      (positionId= elem.getAttribute("insertbefore")) ){  targetParent.insertBefore( elem, getElem_mandat            (positionId) ); }
		    			else if( (positionId= elem.getAttribute("insertafter" )) ){  targetParent.insertBefore( elem, getElem_mandat_nextSibling(positionId) ); }
		    			else {                                                       targetParent.appendChild ( elem );  }

		    			//for the_unloaders ...
		    			elemList.push( elem );
		    		}else{
			    		const errWord= arrIds_canBeMissing.indexOf(elem.id) < 0? "error": "err"; 
		    			HCPlusLib.myDumpToConsole(" ignoring "+errWord+": NO targetParent! --  elem-id="+elem.id);
		    		};
		    	};
		    };
		    
		    // adoptNode() -> MOVES the node ...
		    // document.importNode() ->  makes a copy
		    var my_documentElement = document.importNode( xul_document.documentElement, true ); 
		    
		    overlayNode( my_documentElement, "", null);
		    
		    // DEBUG: printing remaining nodes .....(imported but NOT moved)
	    	// HCPlusLib.myDumpToConsole( "\n\nCHECKING REMAINING NODES: \n");
		    // printNode( my_documentElement, "", 50 );
	    	HCPlusLib.myDumpToConsole( "---------- \n\n");


		    // UNLOADERS ------------------------------ 
		    the_unloaders.push(function() {
		    	elemList.forEach(function ( elem ) { 
	        		try {
	        			elem.parentNode.removeChild(elem);
	        		} catch (ex) {
	        			HCPlusLib.debugErr0r(" Err0r in elem.remove ...  ex= "+ex, ex);
	        		};
	        	});
	    	});
	    	

		    /***
		    var oSerializer = new window.XMLSerializer();
		    if( !!myNode ){
			    //XML().toXMLString();
			    //HCPlusLib.myDumpToConsole( "\n\n sPrettyXML=  "+ oSerializer.serializeToString(myNode) +"\n\n" );
		    }
		    //HCPlusLib.myDumpToConsole( "\n\n root=  "+ oSerializer.serializeToString(xul_document) +"\n\n" );
		    ***/

			
			// for PALE MOON! ---  moves all configured widgets !!!	
			if( !HCPlusLib.HcSingleton.get_CustomizableUI() ) {
				HCPlusLib.querySelectorAll_forEach( document, "toolbar", function( _tbar ){
					try{
						if( _tbar._init ){
							_tbar._init();
						}
					} catch (ex) { HCPlusLib.debugError(" OnLoad() error: ex= "+ex, ex); };
				});
			}
			
	},  // xul_onLoad

	
    this.OnLoad = function() {

		//load debug flag!!
		HCPlusLib.LoadDebugFlag();
		
		try {
			
			//Store lastOpenedWindow/s
			HCPlusLib.HcSingleton.windowIsOpened(window);
			
			
			if( !document.getElementById( "hcp-root-box" ) ){
				HideCaption.xul_onLoad(HideCaption.XUL_main_overlay_doc, unloaders);
			}else{
				HCPlusLib.debugError(" ignored error:  repetitive? call to load-over ");

				// me parece qno, pq ya hizo de nuevo todos los new xxx;  --->  return; // RETURN!
			}


			// Main_ONLOAD() !
			HideCaption.main_OnLoad();

			
			// --- check if 'deactivate' event is very quick! -- for "popunder" EVIL openings! ------------------------------
 
			if( HideCaption.is_trackedOpened ){  // setted in windowIsOpened()
				
				var nearBeggining= true;
				window.setTimeout(function() {
					nearBeggining= false;
				}, 2000);
				window.addEventListener(       "deactivate", function hc_on_deactivate() {
					window.removeEventListener("deactivate",          hc_on_deactivate, false);
					if( nearBeggining ){
						//play audio on opened windows too!
						HCPlusLib.Audio_Sound_action1.play();
					}
				}, false);
			}
			
		} catch (e) {
			HCPlusLib.debugError(" OnLoad() error: ex= "+e, e);
		};
	};
	

    this.main_OnLoad = function() {
		
        var Class = "@mozilla.org/preferences-service;1";
        var my_prefService= Components.classes[Class].getService(Components.interfaces.nsIPrefService);
        this.gPrefConfig = my_prefService.getBranch("extensions.");


        //--------------------------------------------

        this.mainW             = document.getElementById("main-window");

        this.tabBrowserContent = document.getElementById("appcontent");  // NO MORE 'content' in FX 60

		this.hcp_root_box      = document.getElementById("hcp-root-box");

		this.hctp_toparea      = document.getElementById("hctp_toparea"     );
		/**
		this.hctp_topsub_unmax = document.getElementById("hctp_topsub_unmax");
		this.hctp_topsub_max   = document.getElementById("hctp_topsub_max"  );
		 **/
		
		// initial state of fullscrTogller (this fixed bad state when fullscr-toolbar doesnt collapse due to user-pref.) 
		this.mainW.setAttribute("hctp_fullscrToggler_collapsed", "true"); 
		
        this.InitPos = 1; this.Resizing = 0; this.WinState = 0; 

		this.nav_platform= window.navigator.platform;

		
		//topright corner buttons! 2012-mar: put BEFORE Load_AllOptions()
		this.MmcTopButtons_size= new HCPlusLib.Hcp_Point();
		this.MmcTopButtons_size.setX(50);
		this.MmcTopButtons_size.setY(15);


		//FLOATING TOOLBARS!
		this.FloatToolbarsHandler.initHomeToolbar();

		//EXTRA Features like CUSTOMIZABLE main-menu
		this.FloatToolbarsHandler.init_ExtraFeatures();


		//--------------------------------------------


        // load PERSISTED attributes!, at very begginning but AFTER loading XUL!, *including* Floatbars' XUL
        // No, MOVED to Singleton, loads into My-XUL-Docs! --- HCPlusLib.HcSingleton.attrs_loadAll( document );


		//Load ALL options values !!!  -- do this AFTER FloatToolbarsHandler init !
		HCPlusLib.Load_AllOptions();

		
		
		//DELETES this LEGACY OPTION 
		HCPlusLib.clearUserPref("plus.use_caption");


		//it's FALSE on APP_STARTUP
		//HCPlusLib.myDumpToConsole("(window.windowState == window.STATE_MAXIMIZED) -> " + (window.windowState == window.STATE_MAXIMIZED) );

		HCPlusLib.myDumpToConsole("startup_reason_APP_STARTUP= "+HCPlusLib.HcSingleton.Bstrap.startup_reason_APP_STARTUP );


		//get FF version !!
		try{
			var appInfo =     Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var splitVersion= appInfo.version.split(".");
			this.ffVersionNumber= (splitVersion[0] * 10) + (splitVersion[1]*1);
		}catch(ex){ this.debugError("error: "+ex, ex);  }
		if( !this.ffVersionNumber || this.ffVersionNumber == 0){
		  try{
			/*
			Class = "@mozilla.org/preferences-service;1";
			var gPrefConfig_General = Components.classes[Class].getService(Components.interfaces.nsIPrefService);

			//HCPlus error: error: [Exception... "Component returned failure code: 0x8000ffff (NS_ERROR_UNEXPECTED) 
			//  [nsIPrefBranch...getCharPref]"  nsresult: "0x8000ffff (NS_ERROR_UNEXPECTED)"  

			//gives = Firefox/3.5.8 <-  used as last resort.
			var splitVersion= gPrefConfig_General.getCharPref("general.u...a.....extra.firefox",null).split("/")[1].split(".");
			this.ffVersionNumber= (splitVersion[0] * 10) + (splitVersion[1]*1);
			*/
		  }catch(ex){ this.debugError("error: "+ex, ex);  }
		}
		
		//set version as mainwindow attr!!
		HCPlusLib.setAttribute_withBkp( this.mainW, 'dz_ff_version', this.ffVersionNumber ); //dz is my 'vendor' name (DarthZilla) ;-) 

		
		HideCaption.isPopup= false;

		// call  calc_isPopup() with DELAY ---------------------------------
		function calc_isPopup( call_counter ){
			//EARLY return !
			if( HideCaption.isPopup || call_counter < 1 ){
				return;
			}
			
			var fx_menubar = document.getElementById("toolbar-menubar");
			var menubar_style_display= "";
			try {
				menubar_style_display= getComputedStyle(fx_menubar,"").display;
			} catch (ex) {	
				HideCaption.debugError("ignored error in getComputedStyle(fx_menubar,...): "+ex);
			}

			/** @type String */
			var chromehidden= window.document.documentElement.getAttribute("chromehidden"); // used by FF to disable sidebars & toolbas in POPUPS !!!

			if( menubar_style_display != "-moz-box" || 
				(chromehidden && chromehidden != "" ) ){
				HideCaption.isPopup= true;
				
				setTimeout( function(){
					//xx-window.TabsInTitlebar.allowedBy("tabs-visible", true);  // para POPUPS!!! -- ya no hace falta pq anulo a 'bajo nivel' y encima pongo mi custom-caption  
					
					//re-calc things from new chromemargin
					HideCaption.do_setChromemargin( HideCaption.mainW.getAttribute("chromemargin") ); // calc also: systemCaption_present
					
			    	//vertMax .. NOT for popup!!!
			    	HideCaption.HcExtras.vertMax_enforceRules();

				}, 10);
				
			}else{ // NOT isPopup
				setTimeout( function(){
					calc_isPopup( call_counter - 1 );
				}, 200);
			}
			
			HideCaption.myDumpToConsole(
					 "  called: calc_isPopup( "+call_counter+" )"+
					 "    \n\r                HideCaption.isPopup: "+HideCaption.isPopup +
					 "    \n\r                       chromehidden: "+chromehidden +
					 "    \n\r              menubar_style_display: "+menubar_style_display +
					 "    \n\r  ."+
					 "");
		}

		//con DELAY .. necesario al reiniciar con un popup abierto.
		setTimeout( function(){ calc_isPopup( 3 ); }, 10);

		//if( !this.isPopup ){
		//	this.ResetBorder();//after setting this.WinState  
		//	//very-old note: (aqui aparecio un BUG rarisimo y volvio a desaparecer: sobre fullscreen y 'mal' winstate entre maximizado, etc -debio haber sido el toque del profile por ff3.7 vd?)
		//}
		
		var hcp_hiddencaption= true;
        if (!this.mainW) {
        	throw new Error("Hctp: this.mainW is null/undefined !!");
        }
		
		//if( local_haveCaptXXX_never )  // old vars from option use_caption
		hcp_hiddencaption= true;
		
		this.my_set_Hcp_Hiddencaption( hcp_hiddencaption ); // ALWAYS set this attribute for css to work well!
				
		//SET WEB-TITLE listeners! --------------------------------------------------
		
		//if( !this.haveCaptXXX_Permanent )
		//old EXPENSIVE method - 
		// **** HideCaption.mainW.addEventListener("<devil-was-here>", function(e) { HideCaption.mainW_onDOMAttr(e); }, false);
		
		function  on_DOMTitleChanged (event) {
			HideCaption.SetWebTitle("dummy_domtitlechanged");
			//HideCaption.debugEvent(event, "from content");
		}
		HideCaption.tabBrowserContent.addEventListener("DOMTitleChanged", on_DOMTitleChanged, false);
		
		if( HideCaption.tabBrowserContent.addProgressListener ){
			HideCaption.tabBrowserContent.addProgressListener(HideCaption.hcp_urlBarListener);
			// no se usa mas este parametro!! - Bug 608628  -- Components.interfaces.nsIWebProgress.NOTIFY_STATE_ALL | Components.interfaces.nsIWebProgress.NOTIFY_ALL 
			// NOTIFY_REFRESH 
		}else{
			HideCaption.myDumpToConsole(" err0r ??: NO tabBrowserContent.addProgressListener   ");
		}


	    // UNLOADERS ------------------------------ 
	    unloaders.push(function() {
	    	
	    	//if( HideCaption.use_hidechrome_option == "uhc_yes" ){
	    	//	HideCaption.mainW.removeAttribute("hidechrome");
	    	//}

			HideCaption.tabBrowserContent.removeEventListener("DOMTitleChanged", on_DOMTitleChanged, false);
			if( HideCaption.tabBrowserContent.removeProgressListener ){
				HideCaption.tabBrowserContent.removeProgressListener(HideCaption.hcp_urlBarListener);
			}
			
			//HideCaption.addEvents_Dragging();
			
    	});

		
		
		//SET Toolbars listeners! --------------------------------------------------
		// deleted ....
		
		this.hcp_platformPlus= HCPlusLib.getPlatformPlus();
		HCPlusLib.setAttribute_withBkp( this.mainW, "hcp_platformPlus", this.hcp_platformPlus);

		HideCaption.myDumpToConsole(
							 "    \n\r  "+
							 "    \n\r              this.hcp_platformPlus: "+this.hcp_platformPlus +
							 "    \n\r              this.nav_platform: "    +this.nav_platform +
							 "    \n\r  "+
							 "    \n\r              this.ffVersionNumber: "+this.ffVersionNumber +
							 "    \n\r  "+
							 ""
							 );

		// DRAG events!
		HideCaption.addEvents_Dragging();

		
		//set web title
		setTimeout( function(){
				HideCaption.SetWebTitle("dummy_onload");
				setTimeout( function(){
						HideCaption.SetWebTitle("dummy_onload");
					}, 1000);
			}, 1000);
		
		//HOME TOOLBAR !!
		this.HomeToolbarHandler.initHomeToolbar();
		this.TopRightBar_Handler.init();
		
		
		
		HCPlusLib.CheckNewVersionLaunched();

		
		
		// ------ setListeners ---------------------------------------------------------------------------------------

		// "sizemodechange" 
		//HideCaption.sizemodechange_delay= xx; 
		
		function local_setListeners( bAdd ) {
			HideCaption.set_EventListener( bAdd, window, "toolbarvisibilitychange" , HideCaption.on_toolbarvisibilitychange, false);
			
			HideCaption.set_EventListener( bAdd, window, "sizemodechange" , HideCaption.on_sizemodechange , true);  // capture = true !

			// called these AT LAST, bc onresize had been called BEFORE onload() finished!!!
			HideCaption.set_EventListener( bAdd, window, "resize"         , HideCaption.OnResize , false);
			HideCaption.set_EventListener( bAdd, window, "unload"         , HideCaption.OnClose  , false);
			// ('XXbeforeunload', xxx.OnClose , false); //issue with page's confirm-leave-dialog!!
			
			// customization
			HideCaption.set_EventListener( bAdd, window.gNavToolbox, "beforecustomization", HideCaption.on_beforecustomization, false);
			HideCaption.set_EventListener( bAdd, window.gNavToolbox, "aftercustomization" , HideCaption.on_aftercustomization , false);
		};
		
		local_setListeners( true );

		// 2017: to make sure of getting nice style at addon startup! - 3 calls!
		HideCaption.OnResize_adjust_state();
		setTimeout( function(){
				HideCaption.OnResize_adjust_state();
				setTimeout( function(){
						HideCaption.OnResize_adjust_state();
					}, 1000);
			}, 500);
		
		//OBSERVER for lightweight-theme !!
		const observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		//this isn't needed right? :  "lightweight-theme-changed"                     
		observerService.addObserver(    HideCaption.lwtheme_update_observer, "lightweight-theme-styling-update", false); //<-- json data!      
		
		
	    // UNLOADERS ------------------------------ 
	    unloaders.push(function() {
			
	    	local_setListeners( false );

			//OBSERVER for lightweight-theme !!
			observerService.removeObserver( HideCaption.lwtheme_update_observer, "lightweight-theme-styling-update");    
    	});

	    
		//-- chromemargin ------------------------------------------------------------------------
    	var _chromemargin= "0,"+
		HideCaption.userChromeMargin+"," +
		HideCaption.userChromeMargin+"," +
		HideCaption.userChromeMargin+"";

		HCPlusLib.setAttribute_withBkp( HideCaption.mainW, "chromemargin", _chromemargin); // make sure to REMOVE SYSTEM CAPTION before do_set..()
		HideCaption.do_setChromemargin(                _chromemargin);

		// Apr-2014: NEW Australis chromemargin in updateTitlebarDisplay() !! 
		// use a pref-key also here?
		if( window.updateTitlebarDisplay ){ // not in Linux

			const original_updateTitlebarDisplay= window.updateTitlebarDisplay;

			window.updateTitlebarDisplay= function HCTP_updateTitlebarDisplay() { 

				if (window.TabsInTitlebar.enabled) {
					//document.documentElement.setAttribute("chromemargin", "0,2,2,2");
				}else{
					//document.documentElement.removeAttribute("chromemargin"); 
				}
				
				var syscaption_visible= !HideCaption.forbid_fxaustr_syscaption && !window.TabsInTitlebar.enabled;
				
				document.documentElement.setAttribute("dz_fxaustr_syscaption", ""+syscaption_visible ); // 'true' or 'false' 

			};

			//needed when Fx's setting: System Titlebar is On
			setTimeout(function(){
				window.updateTitlebarDisplay();
			}, 200);
			
		    // UNLOADERS ------------------------------ 
		    unloaders.push(function() {
				window.updateTitlebarDisplay= original_updateTitlebarDisplay;
	    	});
		}

		// hctp_exclude_windragging
		if(!HCPlusLib.HcSingleton.isFx47orLater ){ // is Fx46-
			HCPlusLib.setAttribute_withBkp( HideCaption.mainW, "hctp_exclude_windragging", "true"); // EXCLUDE for Fx46-
		}
		
		// hctp_isReleaseVersion
		HCPlusLib.setAttribute_withBkp    ( HideCaption.mainW, "hctp_isReleaseVersion"   , HCPlusLib.HcSingleton.isReleaseVersion );

		
		//DON'T USE this bc. it is filtered by previous calls! -> HideCaption.Delayed_calcSpaceForMinMaxCloseButtons(1000);
		setTimeout( function(){// double call useful for very slow computers! (like one here!)

			HideCaption.Delayed_Adjust_For_MenuBar_change_Fx4();

			setTimeout( function(){
				
						HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(100);

						setTimeout( function(){
							HideCaption.Delayed_calcSpaceForMinMaxCloseButtons_Plus(100);
						  }, 1500);

						//TODO: enforce minimun window size! (prevent it to be a DOT in linux+hidechrome)
						//alert('calc');
					  }, 500);

			// some last attribute settings ...
	  		HideCaption.setAttr_smart("appmenu-toolbar-button"   , "context", "hcp-menu-windowcontrols", false); //LINUX's Firefox Button //TODO: context se propaga al MENU flotante en LINUX..
	  		HideCaption.setAttr_smart("appmenu-button-container" , "context", "hcp-menu-windowcontrols", false);
	  		HideCaption.setAttr_smart("appmenu-button"           , "context", "hcp-menu-windowcontrols", false); //for MOVED Fx button!
	  		HideCaption.setAttr_smart("titlebar-buttonbox"       , "context", "hcp-menu-windowcontrols", false);
			//disable command *and tooltip* in close-button!
	  		HideCaption.setAttr_smart("titlebar-close"    	   	  , "command"  	 , ""                    , true);
	  		HideCaption.setAttr_smart("titlebar-close"    	   	  , "oncommand"	 , ""                    , true);
	  		HideCaption.setAttr_smart("titlebar-close"    	   	  , "tooltiptext", ""                    , true);
	  		HideCaption.setAttr_smart("titlebar-close"    	   	  , "tooltip"	 , ""                    , true);


	  		// SPECIAL BUTTONS mouse events stuff! ----------------------------------------------------------------

		    function  hc_blockEvent(event){
				event.stopPropagation();
	        	event.preventDefault();
			    //HCPlusLib.myDumpToConsole("   hc_blockEvent( "+event.type+" )  --  event.target.id="+ (event.target? event.target.id: "(no target found)")); // DUMP_EVENT
	        	return false;  // eg. for 'contextmenu' (It's like blocking-the-popup in popupshowing)
		    }
	  		//var mainW_mouseup_onetime= new HideCaption.Hc_EventListener( HideCaption.mainW, "mouseup"    , hc_blockEvent, false);
	  		
		    //NO lo pongo dentro de la function...(bAdd) pq puede CAMBIAR de valor en UNLOAD time!
		    HideCaption.closebut_mouseClick= HCPlusLib.GetPref_plus(HCPlusLib.BOOL_PREF, "plus.action.closebut_mouseClick", false);
			const mouse_down_or_click= HideCaption.closebut_mouseClick? "click": "mousedown";
		    
	  		function close_mousebut(event) {

		    	//mainW_mouseup_onetime.add_Listener_oneTime(); // en Fx40 ya no necesito este vd?

	  			event.h_butHold= HideCaption.Holder_CloseButtons;

			    //payload :-)
		    	HideCaption.primarBut(event, HideCaption.Close           );
		    	HideCaption.secondBut(event, HideCaption.Close_secondBut );  
		    	HideCaption.middleBut(event, HideCaption.Close_middleBut );
		    	// BLOCK default behaviors!
		    	hc_blockEvent(event);
		    };
		    
	  		function fxbut_mousebut(event) {
			    //HCPlusLib.myDumpToConsole(" fxbut_mousebut()  event= "+event.type+"   button= "+event.button+"   detail= "+event.detail+"   obj= "+event );
			    //xxxdeCaption.fxbut_ev= event; //TODO:  *beware* of leaving this on!

	  			event.h_butHold= HideCaption.Holder_FxButtons;
	  			
		    	HideCaption.primarBut(event, HideCaption.fxbut_primary   );
		    	HideCaption.secondBut(event, HideCaption.fxbut_secondary );
		    	HideCaption.middleBut(event, HideCaption.fxbut_middle	 );
		    	// BLOCK default behaviors!
		    	hc_blockEvent(event);
		    };
		    
	  		// [hcp_close_button_events="true"]  and  [hcp_fxbut_events=...]
			const elements__hcp_close_button= Array.slice(document.getElementsByAttribute( "hcp_close_button_events", "true"));
			const arrElems_fx_but           = Array.slice(document.getElementsByAttribute( "hcp_fxbut_events"       , "true"));
			
			HideCaption.popup_backForwardMenu= document.getElementById('backForwardMenu');
			HideCaption.content_deck= document.getElementById('content-deck');
			
			
	  		function set_Listeners_atEND( bAdd ) {

			    HideCaption.set_EventListener( bAdd, HideCaption.popup_backForwardMenu, 'popupshowing', HideCaption.backForwardMenu_popupshown_or_hidden, false );
			    HideCaption.set_EventListener( bAdd, HideCaption.popup_backForwardMenu, 'popupshown'  , HideCaption.backForwardMenu_popupshown_or_hidden, false );
			    HideCaption.set_EventListener( bAdd, HideCaption.popup_backForwardMenu, 'popuphidden' , HideCaption.backForwardMenu_popupshown_or_hidden, false );
	  			
				elements__hcp_close_button.forEach(function(_elem){
					// FOREACH LOOP ! ---------------------------------------------------------------
					
				    //HCPlusLib.myDumpToConsole("  hcp_close_button_events   attr: - id="+_elem.id);

				    HideCaption.set_EventListener( bAdd, _elem, mouse_down_or_click	, close_mousebut	, true ); // capture= true!
				    HideCaption.set_EventListener( bAdd, _elem, 'dblclick'			, close_mousebut 	, true ); // capture= true
				    
				    //deCaption.set_EventListener( bAdd, _elem, 'click'      		, hc_blockEvent  	, true );
				    HideCaption.set_EventListener( bAdd, _elem, 'contextmenu'		, hc_blockEvent  	, true ); // bloquear solo este basta en Fx40
				    
				    HideCaption.set_EventListener( bAdd, _elem, 'wheel'      		, HideCaption.CloseBut_onWheel, true );
				    
				    // mouseenter
				    if( HCPlusLib.HcSingleton.Settings.btt_blockFirst  ||  !bAdd ){ // always calls removeListener
					    HideCaption.set_EventListener( bAdd, _elem, 'mouseenter'    , HideCaption.clBut_mEnter, true );
				    }
				    
				    /***
				    function printEvent(ev){
			        	HideCaption.myDumpToConsole(" \nevent:"+ev.type+ "  ---------------------  ");
				    }
				    HideCaption.set_EventListener( bAdd, _elem, "mousedown"	, printEvent, true ); // capture= true!
				    HideCaption.set_EventListener( bAdd, _elem, "mouseup"	, printEvent, true ); // capture= true!
				    HideCaption.set_EventListener( bAdd, _elem, "click"		, printEvent, true ); // capture= true!
				     ***/
				    
				    _elem.   setAttribute("tooltip", "tt_closeBut_evts");  // controlar siewmpre q si se incluyen elem originales de Fx, hay q hacer attrWithBackup()!
					
				    // REMOVE and ADD it again to make it work in Fx develEd 60b9 !!
				    _elem.removeAttribute("tooltip", "tt_closeBut_evts");
				    setTimeout( function(){ // delay!
				    	_elem.setAttribute("tooltip", "tt_closeBut_evts");
				    }, 200);

				    _elem.removeAttribute("tooltiptext");
				});
				
				// fxbut
				arrElems_fx_but.forEach(function(_elem){
				    HideCaption.set_EventListener( bAdd, _elem, mouse_down_or_click	, fxbut_mousebut 			, true ); //capture= true
				    HideCaption.set_EventListener( bAdd, _elem, 'dblclick'			, fxbut_mousebut 			, true ); //capture= true
				    HideCaption.set_EventListener( bAdd, _elem, 'wheel'    			, HideCaption.fxbut_wheel	, true ); //capture= true

				    HideCaption.set_EventListener( bAdd, _elem, 'contextmenu'		, hc_blockEvent  			, true ); // bloquear este!

				    // mouseenter
				    if( HCPlusLib.HcSingleton.Settings.btt_blockFirst  ||  !bAdd ){
					    HideCaption.set_EventListener( bAdd, _elem, 'mouseenter'    , HideCaption.fxBut_mEnter, true );
				    }
				    
				    _elem.   setAttribute("tooltip", "tt_fxBut_evts");
				    _elem.removeAttribute("tooltiptext");
				});
				
				// "hc_Widget_moved"
				HideCaption.set_EventListener( bAdd, window.gNavToolbox, "hc_Widget_moved", HideCaption.on_hc_Widget_moved, false);
				
				//"TabSelect"
				HideCaption.set_EventListener( bAdd, window.gBrowser.tabContainer, "TabSelect" , HideCaption.onTabSelect  , false);

				// window deactivate
				HideCaption.set_EventListener( bAdd, window                      , "deactivate", on_win_deactivate, false);

				
		  		//NEW test!  2016/03
		  		HideCaption.LineScan.set__history_lineScan_full( bAdd ); // depends of prefValue-word 'scanFull'
	  		};
			
			setTimeout( function(){ // delay!

	  		// ADD listeners
	  		set_Listeners_atEND( true );
			}, 500);
	  		
			// >>> UNLOADERS <<<
	  		unloaders.push(function(){
		  		// REMOVE listeners
		  		set_Listeners_atEND( false );
		  		
		  		//super_stop_animations
		  		HideCaption.set__super_stop_animations( false );
		  		
		  		HideCaption.set__key_close_tab( "" );
		  		
			});
			
		  }, 1);

    }; // main_OnLoad()
    

	this.onTabSelect= function(event) {
		
		setTimeout( function(){
			HideCaption.SetWebTitle("in-TabSelect");
		}, 10);
		
		if( HideCaption.popup_backForwardMenu  ){
			HideCaption.popup_backForwardMenu.hidePopup(); // esto se hace , pq mi closeWithHist. NO cierra si se cambio de tab!
		}
	};
    
	
	const on_win_deactivate = function(event) {
    	//HideCaption.myDumpToConsole(" event: "+event.type+ "    ");
    	
    	HideCaption.quit_dragging( false );
	};

	
	// customization
	this.is_Customizing = false;
	
	this.on_beforecustomization= function(event) {
		HideCaption.is_Customizing= true;
		HideCaption.TBoxHide.on_beforecustomization(event);
	};
	this.on_aftercustomization = function(event) {
		HideCaption.is_Customizing= false;
		HideCaption.TBoxHide.on_aftercustomization(event);
	};

	
	// -----------------------------------------------------
	
    this.TipConf= new (function(){
    	
    	// first time block feature!!!
    	const tOut_blockFirstTime= new HCPlusLib.HcSingleton.Hc_Timeout();
    	var tt_block     = false;
    	var tt_block_elem= null;

    	
    	this.tt_allow    = true;
    	
    	//from pref change
    	this.setOption__action_tooltips= function( _val ){
    		HCPlusLib.HcSingleton.Settings.btt_blockFirst = HCPlusLib.HcSingleton.hasWord( _val, "blockFirst" );
    		HCPlusLib.HcSingleton.Settings.btt_never      = HCPlusLib.HcSingleton.hasWord( _val, "never"      );
    		
    	    tt_block = HCPlusLib.HcSingleton.Settings.btt_blockFirst ||
    	               HCPlusLib.HcSingleton.Settings.btt_never;
    	    HideCaption.TipConf.tt_allow = !tt_block;
    	    tt_block_elem= null;
    	};

    	
    	this.tt_mouseEnter= function( event ) {
        	HideCaption.set_EventListener( true , event.currentTarget, 'mouseleave', HideCaption.TipConf.tt_mouseLeave, true );

    		// Settings.btt_blockFirst
    		if( HCPlusLib.HcSingleton.Settings.btt_blockFirst ){
    			if( tt_block  ||  tt_block_elem  &&  tt_block_elem != event.currentTarget ){
    				HideCaption.TipConf.tt_allow= false;
    			}else{
    				HideCaption.TipConf.tt_allow= true ;
    			}
    		}
    	};
    	this.tt_mouseLeave= function( event ) {
            HideCaption.set_EventListener( false, event.currentTarget, 'mouseleave', HideCaption.TipConf.tt_mouseLeave, true );
    		
    		// Settings.btt_blockFirst
    		if( HCPlusLib.HcSingleton.Settings.btt_blockFirst ){
    			
    		    //HCPlusLib.myDumpToConsole("  tt - :   tt_block="+tt_block);
    			
    			// RESTRICT for this button if we came from 'blocked mode'
    			tt_block_elem= HideCaption.TipConf.tt_allow? null: event.currentTarget;  // currentTarget (where the action listener is attached) (segun mdn)
    			
    			tt_block     = false;
    			tOut_blockFirstTime.setTimeout( function() {
    				tt_block= true;
        		    //HCPlusLib.myDumpToConsole("  tt - :   tt_block set to TRUE!!");
    				//HCPlusLib.get_bannedBut_audio().play();
    			}, 800); 
    				
    			//HCPlusLib.get_bannedBut_audio().play();
    		}
    	};

    })();
	
    
    this.Hc_Tooltip_Holder= function (){
    	
    	const self_ttHolder= this;
    	
    	const tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
    	
    	var   tt_anchor= null;
    	
    	var   isInside= false;
    	
    	//external flag
    	this.afterAction_executed= false; // fue ya ejecutado EN ESTA "ENTRADA" ??
    	
	    function addEvListener_mouseleave() {
	    	if( tt_anchor ){
	        	//HideCaption.myDumpToConsole("   addEvListener_mouseleave() ");
	        	HideCaption.set_EventListener(     true , tt_anchor, 'mouseleave', function On_leave_anchor( mLeave_event ) {
		        	HideCaption.set_EventListener( false, tt_anchor, 'mouseleave',          On_leave_anchor,  true );  // CLEAN listener!
					
		        	isInside= false; // flag inmediato!, fuera del tOut 
		        	
		        	self_ttHolder.afterAction_executed= false;
		        	
		        	tOut.setTimeout( function() {
			        	tt_anchor= null;
					}, 700);
		        	//HideCaption.myDumpToConsole("   On_leave_anchor() ");
	    		}, true );
	    	}else{
	        	HideCaption.myDumpToConsole("   addEvListener_mouseleave():   warn:  NO ANCHOR obj! ");
	    	}
	    };
	    
    	this.block_tt= function( action_event ) {
    		if( !isInside ){
    			tt_anchor= null;  // para q NO aparezca el tt al entrar de nuevo rapido! (detectamos la salida y entonces SE CORTA el tOut y se pone un NUEVO listener)
    		}

    		if( HCPlusLib.HcSingleton.Settings.btt_blockFirst ){
        		HideCaption.TipConf.tt_allow= false; // q no aparezca ni aunque me vaya al otro boton...
    		}
    		
    		check_and_addListener( action_event.currentTarget );  // currentTarget (where the action listener is attached)
    	};
	    
    	this.onPopupShowing= function( pShow_event, elem_this ) {
    		if( !HideCaption.TipConf.tt_allow ){
    			return false;
    		}
    		return check_and_addListener( document.tooltipNode ); // tb podria ser:   elem_this.triggerNode   (probado en fx50a)
    	};
    	
        function check_and_addListener( _elem ) {
    		if( tt_anchor ){
    		    // HCPlusLib.myDumpToConsole("  ... aborting tooltip!  ");
    		    // HCPlusLib.myDumpToConsole("  ... is equal target: "+(tt_anchor===_elem) );
    			return false; // ABORT TOOLTIP!
    		}
    		tOut.clear_removeTimeout();
    		tt_anchor= _elem;
    		addEvListener_mouseleave(); // ADD new listener!
    		
    		isInside= true;
    		
    		return true;
		};
    };
    //Hc_Tooltip_Holder

    //zz_TtHolder_closeBut= new HideCaption.Hc_Tooltip_Holder();
    //zz_TtHolder_fxBut   = new HideCaption.Hc_Tooltip_Holder();

    const Buttons_Holder= function (){
    	this.ttHolder= new HideCaption.Hc_Tooltip_Holder();
    };

    this.Holder_CloseButtons= new Buttons_Holder();
    this.Holder_FxButtons   = new Buttons_Holder();


    
    /* 'Super-Stop' addon feature */
    this.set__super_stop_animations= function( bAdd ) {
		HideCaption.set_EventListener( bAdd, document		   , "keydown"		  , HideCaption.on_keydown_stop   , false);
	};
    this.on_keydown_stop= function (event) {
    	//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+" - currentTarget="+(event.currentTarget?event.currentTarget.id:"---")+"   event.keyCode="+event.keyCode );
    	if(event.type == "keydown") {
    		  if (event.keyCode == event.DOM_VK_ESCAPE && event.shiftKey ){ // SHIFT + ESC !!
    			  window.BrowserStop();
    		  }
    	}
    };


    // ctrl + w  close-with-history! 
    this.set__key_close_tab= function( sAction ) {
    	const bAdd= HCPlusLib.HcSingleton.hc_getFirstWord(sAction) == "closeWithHistory";
    	
		HideCaption.set_EventListener( bAdd, document		   , "keydown"		  , HideCaption.onkeydown__close_tab   , true); // CAPTURE == TRUE
	};
    this.onkeydown__close_tab= function (event) {
    	//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+" - currentTarget="+(event.currentTarget?event.currentTarget.id:"---")+"   event.keyCode="+event.keyCode );
    	
    	if(event.type == "keydown") {
  		  	if ((event.key == "w" || event.key == "W") && event.ctrlKey && !event.altKey && !event.shiftKey ){ // CTRL + W  (NOT ALT, NOT SHIFT)
				//setTimeout(function() {}, 0);

  		    	//HideCaption.myDumpToConsole("      ctrl+w   presionado!!!   " );
				
	        	event.preventDefault();
  				event.stopPropagation();
				
				HideCaption.closeWithHistory( {fromKey:true} ); // dont pass event with ctrlKey flag!
    		}
    	}
    };
    
    
    var bAttrs_persisted= false;
    
    //SHUTDOWN
    this.hc_shutdown= function() {
    	
    	HCPlusLib.HcSingleton.smallTabs_changed.is_shutdown= true;
		HCPlusLib.HcSingleton.smallTabs_changed.onChange( false ); // tracking turning off at shutdown!... 

		
		// PERSIST ATTRIBUTES ! -- BEFORE even Floatbars.hc_shutdown(); -- BUT also for ANY WINDOW closed, right?
		if( !bAttrs_persisted ){
			HCPlusLib.HcSingleton.attrs_persistAll( document );
		}
		bAttrs_persisted= true;
		
		
		HideCaption.FloatToolbarsHandler.hc_shutdown();
		HideCaption.HomeToolbarHandler  .hc_shutdown();
		HideCaption.TopRightBar_Handler .hc_shutdown();
		HideCaption.TBoxHide            .hc_shutdown();
		HideCaption.HcExtras            .hc_shutdown();

    	try{
    		HCPlusLib.myDumpToConsole(   "HC  Begin hc_shutdown()  " );

    		//removeListeners ANTES q sacar attrs ni nada vd?
    		listener_list.reverse().forEach(function( hcEvent ){
    			hcEvent.removeEventListener();
    		});

    		// Restore this BEFORE deleting elem.hctp_holder!
			//deCaption.alter_this_toolbar_2( HideCaption.lastAlteredObject, newSettings_XXX);
			HideCaption.do_alter            ( HideCaption.lastAlteredObject, null);
    		
    		arrElem_hcHolders.forEach(function( weakRef ){
    			let elem= weakRef.get();
    			if( elem ){
    				delete elem.hctp_holder;
    	    		//HCPlusLib.myDumpToConsole(   "   weakRef: deleted holder of: "+elem.id );
    			}else{
    	    		HCPlusLib.myDumpToConsole(   "   weakRef:  lost it! " );
    			}
    		});
    		
    		//OnClose()
    		HideCaption.OnClose();

    	} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
    };
    //hc_shutdown

    
    this.forbid_fxaustr_syscaption= false;
	
    this.hcp_urlBarListener= {
    		  QueryInterface: function(aIID)
    		  {
    		   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
         		   aIID.equals(Components.interfaces.nsIWebProgressListener2) ||
     		       aIID.equals(Components.interfaces.nsIXULBrowserWindow) ||
    		       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
    		       aIID.equals(Components.interfaces.nsISupports))
    		     return this;
    		   throw Components.results.NS_NOINTERFACE;
    		  },

    		  old_State_reqName: "uninitialized...",
    		  old_Location_uri:  "uninitialized...",
    		  
    		  onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
  		        // If you use myListener for more than one tab/window, use
  		        // aWebProgress.DOMWindow to obtain the tab/window which triggers the state change
    			  
	            // This fires when the load event is initiated
  		        if (aFlag & (window.Ci.nsIWebProgressListener.STATE_START      | 
  		                     window.Ci.nsIWebProgressListener.STATE_IS_DOCUMENT) ) {
  		        	var request_name= "(null)";
  		        	if( aRequest && "name" in aRequest ){
  		        		try {
  		        			request_name= aRequest.name;
  		        		} catch (ex) {
  		        			if( ex.result == Components.results.NS_ERROR_NOT_IMPLEMENTED ){ // do nothing - leave request_name = "(null)"
  	  	  	  		        	HideCaption.myDumpToConsole(" qwww  onStateChange():  [aRequest.name]  known err0r: NS_ERR0R_NOT_IMPLEMENTED");
  		        			}else{	throw ex; }
  		        		}
  		        	}
  		        	if( !window.gMultiProcessBrowser  &&  aWebProgress.DOMWindow === window.content ){ // TODO: implementar aca la escucha de un 'click' en content!
  		        		if(       request_name == this.old_State_reqName ){
  	  	  		        	//HideCaption.myDumpToConsole(" qwww  onStateChange():  **FILTERED OUT!**: request_name=["+request_name+"]   same to *OLD!* ");
  		        		}else if( request_name == "about:document-onload-blocker" ){
  	  	  		        	//HideCaption.myDumpToConsole(" qwww  onStateChange():  **FILTERED OUT!**: request_name=["+request_name+"]   known dummy value ");
  		        		}else{
  	  	  		        	HideCaption.TBoxHide.tempActivation("stateChange");

  	  	  		        	//HideCaption.myDumpToConsole(" qwww  onStateChange():     request_name=["+request_name+"]    !!Bingo!! "); // to filter facebook refreshes...
  		        		}
  		        		this.old_State_reqName= request_name;
  		        	}
  		        	//HideCaption.myDumpToConsole(" event: STATE_START & IS_DOC!: "+aWebProgress.DOMWindow.document.title + "   is this?:"+(aWebProgress.DOMWindow === window.content) );
  		        	// STATE_RESTORING
  		        }
  		        // if (aFlag & window.Ci.nsIWebProgressListener.STATE_STOP )

  		        /** ejemplo con el objeto [wplFlag] aqui: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener   
  		        var strflags= "";
	            for (var f in wplFlag) {
	                if (aFlag & wplFlag[f]) {  strflags += " "+f+" ";  }
	            }
	        	HideCaption.myDumpToConsole("> onStateChange(): "+aWebProgress.DOMWindow.document.title + "   is this?:"+(aWebProgress.DOMWindow === window.content) );
	        	HideCaption.myDumpToConsole("  onStateChange flags: "+strflags );
	 			**/
    		  },
    		  
    		  /*
    		  onProgressChange: function(a, b, c, d, e, f) {},
    		  onStatusChange: function(a, b, c, d) {},
    		  onSecurityChange: function(a, b, c) {},
    		  */
    		  
    		  /** no dispara en mis pruebas ?? seguro ahora??
    		  onRefreshAttempted : function( aBrowser, aWebProgress, aRefreshURI, aMillis, aSameURI	){
    			  HideCaption.myDumpToConsole(" qwww  onRefreshAttempted():  is this?:"+(aWebProgress.DOMWindow === window.content) + "  [warn-prueba!]  title= "+aWebProgress.DOMWindow.document.title );
    			  
    			  return true;
    		  },
    		  **/
    		  
    		  onLinkIconAvailable: function( iconUrl ){
				  //HideCaption.myDumpToConsole("  .. onLinkIconAvailable():  iconUrl:"+iconUrl+" ");
				  // browser  [type="content-primary"]
				  HideCaption.Set_favIcon( iconUrl );
    		  },
    		  onLocationChange: function(aProgress, aRequest, aURI, aFlags){
    			  setTimeout( function(){

    				  HideCaption.SetWebTitle("dummy_progress.onLocationChange");
    				  //HideCaption.myDumpToConsole(" event: onLocationChange() -  aURI: "+aURI+"    title: "+xxxx);

    				  setTimeout( function(){ // 2nd opportunity to set it right!
    					  HideCaption.SetWebTitle("dummy_progress.onLocationChange2");
    					  //HideCaption.myDumpToConsole(" event: onLocationChange() -  aURI: "+aURI+"    title: "+xxxx);
    				  }, 300);
    			  }, 10);
    			  
    			  if (aFlags & window.Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT){ //dispara al FINAL. Igual sirve p tboxhide en anchor-clicks en Facebook vd?
    				  
    				  if( this.old_Location_uri != aURI.spec  &&  this.old_State_reqName != aURI.spec ){
        				  HideCaption.myDumpToConsole(" qwww  event: onLocationChange() -  aURI.spec= ["+aURI.spec+"]   !!Bingo!! ");

        				  HideCaption.TBoxHide.tempActivation("locChange_sameDoc");
    					  
    				  }else{ // es igual, no hace nada... (vd?)
        				  HideCaption.myDumpToConsole(" qwww  event: onLocationChange() ***FILTERED OUT!*** (same to old!) - aURI.spec= ["+aURI.spec+"]   ");
    				  }
					  this.old_Location_uri  = aURI.spec;
					  
    			  }else{
    				  //HideCaption.myDumpToConsole("     qwww  event: onLocationChange() ***FILTERED OUT!*** (flags="+aFlags+") - aURI.spec= ["+aURI.spec+"]   ");
    			  }
    			  
    			  // HISTORY popup refresh! -- // NOTE: veo q no debe estar en onStateChange, pq debe ser recien cuando *cambia el url* visible. 
    			  HideCaption.popup_backForwardMenu__refresh();
    		  }
	};
	
	
	this.lwtheme_update_observer= {
		observe: function(subject, topic, data) {
			
			// lwtheme changed!
			HideCaption.conditional_set_winbkg_color( true ); // reset == true
			
			// FloatHelper  -- for FloatBars!!
			HideCaption.FloatHelper.lwt_update_obs.observe(subject, topic, data);
			//xxx.lwt_update_ocurred= true;
		}
	},
	

    this.debugEvent= function(event, strInfo){
		HideCaption.myDumpToConsole("   event: "+event.type+"  event.target.localName="+event.target.localName+"  event.target.id="+event.target.id+"   ("+strInfo+")");
    },
    
    
	// DRAG events!
	this.addEvents_Dragging= function(){

		// There are done by BINDING in Fx4
		// Went back to old drag code: -> "hcp_floating_extrabox" :

		var ctrlW;
							 
		var DragCtrlsTagName = []; //toolbar?
		//"toolbarspring", "toolbarspacer"
		
		var DragCtrls = [
			//"navigator-throbber", //has mousethrought...
			"hcp_floating_extrabox"];
		//"window-controls", "statusbar-display <-old functionality", "hcp-status-panel-title", "hcp-web-title-item1","hcp-web-title-item2", "hc-drag-space <-old!",  
		//"dragscreen-button", "dragscreen-button2", "hcp-title-box", 
		//"stop-button",
		
		var _XULNS= "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var i=0;
        for(i=0; i<DragCtrlsTagName.length; i++) {
            var tagArray = document.getElementsByTagNameNS(_XULNS, DragCtrlsTagName[i]);
            //tagArray   = document.getElementsByTagName( DragCtrlsTagName[i]);
			if(tagArray){
				for(var itag=0; itag<tagArray.length; itag++) {
					ctrlW= tagArray[itag];
					if (ctrlW){
						listener_list.push( new HideCaption.Hc_EventListener( ctrlW, "mousedown" , HideCaption.MouseDown, false).addEventListener() );
						//ctrlW.setAttribute('tooltiptext', "Drag Window!!!!");
					}
				}
			}
		}

        for(i=0; i<DragCtrls.length; i++) {
            ctrlW = document.getElementById(DragCtrls[i]);
            if (ctrlW){
				listener_list.push( new HideCaption.Hc_EventListener( ctrlW, "mousedown" , HideCaption.MouseDown, false).addEventListener() );
				//ctrlW.setAttribute('tooltiptext', "Drag Window!!!!");
			}
        }
		
		HideCaption.myDumpToConsole("   addEvents_Dragging() -> DONE! ");
	},
	

	//CLASS Hc_EventListener !!! -----------------------------------------------------------------------------------------------------
	this.Hc_EventListener= function EventListener( _myElem, _event_type, _callback, _useCapture){
		
		var myElem    = _myElem;
		var event_type= _event_type;
		var callback  = _callback;
		var useCapture= _useCapture;
		
		var added= false;

		if( !myElem ){
			throw new Error("myElem is null/undef");
		}
		
		this.addEventListener   = function(){
			if(added){return;}
			myElem.addEventListener   (event_type, callback, useCapture);
			added= true;
			//HideCaption.myDumpToConsole("       Hc_EventListener.addEventListener   ()  event_type="+event_type+"  - myElem.id="+myElem.id); // DUMP_EVENT
			return this;
		};
		this.removeEventListener= function(){
			if(!added){return;}
			myElem.removeEventListener(event_type, callback, useCapture);
			added= false;
			//HideCaption.myDumpToConsole("       Hc_EventListener.removeEventListener()  event_type="+event_type+"  -  "+myElem.tagName+"  #"+myElem.id); // DUMP_EVENT
			return this;
		};
		//Good utility method to add/remove things!!
		this.set_EventListener   = function( bAdd ){
			if( bAdd ){	 this.addEventListener();
			}else{		 this.removeEventListener();
			}
			return this;
		};
		
		//For: ONE_TIME_ONLY events!  ---------------------------------------------
		var thySelf= this;
		
		var original_callback= _callback;

		var oneTime_callback= function( event ){
			//HideCaption.myDumpToConsole("       .... add_Listener_oneTime (), **FIRED!**  event_type="+event_type+"  - myElem.id="+myElem.id); // DUMP_EVENT
		
			thySelf.removeEventListener();
		
			original_callback( event );
		};

		//ONE_TIME_ONLY events!  ----- brand-new method (apr-2014)
		this.add_Listener_oneTime= function (){
			//HideCaption.myDumpToConsole("       Hc_EventListener.add_Listener_oneTime ()  event_type="+event_type+"  - myElem.id="+myElem.id); // DUMP_EVENT
			//if(added){ HideCaption.myDumpToConsole("         .......... event_type="+event_type+"  ALREADY ADDED! "); }
			
			// reassign callback!
			callback= oneTime_callback;
			
			this.addEventListener();
		};
		
	},
	//GLOBAL (same) utility method
	this.set_EventListener= function( bAdd, _myElem, _event_type, _callback, _useCapture){
		if( !_myElem ){
			HideCaption.debugError(" set_EventListener():  _myElem is null/undef   (skipping)");
			//throw new Error("myElem is null/undef");
			return; // RETURN !!
		}
		if( bAdd ){		_myElem.addEventListener   (_event_type, _callback, _useCapture);
		}else{			_myElem.removeEventListener(_event_type, _callback, _useCapture);
		}
	},

	
	//CLASS Hc_SpecialEvent !!! -----------------------------------------------------------------------------------------------------
	this.Hc_SpecialEvent= function SpecialEvent( _aCallback, _ParentID ){

		//  sure?  --- don't call any method at 'construct time' here.
		
		var isEnabled= false;
		var isActive = false;
		var originalCallback = _aCallback;
		var theSpecialEvent  = this;

		var orig_y= -500;
		
		// CLASS Hc_SpecialState
		var Hc_SpecialState= function SpecialState( forActivation ){

			var aEvents        = new Array();  // of Hc_EventListener 's
			var thySelf        = this;
			
			var thisState_Callback= function( event ){

				//HideCaption.myDumpToConsole("       thisState_Callback():  '"+_ParentID+"':  ["+forActivation+"]    event.type: "+event.type+"  -->  "+event.target.id);  // DUMP_EVENT

				//moveDownOnly ------
				if( theSpecialEvent.moveDownOnly  &&  !forActivation ){
					if( window.MousePosTracker ){
						var yy= orig_y - window.MousePosTracker._y;
						
						if( yy > 0 ){
							orig_y= window.MousePosTracker._y;
						}
						//HideCaption.myDumpToConsole("       thisState_Callback():  orig_y= "+orig_y+" ");
						if( yy > -30 ){ 
							//HCPlusLib.get_bannedBut_audio().play();
							return;
						}
					}else{ // NO  window.MousePosTracker !
						HideCaption.debugError(" ignoring error: NO window.MousePosTracker !! ");
					}
				}
				
				
				thySelf.setState_effective();  // calls removeEventListeners() ----  logic like 'add-listener-oneTimeOnly()' :-) 
				theSpecialEvent.setActive( forActivation, true ); // internalCall
				
				/***  STILL DISABLED !!
				// BLOCKING or RETAINING  with ctrl , scroll-lock  + mouseover !!
				if( event ){
					var suffix= forActivation? "Block": "Retain";
					var dynKey= "";
					dynKey= _ParentID+"_ctrl"+suffix;
					if( HCPlusLib.HcSingleton.DynElemSettings[dynKey] && event.ctrlKey ){
						HideCaption.myDumpToConsole("       "+dynKey+" ...ing !!!   -  (Flag in effect!!)");
						
						thySelf.removeEventListeners();
						return;  // RETURN !
					}
					dynKey= _ParentID+"_scrollLock"+suffix;
					if( HCPlusLib.HcSingleton.DynElemSettings[dynKey] && event.getModifierState && event.getModifierState("ScrollLock") ){
						HideCaption.myDumpToConsole("       "+dynKey+" ...ing !!!   -  (Flag in effect!!)");
						
						thySelf.removeEventListeners();
						return;  // RETURN !
					}
					dynKey= _ParentID+"_numLock"+suffix;
					if( HCPlusLib.HcSingleton.DynElemSettings[dynKey] && event.getModifierState && event.getModifierState("NumLock") ){
						HideCaption.myDumpToConsole("       "+dynKey+" ...ing !!!   -  (Flag in effect!!)");
						
						thySelf.removeEventListeners();
						return;  // RETURN !
					}
					dynKey= _ParentID+"_capsLock"+suffix;
					if( HCPlusLib.HcSingleton.DynElemSettings[dynKey] && event.getModifierState && event.getModifierState("CapsLock") ){
						HideCaption.myDumpToConsole("       "+dynKey+" ...ing !!!   -  (Flag in effect!!)");
						
						thySelf.removeEventListeners();
						return;  // RETURN !
					}
				}
				***/

				originalCallback( event, theSpecialEvent );
			};
			
			var removeTimeout= null;
			var clear_removeTimeout= function(){
				if (removeTimeout) {
					clearTimeout(removeTimeout);
					removeTimeout = null;
				}
			};

			// Hc_SpecialState: 'this' section ----------------------- 
			
			this.oppositeState  = null;

			// need to be called ONLY for 'effective' state!
			this.setState_effective= function(){

				//moveDownOnly ------
				if( theSpecialEvent.moveDownOnly ){
					if( forActivation ){
						if( window.MousePosTracker ){
							orig_y= window.MousePosTracker._y;
						}
					}else{ // ! forActivation
						//window.Services.appShell.hiddenDOMWindow.console.trace();
						theSpecialEvent.moveDownOnly= false; // No hacer esto en el callback pq se puede llamar directo a setActive(false)
					}
				}

				clear_removeTimeout();
				removeTimeout = setTimeout(function () {
					removeTimeout = null;

					thySelf.removeEventListeners();
				}, 100);

				this.oppositeState.addEventListeners();
				
				
				// cleanup at end ...
				if(!forActivation ){
					theSpecialEvent.forDeactivationOnly= false; 
					//TODO: esto deberia llevarlo a otro lado para q se resetee recien DESPUES de llamar al handler! (en una nueva funcion "after_event()" y listo vd?)
				}
			};

			this.removeEventListeners= function(){
			    aEvents.forEach(function(mItem) {	mItem.removeEventListener();	});
			};
			this.addEventListeners   = function(){
				clear_removeTimeout();
				if( ! isEnabled ){ // check if NOT enabled  
					HideCaption.myDumpToConsole("       Hc_SpecialState.addEventListeners():   NOT enabled!, returning!  (error?)   forActivation="+forActivation);
					return; 
				}
			    aEvents.forEach(function(mItem) {	mItem.addEventListener();		});
			};
			
			this.init= function( aElems, aEventTypes){
				// PUEDE SER LLAMADO VARIAS VECES al cambiar alguna config de hotspots incluidos!
				aEvents = new Array();
				aElems.forEach(function(mItem) {
					aEventTypes.forEach(function(eventType) {
						aEvents.push(     new HideCaption.Hc_EventListener( mItem, eventType, thisState_Callback, false));
					});
					if( mItem.hc_events ){
						mItem.hc_events.forEach(function(eventType) {
							HideCaption.myDumpToConsole("   .. adding extra_event: "+eventType);
							aEvents.push( new HideCaption.Hc_EventListener( mItem, eventType, thisState_Callback, false));
						});
					}
			    });
			};
		}; 
		// END Hc_SpecialState


		// BEGIN 'this' section. ---------------------------------------------------------
		
		this.moveDownOnly= false;
		this.forDeactivationOnly= false;

		this.for_state_active  = new Hc_SpecialState(true );
		this.for_state_Inactive= new Hc_SpecialState(false);
		
		this.for_state_active  .oppositeState= this.for_state_Inactive;
		this.for_state_Inactive.oppositeState= this.for_state_active;
		
		this.setActive= function( bSet, bInternalCall ){
			isActive= bSet;
			
			if( ! bInternalCall ){
				if( isActive ){ this.for_state_active  .setState_effective(); }
				else          { this.for_state_Inactive.setState_effective(); }
			}
			
			//HideCaption.myDumpToConsole("       Hc_SpecialEvent.setActive("+isActive+")"); // DUMP_EVENT 
		};
		this.isActive = function(){
			return isActive;
		};
		
		this.setEnabled= function( _bEnabled ){
			isEnabled= _bEnabled;
			
			if( isEnabled ){
				this.setActive( false );
				
			}else{ // DISABLE all !!
				this.for_state_active  .removeEventListeners();
				this.for_state_Inactive.removeEventListeners();
			}
		};
		
		this.do_activate= function(  _bActivated ){
        	this.setActive(_bActivated);
        	
			originalCallback( {}, this ); // dummy event
		};
	},
	//END Hc_SpecialEvent

	
	// HomeToolbarHandler   goes to  HomeToolbarHandler.js 

	// TopRightBar_Handler  goes to  TopRightBar_Handler.js 
	

	this.setAttr_smart= function(elemId, attrName, value, bForced){
		HCPlusLib.setAttr_smart(elemId, attrName, value, bForced);
	};
    
    
	const labelArray= [
	                 'hcp-title-box-label', // in custom caption
	                 //'hcp-web-title-label-stbar',
	                 //'hcp-web-title-label-fx4',
	                 'hcp-web-title-label-fm', //float menu
	                 'hcp-web-title-label1',
	                 'hcp-web-title-label2',
	                 'hcp-web-title-label3'  //default for floating toolbars!
	                 ];
	var array_titles= new Array();
    function calc_array_titles(){
    	array_titles= new Array();
    	for(var ix= 0; ix<labelArray.length; ix++){
    		var elem= document.getElementById( labelArray[ix] );
    		if( elem ){
    			array_titles.push(elem);
    		}
    	}
	};
	

	function set_this_favicon_from_titleElem( elem, favicon_url ){
		const image= elem? elem.previousSibling: null; 
		if( image ){
			image.setAttribute( "src", favicon_url );
		}
	};
	
    this.hWebTitle= "(unknown)";
    
    this.SetWebTitle = function(dummy) {

		var sTitle     = ""+document.title;
		var favicon_url= "";
		
		// gBrowser.mCurrentBrowser  solo lo veo usandose en tabbrowser.xml!
		if( window.gBrowser.selectedBrowser ){
			
			// 2017-set: Esto pq tabmixplus tenia un bug que NO actualizaba  document.title (q se usaba aca)!!!
			if( sTitle.trimLeft().startsWith("about:blank") ){
				// NO incluye el 'bookmark name' de TMP ni el " - Mozilla Firefox"  pero bueh !!
				sTitle= ""+window.gBrowser.selectedBrowser.contentTitle;
			}
			
			// gBrowser.selectedTab.image  o   gBrowser.getIcon() // <- usados en viejas pruebas.
			favicon_url= window.gBrowser.selectedBrowser.mIconURL;
		}
		
		if( sTitle.length > 400 ){
			sTitle= sTitle.substring(0, 400) + "...";
		}

    	if( HideCaption.hWebTitle == sTitle ){
    		return;
    	}
    	HideCaption.hWebTitle= sTitle;

    	calc_array_titles();
    	
    	array_titles.forEach(function(elem){
    		// FAVICON !!
    		set_this_favicon_from_titleElem( elem, favicon_url );
    		
    		HCPlusLib.setAttr_smart_elem( elem, 'value'      , sTitle, true);
    		HCPlusLib.setAttr_smart_elem( elem, 'tooltiptext', sTitle, true);
    	});
    };
    this.Set_favIcon = function( iconUrl ) {
    	array_titles.forEach(function(elem){
    		set_this_favicon_from_titleElem( elem, iconUrl );
    	});
    };

    
	this.onClose_called= false,
    this.OnClose = function() {
		if( HideCaption.onClose_called ){
			return;
		}
		HideCaption.onClose_called= true;
		
		HideCaption.myDumpToConsole("   OnClose(): finishing !... ");

		// Notify this WINDOW is CLOSING!
		HCPlusLib.HcSingleton.windowIsClosing(window); 
		
		
		// PERSIST ATTRIBUTES ! -- BEFORE even Floatbars.hc_shutdown(); -- BUT check what to do bc this is called for ANY WINDOW closed!
		if( !bAttrs_persisted ){
			HCPlusLib.HcSingleton.attrs_persistAll( document );
		}
		bAttrs_persisted= true;
		
		
		HCPlusLib.onShutDown_lib();
		

		// hc_shutdown() part -----------------
		
		unloaders.reverse().forEach(function (f) { // reverse() so unload FIRST the LAST thing added, and so on 
    		try {
    			HCPlusLib.myDumpToConsole_noAudio( "HC_OnClose>>>>  \n"+f );
    			f();
    		} catch (ex) {
    			HCPlusLib.debugError(" hc_OnClose():  ex= "+ex, ex);
    		};
    	});

		
		
		HCPlusLib.myDumpToConsole_noAudio( "HC END onClose()" );
    },
	

 
	// ------------------------------------------------------------------
	// ---------- calc-space-for-buttons --------------------------------
 

	this.alreadyScheduledCalcSpace= false,
    this.Delayed_calcSpaceForMinMaxCloseButtons_Plus= function(_milliSecs) {
		if( HCPlusLib.HcSingleton.Bstrap.is_shutdown ){
			return;
		}

		if( ! HideCaption.alreadyScheduledCalcSpace ){
			// 1st call WITHOUT DELAYED for performance sake in full autohide bars!
			HideCaption.calcSpaceForMinMaxCloseButtons();
		}
		HideCaption.Delayed_calcSpaceForMinMaxCloseButtons(_milliSecs);
    },
    this.Delayed_calcSpaceForMinMaxCloseButtons= function(_milliSecs) {
		if( HCPlusLib.HcSingleton.Bstrap.is_shutdown ){
			return;
		}

		//HideCaption.myDumpToConsole(" BEGIN:  _milliSecs= "+_milliSecs); 

		if( ! HideCaption.alreadyScheduledCalcSpace ){
			HideCaption.alreadyScheduledCalcSpace= true;

			if( !_milliSecs ){ 
				_milliSecs= 20; 
				//HideCaption.myDumpToConsole(" ... _milliSecs set to "+_milliSecs); 
			}
			// using DELAYED here for 1) SOLVED FF3.7's tabsontop!!! 2) make sure it sees final state in full autohide bars.
			setTimeout( function(){
					HideCaption.alreadyScheduledCalcSpace= false;
					HideCaption.calcSpaceForMinMaxCloseButtons(); 
				}, _milliSecs);
		}else{ // skipping: alreadyScheduled!
			//HideCaption.myDumpToConsole    (          "  SKIPPING ...   alreadyScheduledCalcSpace == true");
		}
	},
	// FORCED (no internal boolean flag), executes always
    this.Delayed_FORCED_calcSpaceForMinMaxCloseButtons= function(_milliSecs) {
		if( HCPlusLib.HcSingleton.Bstrap.is_shutdown ){
			return;
		}

		if( !_milliSecs ){ 
			_milliSecs= 20; 
		}
		setTimeout( function(){
			HideCaption.calcSpaceForMinMaxCloseButtons(); 
		}, _milliSecs);
	},
	
	
	
	//new object for storing lastStates...
	this.lastAlteredObject= null,


	this.my_getComputedStyle= function(theToolbar, param2){
		var computedStyle = null;
		try{
			computedStyle= getComputedStyle(theToolbar, param2);
	    }catch(ex){ this.myDumpToConsole("my_getComputedStyle():  ignored exception: "+ex); }
		return computedStyle;
	},
	
	this.my_getAttribute= function(element, attrname){
		return (element && element.getAttribute)? element.getAttribute(attrname): null;
	},
	
	this.setPropertySmart= function(objToAlter, propertyCss, value, priority){
		//jToAlter.style.paddingRight= value;
		if(  (!priority || (""+priority).length==0 ) &&
			 (value     && (""+value   ).length> 0  )
		  ){ //if there is some value BUT without priority, clean ALL first!
			objToAlter.style.setProperty( propertyCss, "", "");
			//HideCaption.myDumpToConsole    (   "  PREVIOUS SPECIAL INMEDIATE ALTER!     do_alter("+this.debugInfoElement(objToAlter)+"): "+""+ " "+"");
		}
		objToAlter.style.setProperty( propertyCss, value, priority);
	},

	this.findChild_withAttributes= function( aElem, attrsObj ){
		if( !aElem ){
			return null;
		}
		try {
			for( var thisChild= aElem.firstChild;  thisChild;  thisChild = thisChild.nextSibling ){
				var b_haveAllProps= true;
				for(var prop in attrsObj){
					if( thisChild.getAttribute(""+prop) != attrsObj[prop] ){
						b_haveAllProps= false;
						break;
					}
				}
				if( b_haveAllProps ){
					
					HideCaption.myDumpToConsole(   "       findChild_withAttributes( ,"+attrsObj+"): found child!");
					return thisChild;
				}
			}
		} catch (ex) {	HCPlusLib.debugError(" error: ", ex); }
		
		return null;
	},
	
	this.getWidth= function(elem){
		var theWidth= elem && elem.boxObject? elem.boxObject.width: 0;
		//HideCaption.myDumpToConsole(   "       getWidth("+HideCaption.debugInfoElement(elem)+") -> "+theWidth);
		return theWidth;
	},
	
	
	// load "titlebar-placeholder" elements!! ------------------------------------------------------
	this.get_hctp_holder= function(aElem){
		if(!aElem.hctp_holder ){
			aElem.hctp_holder= {
				// origSettings: new HideCaption.PadSettings() //only for eclipse validation 
			};
			arrElem_hcHolders.push(window.Cu.getWeakReference(aElem));
		}
		return aElem.hctp_holder;
	},
	this.load_holders= function(aElem){
		HideCaption.get_hctp_holder(aElem);
		if(!aElem.hctp_holder.placeHolders_loaded ){
			aElem.hctp_holder.placeHolders_loaded= true;
			HideCaption.myDumpToConsole(   "       load_holders(), WILL LOAD!  (in "+aElem.id+")");
			var appmenu_but_placeholder= this.findChild_withAttributes( aElem, {class:"titlebar-placeholder", type:"appmenu-button"} );
			aElem.hctp_holder.appButton = appmenu_but_placeholder;
			var mmc_buttons_placeholder= this.findChild_withAttributes( aElem, {class:"titlebar-placeholder", type:"caption-buttons"} );
			aElem.hctp_holder.mmcButtons= mmc_buttons_placeholder;
		}
		//HideCaption.myDumpToConsole(   "       load_holders(), SKIPPING ");
	},
	this.get_placeHolder_AppButton= function(aElem){
		if( !aElem || (aElem.id != "TabsToolbar" && aElem.id != "toolbar-menubar") ){
			return null;
		}
		this.load_holders(aElem);
		return aElem.hctp_holder.appButton;
	},
	this.get_placeHolder_MmcButtons= function(aElem){
		if( !aElem || (aElem.id != "TabsToolbar" && aElem.id != "toolbar-menubar") ){
			return null;
		}
		this.load_holders(aElem);
		return aElem.hctp_holder.mmcButtons;
	},
	
	this.do_alter= function(objToAlter, theSettings){
		if( !objToAlter ){
			return;
		}
		HideCaption.myDumpToConsole(   "       do_alter("+this.debugInfoElement(objToAlter)+"): "+theSettings);

		// theSettings == null  now means that we are RESTORING original values!

		/** @type dummy_hctpObj */
		var hctp_holder= HideCaption.get_hctp_holder(objToAlter);

		if( !theSettings ){
			// We are RESTORING original values!
			if( hctp_holder.origSettings ){
				this.do_alter_really(objToAlter, hctp_holder.origSettings);
				objToAlter.removeAttribute("hctp_space_lastAlteredObject");
				
				hctp_holder.origSettings= null;
			}
		}else{ // theSettings exists!
			// We are setting NEW VALUES !, (& SAVING original ones)
			if(!hctp_holder.origSettings && objToAlter.style ){
				hctp_holder.origSettings= new HideCaption.PadSettings();

				hctp_holder.origSettings.paddingRight = objToAlter.style.getPropertyValue   ("padding-right");
				hctp_holder.origSettings.priorityRight= objToAlter.style.getPropertyPriority("padding-right");
				hctp_holder.origSettings.paddingLeft  = objToAlter.style.getPropertyValue   ("padding-left");
				hctp_holder.origSettings.priorityLeft = objToAlter.style.getPropertyPriority("padding-left");
				//HideCaption.myDumpToConsole    (   "  new SAVED altered:  "+this.debugInfoElement(theToolbar)+": "+this.lastSettings+ " ");
			}
			hctp_holder.padSettings= theSettings;
			this.do_alter_really(objToAlter, theSettings);
			objToAlter.setAttribute("hctp_space_lastAlteredObject", "true");
		}
	},
	this.do_alter_really= function(objToAlter, theSettings){
		this.setPropertySmart(objToAlter, "padding-right", theSettings.paddingRight, theSettings.priorityRight);
		this.setPropertySmart(objToAlter, "padding-left" , theSettings.paddingLeft , theSettings.priorityLeft );
	},

	this.debugInfoElement= function(elem){
		if( HCPlusLib.bPrintDebug ){
			return !elem? "<null>" : "<"+elem.tagName+"  id="+this.my_getAttribute(elem,"id")+", class="+this.my_getAttribute(elem,"class")+">";
		}
		return ""+elem;
	},

	//CLASS
	this.PadSettings= function PadSettings() {
		this.paddingRight = "";
		this.priorityRight= "";
		this.paddingLeft  = "";
		this.priorityLeft = "";
		
		this.myclone= function(){
			var padSettings= new PadSettings();
			padSettings.paddingRight = this.paddingRight;
			padSettings.priorityRight= this.priorityRight;
			padSettings.paddingLeft  = this.paddingLeft;
			padSettings.priorityLeft = this.priorityLeft;
			return padSettings;
		};
		this.toString= function(){
			return "{ p-left:"+this.paddingLeft+";  p-right:"+this.paddingRight+" }";
		};
	},

	//newSettings: new PadSettings(), //prevComparedSettings: {}, lastSettings: {}, //new this.PadSettings()
	
	// with restore this.lastAlteredObject !
	this.alter_this_toolbar_2= function(theToolbar, newSettings){
		//
		if( this.my_getAttribute(theToolbar, "id")=="fullscr-toggler" ){ // FULLSCREEN mini-bar!

			return; // RETURN !!
		}
		
		var theSettings= newSettings.myclone();
		
		//checking of element: <hbox class="titlebar-placeholder" type="appmenu-button" ...>  
		//checking of element: <hbox class="titlebar-placeholder" type="caption-buttons" ...>
		if( HideCaption.fx4_titlebar_enabled ){
			var appmenu_but_placeholder= this.get_placeHolder_AppButton( theToolbar );
			if( HideCaption.getWidth(appmenu_but_placeholder) > 0 ){
				//this.setPropertySmart(appmenu_but_placeholder, "outline" , "3px solid yellow"	, "important");
				theSettings.paddingLeft= "";
			}
			var mmc_buttons_placeholder= this.get_placeHolder_MmcButtons( theToolbar );
			if( HideCaption.getWidth(mmc_buttons_placeholder) > 0 ){
				//this.setPropertySmart(mmc_buttons_placeholder, "outline" , "3px solid yellow"	, "important");
				theSettings.paddingRight= "";
			}
		}
		
		if( this.lastAlteredObject ){
			var lastAlteredObj_hctp_holder= HideCaption.get_hctp_holder(this.lastAlteredObject);

			if( lastAlteredObj_hctp_holder.padSettings && 
				theToolbar               == this.lastAlteredObject && 
				theSettings.paddingLeft  == lastAlteredObj_hctp_holder.padSettings.paddingLeft   &&  //prevComparedSettings
				theSettings.paddingRight == lastAlteredObj_hctp_holder.padSettings.paddingRight      //prevComparedSettings
			){
				//I see too much concurrency calls to calcSpace...() !!
				//HideCaption.myDumpToConsole(   "   alter_this_toolbar SKIPPING!!! (same object + width!) ("+this.debugInfoElement(theToolbar)+")" );

				return; // RETURN !!
			}
		}
		
		if( theToolbar && !theToolbar.style ){ //autohide menu-bar ff3.6
			HideCaption.myDumpToConsole(   "   alter_this_toolbar, (no style obj!, error?) setting target to NULL!!!!  .. It was ("+this.debugInfoElement(theToolbar)+")" );
			
			theToolbar= null; // set to NULL !!!!
		}
		var previous_lastAlteredObject= this.lastAlteredObject;
		
		this.lastAlteredObject= theToolbar;
		//HideCaption.myDumpToConsole(   "      ... new this.lastAlteredObject:  "+this.debugInfoElement(this.lastAlteredObject)+" " );

		if( theToolbar || previous_lastAlteredObject ){
		
		HideCaption.myDumpToConsole(   "   alter_this_toolbar BEGIN! ("+this.debugInfoElement(theToolbar)+")" );
			if( theToolbar === previous_lastAlteredObject){
				//HideCaption.myDumpToConsole(   "       previous_lastAlteredObject  is the SAME as new obj!  (err?)" );
			}else{
				this.do_alter(previous_lastAlteredObject, null); //null -> restore previous object!
			}

			this.do_alter(theToolbar                , theSettings);
		}
	},
	
	this.get_ComputedStyle_CssValue_Float = function( _elem, _cssProperty) {
		try{
			var _style= this.my_getComputedStyle(_elem, null);
 			var sValue= _style.getPropertyValue(_cssProperty);
			var numVal= parseFloat(sValue.split("px")[0]);
			return window.isNaN(numVal)? 0: numVal;
		}catch(ex){ this.debugError("get_ComputedStyle_CssValue_Float("+_elem+", "+_cssProperty+") ignored ex: "+ex, ex); }
		return 0;
	},
   
	this.getCssIntValue = function( _style, _cssProperty) {
		try{
			if( !_style ){
				HideCaption.myDumpToConsole(   "getCssIntValue("+_style+", "+_cssProperty+") IGNORING  error:  style is null! " );
				return 0;
			}
 			var sValue= _style.getPropertyValue(_cssProperty);
			var numVal= parseInt(sValue.split("px")); // split() leaves a string with a trailing comma that is forgiven by parseInt() ...
			return window.isNaN(numVal)? 0: numVal;
		}catch(ex){ this.debugError("getCssIntValue("+_style+", "+_cssProperty+") ignored ex: "+ex, ex); }
		return 0;
	},
   
	this.MmcTopButtons_size= {}, //DONT execute ANYTHING before onload() !! -- new HCPlusLib.Hcp_Point(),

	//set 2017: helps to reveal a GREAT BUG for a LEFT secondary monitor !!!!! (was bad calc of *DISABLED* fx but!)
	this.MAX_CALC_WIDTH= 1000,
	
	this.calcSpaceForMinMaxCloseButtons = function() {
		//do_it !!
		this.do_calcSpaceForMinMaxCloseButtons();
		//if( Tabsontop ) ...
	},
   
	this.do_calcSpaceForMinMaxCloseButtons = function() {

	  function  check_and_alter_this(theToolbar){
		  try {
		  	var thySelf= HideCaption; // 'this' DIDN'T work   (bc this function gets called out-of-scope?) 
		  
			//HideCaption.myDumpToConsole("     for loop: toolbar= "+thySelf.debugInfoElement(theToolbar) ); 
			//var theToolbar= toolboxChilds[ix];
			if( !theToolbar || theToolbar.localName != "toolbar" ){
				//continue;
				return false;
			}

			//HideCaption.myDumpToConsole("  exec. on existing obj:   check_and_alter_this("+thySelf.debugInfoElement(theToolbar)+")" ); 

			//if( !theToolbar.boxObject ){
			//	HideCaption.myDumpToConsole(   "   NO boxObject for current toolbar: ("+thySelf.debugInfoElement(theToolbar)+")" );
			//}
			
			var hidden= 
				theToolbar.boxObject && 
				( theToolbar.boxObject.height <= 2 ||
				  theToolbar.boxObject.y > topGAP // position: fixed (tree style tabs) DOESN'T break visible chain anymore in Fx4!
				);
				//TODO: ??watch also for future position [8-1] for fx4+ and chromemargin="1,..."??
			
			if( !hidden ){
				//if hidden: likely won't arrive here after boxObject's check!!!
				var computedStyle= thySelf.my_getComputedStyle(theToolbar,"");
				hidden= 
				thySelf.my_getAttribute(theToolbar, "collapsed")    == "true" ||
				thySelf.my_getAttribute(theToolbar, "moz-collapsed")== "true" || // in fullscr!
				computedStyle && computedStyle.display && computedStyle.display=="none"
																		   ||
				thySelf.my_getAttribute(theToolbar, "autohide" ) == "true" &&
				thySelf.my_getAttribute(theToolbar, "inactive" ) == "true" &&	 
				theToolbar.boxObject.height < 7                   //autohide menubar including bug
				;
			}
			//HideCaption.myDumpToConsole(   "   for: current toolbar: ("+thySelf.debugInfoElement(theToolbar)+")" );
			
			if( hidden ){
				//continue;
				//HideCaption.myDumpToConsole("calcSpaceForMinMaxCloseButtons(): "+theToolbar.getAttribute("id")+"  is hidden.");
			}else{ // !hidden
				if( !found  //a little inefficient code here yet ... && thySelf.lastAlteredObject != theToolbar
				  ){
					//HideCaption.myDumpToConsole(   "   will alter this toolbar: ("+thySelf.debugInfoElement(theToolbar)+")     'hidden'="+hidden );
					thySelf.alter_this_toolbar_2(theToolbar, newSettings);
					found= true; //TODO: sacar esta var de aca dps... (asi esta funcion sera un utilitario mas global)
					return true;
				};
			}
			return false;  // me aviso console2 q faltaba un return <value>

		  }catch(ex){ HideCaption.debugError("calcSpaceForMinMaxCloseButtons() error: "+ex, ex); };
	  } // END  check_and_alter_this(theToolbar)
	  
	  

	  try{
		  
		//FLOATING TOOLBARS
		try {
			HideCaption.FloatToolbarsHandler.setFloatPosition( true );
		} catch (ex) {
			HideCaption.debugError(" ERROR      "+ex, ex);
		}

		  
		//this.loadTabBarForPadding();
			
		//check fx4_titlebar_enabled !!
		//checking of element: <hbox class="titlebar-placeholder" type="caption-buttons" ...> will be done in alter_this_toolbar() 
		var hcRightbarFixed_elem= HideCaption.sysbuttons_active ? //ago 2012: *updated* new flag from Fx12alpha+ bug 
			//move HideCaption.fx4_titlebar_enabled flag to calc_sysbuttons...()!
					document.getElementById("titlebar-buttonbox-container"): //buttons-of-fx4-titlebar !!
					document.getElementById("hcp-rightbar-fixed");
		var rBar_width=	50;
		try {
			//I saw this Warning: ...boxObject.width undefined ! -- when activating TABS ON TOP !!!
			rBar_width=	hcRightbarFixed_elem? 
						(hcRightbarFixed_elem.boxObject? (("width" in hcRightbarFixed_elem.boxObject)? 
																(typeof(hcRightbarFixed_elem.boxObject.width)=="number"?
																		hcRightbarFixed_elem.boxObject.width: 46): 49): 47):
						1;
		} catch (ex) {
			HideCaption.debugError(" ERROR in (hcRightbarFixed_elem) - width="+rBar_width, ex);
		}
		//HideCaption.myDumpToConsole(" (hcRightbarFixed_elem) - width="+rBar_width);
		
		var newWidthRight= 
			(rBar_width) + 
			(this.WinState>0? 0:4);  //check if window is MaxFull !!

		var newWidthLeft = this.HomeToolbarHandler.homeRightPos_rel( window.gNavToolbox );
		//check fx4_titlebar_enabled !!
		//checking of element: <hbox class="titlebar-placeholder" type="appmenu-button" ...> will be done in alter_this_toolbar() 
		if( HideCaption.adv_sysbut_winappear == "" && newWidthLeft < 2 || HideCaption.fx4_titlebar_enabled ){
			try { //this try{} is bc I got afraid of the warning mentioned above (about 'boxObject.width undefined')  
				var appmenuButtonContainer= document.getElementById("appmenu-button-container");
				newWidthLeft= appmenuButtonContainer && appmenuButtonContainer.boxObject? appmenuButtonContainer.boxObject.x + appmenuButtonContainer.boxObject.width : 0;
			} catch (ex) {
				HideCaption.debugError(" ERROR in (newWidthLeft) - width="+newWidthLeft, ex);
			}
			//Mas arriba se calcula 'newWidthRight' en base a "titlebar-buttonbox-container" si corresponde...
		}
		
		if( newWidthLeft  > HideCaption.MAX_CALC_WIDTH ){
			newWidthLeft  = HideCaption.MAX_CALC_WIDTH;
		}
		if( newWidthRight > HideCaption.MAX_CALC_WIDTH ){
			newWidthRight = HideCaption.MAX_CALC_WIDTH;
		}
		
		var newSettings= new HideCaption.PadSettings();
		newSettings.paddingRight = newWidthRight>0?(newWidthRight+"px"):"";
		newSettings.priorityRight= "important";
		newSettings.paddingLeft  = newWidthLeft >0?(newWidthLeft +"px"):"";
		newSettings.priorityLeft = "important";

		// 2017 oct: NEW css variables!, 1st used in TBoxHide!
		HideCaption.mainW.style.setProperty("--hctp_barspace_left" , newWidthLeft +"px", "important");
		HideCaption.mainW.style.setProperty("--hctp_barspace_right", newWidthRight+"px", "important");

		if( HideCaption.TBoxHide.bTbox_float ){
			HideCaption.myDumpToConsole("    ... returning due to [bTbox_float] " );
			return;
		}

		
		// xx offsetTop_now= window.windowState == window.STATE_MAXIMIZED? HideCaption.(viejo_topMax_calc): 0;
		const offsetTop_now= HideCaption.hcp_root_box.boxObject.y; // sirve TAMBIEN para vert-max! 
		var   topGAP       = this.MmcTopButtons_size.getY() - 2  + offsetTop_now ;  // new var that should REPLACE old ones in next versions....
		//HideCaption.myDumpToConsole(   "  calcSpace...():  topGAP = "+topGAP );
		
		//new check for PERFORMANCE!
		if( this.lastAlteredObject && this.lastAlteredObject.boxObject && 
			this.lastAlteredObject.boxObject.y < topGAP &&
			this.lastAlteredObject.boxObject.height > 3 ){
			//HideCaption.myDumpToConsole(   "  calcSpaceForButtons...(): same object at top! " );
			//volver a setear si cambio el tamanho del appbutton por ej!
			this.alter_this_toolbar_2(this.lastAlteredObject, newSettings); // incluye deteccion de settings no-modificados
			return; // RETURN !!
		}
		
		
		//check if should apply to cc!!
		var hcpCustomCaption_elem= document.getElementById("hcp-caption-box");
		//HideCaption.myDumpToConsole(   "   hcpCustomCaption_elem.boxObject.height: "+hcpCustomCaption_elem.boxObject.height+"" );
		if( hcpCustomCaption_elem ){
			if( hcpCustomCaption_elem.boxObject && 
				hcpCustomCaption_elem.boxObject.height >= 8 && 
				hcpCustomCaption_elem.boxObject.y + this.mainW.boxObject.y <= topGAP - 5 ){ //2
					this.alter_this_toolbar_2(hcpCustomCaption_elem, newSettings);
					return; // RETURN !! //TODO:  NOT YET !!! <-- lets continue if toolbox's margin-top is like "-20" or so ?
			}
		}

		
		var found= false;
		
		// ---------------------------------------------------------------------------------------------------------------------------------
		
		var thySelf= this;
		
		//function  check_and_alter_this()  was here before "use strict"

		
		//check print_preview !!!
		var t_print_preview  = document.getElementById("print-preview-toolbar");
		//HideCaption.myDumpToConsole("  print-preview-toolbar=  "+thySelf.debugInfoElement(t_print_preview)+"" ); 
		if( !found && check_and_alter_this(t_print_preview) ){
			 found= true;
			 //break;
		}
		
		
		//here only for hcp_hiddencaption == TRUE !!
		
        var toolbox  = document.getElementById("navigator-toolbox");
		
		//detect SPACE for foreign tabs-on-top ...: i.e Cfx Extreme CARBON, StrataBuddy
		if( !found ){
			if( (this.mainW.boxObject.y + toolbox.boxObject.y) > topGAP ){ //'REAL' y-pos of toolbox!!  .... do this for performance (dont do a getComputedStyle() )!!!
				this.alter_this_toolbar_2( null, newSettings); // with restore this.lastAlteredObject !
				//HideCaption.myDumpToConsole("calcSpaceForMinMaxCloseButtons(): found space! ");
				found= true;
				
			}else{ // space not found yet...
			  try{
				//eclipse 9 validation comment: a WRONG warning is issued here (about 'tBox_style' not used!)
				var tBox_style= getComputedStyle(toolbox, "");
				var arrSpaces= 	[
				               	 // ... boxObject.y
				               	 //is.getCssIntValue(main_style   , "padding-top" ), //stratabuddy
				               	 //is.getCssIntValue(main_style   , "margin-top"  ),
				               	 this.getCssIntValue(tBox_style   , "padding-top" ),
				               	 //is.getCssIntValue(tBox_style   , "margin-top"  ) // cfx carbon
				               	 ];

				//HideCaption.myDumpToConsole("     arrSpaces= "+arrSpaces+"      topGAP="+topGAP);
				//HideCaption.myDumpToConsole("   about to cont...");

				for(var iSpace in arrSpaces){
						if( arrSpaces[iSpace] > topGAP ){
						this.alter_this_toolbar_2( null, newSettings); // with restore this.lastAlteredObject !
							HideCaption.myDumpToConsole("calcSpaceForMinMaxCloseButtons(): found space!,    (arrSpaces="+arrSpaces+")");
						found= true;
							break;
						//return;
					}
				}
			  }catch(ex){ this.debugError("calcSpaceForMinMaxCloseButtons() ignored ex: "+ex, ex); }
			}
		}

		if( !found && toolbox.boxObject.height >= 5 ){ // in case of using Floating-tbars with ALL tbars.
			//HideCaption.myDumpToConsole("   about to BEGIN  for loop ... ");
			for (var theToolbar= toolbox.boxObject.firstChild;  theToolbar;  theToolbar = (theToolbar.boxObject? theToolbar.boxObject.nextSibling: null) )
			{
				if( check_and_alter_this(theToolbar) ){
					found= true;
					break;
				}
			}
		}
		
		//HideCaption.myDumpToConsole(   "   last try: found="+found+"  -  toolbox.h= "+toolbox.boxObject.height+"  " );
		if( !found && toolbox.boxObject.height >= 10 ){ // hubo un mal uso de topGAP aca
			// Here maybe some-toolbar BREAKED the visible chain! (ie. position: fixed; like HideMenubar addon does!)
			var toolboxChilds= toolbox.childNodes;
			for(var ix=0; ix < toolboxChilds.length; ix++){
				var theToolbar= toolboxChilds[ix];
				
				if( check_and_alter_this(theToolbar) ){
					HideCaption.myDumpToConsole(   "   found! - (thru toolbox.childNodes ...)" );
					found= true;
					break;
				}
			}
		}

		//Checking FLOATING_TOOLBARS presence ----------------------------------------------------------------------------
		var hctpToolbox= document.getElementById("hctp-toolbox");
		if( hctpToolbox && hctpToolbox.boxObject.y < topGAP - 3 && hctpToolbox.boxObject.y > topGAP - 25 ){ //checks also if positioned on screen (activated)!
			//TODO:  Improve this, bc 'erases' space in (possible) covered toolbar (bc uses the SAME 'BACKUP' alteredObject!!!!, so IMPLEMENT a SECOND one!), NOT affecting in normal use yet!
			found= false; // float toolbox is OVER the std. one!, so modify THIS!   // TODO: will be BOTH! when I use 2 different objects for calcSpace...()!
			
			for (var theToolbar= hctpToolbox.boxObject.firstChild;  theToolbar;  theToolbar = (theToolbar.boxObject? theToolbar.boxObject.nextSibling: null) )
			{
				if( check_and_alter_this(theToolbar) ){
					found= true;
					break;
				}
			}
			// Maybe visible chain was BROKEN ...
			if( !found && hctpToolbox.boxObject.height >= 10 ){ // hubo un mal uso de topGAP aca
				var toolboxChilds= hctpToolbox.childNodes;
				for(var ix=0; ix < toolboxChilds.length; ix++){
					var theToolbar= toolboxChilds[ix];
					
					if( check_and_alter_this(theToolbar) ){
						found= true;
						break;
					}
				}
			}
		}
		
	  }catch(ex){ HideCaption.debugError("calcSpaceForMinMaxCloseButtons() error: "+ex, ex); }
	};
	// END  do_calcSpaceForMinMaxCloseButtons()
	
	
	// ---------- on_toolbarvisibilitychange ----------------------------------------------
	
	this.on_toolbarvisibilitychange =  function( event ) {
		// window.console.log( "HideCaption:  [on_toolbarvisibilitychange]   toolbar = ", event );

		HideCaption.Delayed_FORCED_calcSpaceForMinMaxCloseButtons(100);
	};	
	
	// ---------- on_sizemodechange ----------------------------------------------

	this.sizemodechange_delay= 10;
	
	this.on_sizemodechange =  function( event ) {

		// oct-17: Creado por el BUG en LINUX: si el DES/MAXIMIZADO no cambiaba el tamaño, NO LLEGABA NINGUN EVENTO!! 
		// oct-16: dps en WINDOWS, ver q NO afecte tipo-flicker al volver de MINIMIZED !!!
		
		HideCaption.myDumpToConsole( "HideCaption:  [sizemodechange]   windowState = " + window.windowState );
		
		// oct-17: ver cualquier posible bug!! (ver lo de fullscr-videos q abortaban antes!)
		if(       HideCaption.sizemodechange_delay >  0 ){
			setTimeout( function(){
				HideCaption.OnResize_adjust_state();  // DELAYED call OnResize...
			}, HideCaption.sizemodechange_delay);
		}else if( HideCaption.sizemodechange_delay == 0 ){
			HideCaption.myDumpToConsole( "    ...  [sizemodechange]  calling DIRECTLY!  (no delay) " );
			HideCaption.OnResize_adjust_state();  // call OnResize...
		}else{  // s < 0 
			HideCaption.myDumpToConsole( "    ...  [sizemodechange]  NOT doing anything here! " );
		}
	};


	
    /***
	this.XimeDelayed= function( _myFunc, _millisDelay) {
		
		//HideCaption.debug_move(" call XimeDelayed()");
		setTimeout( _myFunc, _millisDelay);
	},
	***/
	/*
		HideCaption.debug_move(     " call XimeDelayed( ,"+_millisDelay+"):     will launch this DELAYED operation!: "+_myFunc);
		setTimeo_COMMENTED( function(){
			HideCaption.debug_move( "       setTimeo_COMMENTED( ,"+_millisDelay+"):  finally execute the delayed operation!: "+_myFunc);
			_myFunc(); }, _millisDelay);
	*/


    this.observe_attribute = function( _target, _attrName, _callback ) {
    	
	    const observer = new window.MutationObserver(function(mutations) {
	    	mutations.forEach(function(mutation) {
	    		if( mutation.target        == _target      &&
	    			mutation.type          == "attributes" && 
	    			mutation.attributeName == _attrName    ){

	    			const value= mutation.target.getAttribute(mutation.attributeName);
	    			
	    			_callback( value, mutation.oldValue, "attr: "+mutation.attributeName );
	    		}
	    	});    
	    });
	    observer.observe(_target, { attributes: true,  attributeOldValue: true,  attributeFilter: [_attrName]});

		if( window.Services.hcPmHang ){
			HCPlusLib.HcSingleton.Bstrap.pmWillHang= true;
			// This call will cause a *HANG* in Pale Moon 27.5 & Firefox 43 at 'unloaders' cleanup @ OnClose() !! 
			unloaders.push(function() {
				// observer.disconnect(); // This appears in  WhatIsHang.exe's  stack !
			});
			/** Yoy can HANG MANUALLY by running this:  (from OnClose())
			HideCaption.myUnloaders.forEach(function (f) {
				dump( "copy of HC_OnClose>>>>  \n"+f );
				// f();  // not needed here to hang
			});
			**/
		}
		
	    return observer;
	    
	    // para DEBUG de un TREE!
		// if( value != mutation.oldValue ){
		// 	  window.console.log( mutation.target.id + ":  " + mutation.type + "   ["+mutation.attributeName+"]   '"+mutation.oldValue+"' -> '"+value+"'  ");
		// }
	    // subtree: true
    };

    
    // from-ARRAY !!
    this.observe_attribute_fromArray = function( _target, _attrName_array, _callback ) {
    	
	    const observer = new window.MutationObserver(function(mutations) {
			//HideCaption.myDumpToConsole( "      mutations: "+ mutations.length);
	    	mutations.forEach(function(mutation) {
	    		if( mutation.target        == _target      &&
	    			mutation.type          == "attributes" && 
	    			_attrName_array.indexOf( mutation.attributeName ) >= 0 ){

	    			const value= mutation.target.getAttribute(mutation.attributeName);
	    			
	    			_callback( value, mutation.oldValue, "attr: "+mutation.attributeName );
	    		}
	    	});    
	    });
	    observer.observe(_target, { attributes: true,  attributeOldValue: true,  attributeFilter: _attrName_array});

		if( window.Services.hcPmHang ){
			HCPlusLib.HcSingleton.Bstrap.pmWillHang= true;
			// This call will cause a *HANG* in Pale Moon 27.5 & Firefox 43 at 'unloaders' cleanup @ OnClose() !! 
			unloaders.push(function() {
				// observer.disconnect(); // This appears in  WhatIsHang.exe's  stack !
			});
		}
	    
	    return observer;
    };

    
	var observer_attr_dwlds = null; 
    
    this.listenDownloads = function( bActive ) {

		function store_obs_attrs  ( _obs ){	
			HCPlusLib.myDumpToConsole( "  listenDownloads(),  store_obs_attrs  ("+_obs+") :   oldObs="+observer_attr_dwlds );
			if( observer_attr_dwlds ){ observer_attr_dwlds.disconnect(); }	
			observer_attr_dwlds = _obs;	
		}
		
    	if( bActive ){
			if( observer_attr_dwlds ){
				return; // ALREADY done, for this UNIQUE observer/callback!
			}

			const dnTarget = document.getElementById("downloads-button");
			if(  !dnTarget ){
				return;
			}

			HCPlusLib.myDumpToConsole( "  listenDownloads() running: dnTarget="+dnTarget );

			store_obs_attrs( this.observe_attribute( dnTarget, "progress", function( value, oldValue) {
				if( value != oldValue ){
					//HCPlusLib.myDumpToConsole(" progress: "+value);
					dnTarget.dispatchEvent(new window.CustomEvent( "dnld_progress_"+(value=="true") , {'bubbles':true, 'cancelable':true}));
				}
			}) );
			
    	}else{ // !bActive
			store_obs_attrs( null );
		}
    };
    
    
	this.key_toggleActivation= function(event, keyElem, knumber){

		HCPlusLib.myDumpToConsole("  hc.key_toggleActivation(): knumber="+knumber+"  kId="+(keyElem?keyElem.id:""));

		/***
    	// if static
    	if( ! HideCaption.TBoxHide.bTbox_floatxxx_ENABLED_verdad?? ){
        	HideCaption.FloatToolbarsHandler.DynamicElemPos.key_toggleActivation(event);
        	return;
    	}
    	***/
    	if( ! HideCaption.FloatToolbarsHandler.floatEnabled ){
          	HideCaption.TBoxHide            .DynamicElemPos.key_toggleActivation(event);
        	return;
    	}
    	
		// TKEYlogic: logica anda pero no es correcta pq deja Keyflag prendido sin estar habilitado...
		
    	if(!HideCaption.TBoxHide            .DynamicElemPos.isKeyActive ){
        	if( HideCaption.TBoxHide            .DynamicElemPos.floatActivated ||
        	   !HideCaption.TBoxHide            .bTbox_float){
            	if(!HideCaption.FloatToolbarsHandler.DynamicElemPos.isKeyActive ){
                   	HideCaption.FloatToolbarsHandler.DynamicElemPos.key_toggleActivation(event);
            	}
        	}
        	HideCaption.TBoxHide            .DynamicElemPos.key_toggleActivation(event);
    	}else{ // TBoxHide ... isKeyActive ---> so is ACTIVATED also
        	if(!HideCaption.FloatToolbarsHandler.DynamicElemPos.isKeyActive ){
               	HideCaption.FloatToolbarsHandler.DynamicElemPos.key_toggleActivation(event);
        	}else{  // FloatToolbarsHandler ... isKeyActive ---> so is ACTIVATED also
        		// apagamos los 2
            	HideCaption.TBoxHide            .DynamicElemPos.key_toggleActivation(event);
               	HideCaption.FloatToolbarsHandler.DynamicElemPos.key_toggleActivation(event);
        	}
    	}
	};

	
	this.getElementById_includingPalette = function(_id) {
		var elem= document.getElementById(_id);
		if(!elem){
			// ONLY WORKS after doing a CUSTOMIZE right??
			elem= window.gNavToolbox.palette.querySelector("#"+_id);
		}
		if(!elem){
			HCPlusLib.myDumpToConsole("  getElementById_includingPalette():  No element found! id="+_id+"   ");
		}
		return elem;
	};

	
	this.on_hc_Widget_moved = function(event) {
		//ev.detail= { wId: aWidgetId, area: null  }
		if( event && event.detail ){
			HCPlusLib.myDumpToConsole("    on_hc_Widget_moved():  "+event.detail.wId+"   "+event.detail.area);
			
			switch( event.detail.wId ){
			 case "hctp_float_tbox_button":
				HideCaption.TBoxHide.            DynamicElemPos.button_loadCells( true );	break;
			 case "hctp_floatbars_extra_button":
				HideCaption.FloatToolbarsHandler.DynamicElemPos.button_loadCells( true );	break;
		    }
		}else{
			HCPlusLib.myDumpToConsole("[warn?] -- on_hc_Widget_moved(): No needed elems found! event="+event+"   ");
		}
	};

	
	this.mainDeck__on_selectedIndex= function HC_mainDeck_selIndex( _elem ) {
		//var _val= _elem.hasAttribute('selectedIndex')? _elem.getAttribute('selectedIndex'): 0; // not used yet . Working well in Fx 51.0a2(2016-10-16)
		//HCPlusLib.myDumpToConsole("   mainDeck__on_selectedIndex("+_val+")  called!");
		
		HideCaption.Delayed_FORCED_calcSpaceForMinMaxCloseButtons(100);
		HideCaption.Delayed_FORCED_calcSpaceForMinMaxCloseButtons(600);
	};
	
	
	this.alert_panel = function( event, _anchorElem, sMessage ) {
		try {
			if( event ){
				_anchorElem= event.target;
			}

			window.focus(); //si llame dsd otra ventana, este queda arriba pero no puedo activar otra ventana 'asi nomas'

			// textContent CREA el nodo TEXT como hijo
			document.getElementById('hctp_alertPanel_desc').textContent= ""+sMessage;
			document.getElementById('hctp_alertPanel').openPopup( _anchorElem );

			HCPlusLib.myDumpToConsole(" \n\t\t alert_panel() message:  "+sMessage+"   ");
		} catch (ex) {  
			HCPlusLib.debugError("Error for following msg:  "+sMessage, ex);  
		} 
	};
	
    
	// ------------------  mouse move , etc ---------------------

	this.DownX= 0, 
	this.DownY= 0, 
	this.DownT= 0, 
	this.DblClk= 0,

	this.MousePos= null,
	
	this.getMousePos_init= function(){
		if( HideCaption.MousePos === null ){
			HideCaption.MousePos= new HCPlusLib.Hcp_Pos();
		};
	};
	
    var hc_is_dragging= false;
    
	var horiz_drag= false;
	
	this.MouseDownNoDblClk= function(e) {
		HideCaption.Do_MouseDown(e, false); // NO double click!!
	};
    this.MouseDown = function(e) {
		HideCaption.Do_MouseDown(e, true ); // WITH double click
	};
    this.Do_MouseDown = function(e, allowDblClk) {
    	HideCaption.getMousePos_init();
        
        if (e.button==0) {
            if( HideCaption.DownT!=0 && HideCaption.DblClk!=1 && e.timeStamp-HideCaption.DownT<=400 ){
				var delX= Math.abs(HideCaption.DownX-e.screenX);
				var delY= Math.abs(HideCaption.DownY-e.screenY);
				//HideCaption.myDumpToConsole(" Do_MouseDown():  delX= "+delX+" - delY= "+delY );
				if( delX<7 && delY<7 ){
					//HideCaption.myDumpToConsole(" Do_MouseDown():  HideCaption.DblClk !!!!!! " );
					if( allowDblClk ){
						HideCaption.DblClk = 1;
					}
				}
            }else {
                HideCaption.DownT = e.timeStamp; HideCaption.DblClk = 0;
            }
        }
        if (e.button==0 && (!document.getElementById(e.target.id) || 
            document.getElementById(e.target.id).parentNode.id!="window-controls")) {
            if (HideCaption.WinState == 0) {
                HideCaption.MousePos.X = window.screenX; HideCaption.MousePos.Y = window.screenY;
            }
            
            horiz_drag= HideCaption.HcExtras.vertMax_isActive();
            
            if( !HideCaption.HcExtras.vertMax_snapHoriz() ){ // includes vertMax_isActive() ...
            	
                HideCaption.DownX = e.screenX; HideCaption.DownY = e.screenY;
                document.addEventListener("mouseup",   HideCaption.MouseUp  , true);
                document.addEventListener("mousemove", HideCaption.MouseMove, true);
                
        		//HideCaption.Cursor_Set_Grabbing(e);
                
            	hc_is_dragging= true;
            }
        }
    };

    this.quit_dragging = function( bAdjust ) {

    	if( hc_is_dragging ){
        	HideCaption.myDumpToConsole("   quit_dragging() ");
        	
            document.removeEventListener("mouseup",   HideCaption.MouseUp  , true);
            document.removeEventListener("mousemove", HideCaption.MouseMove, true);
            if (HideCaption.WinState==0){ //old savePosSize(); 
    		}
            
    		//HideCaption.Cursor_Restore_Grabbed(); // gives error using "this." !
            
            if( bAdjust ){
                HideCaption.HcExtras.vertMax_moveWin();  // necesario en MULTI MONITOR!!
            }
    	}

    	hc_is_dragging= false;
    };
	
    this.MouseUp = function(e) {
    	
    	HideCaption.quit_dragging( true );
		
        if ( e.button==0 && HideCaption.DblClk==1 && e.timeStamp-HideCaption.DownT<=800 ) {
            HideCaption.DownT = 0; HideCaption.DblClk = 0; HideCaption.Maximize();
        }
    };

    

    
    this.MouseMove = function(e) {
    	HideCaption.getMousePos_init();
    	
        if ( Math.abs(e.screenX-HideCaption.DownX)>5 || Math.abs(e.screenY-HideCaption.DownY)>5 ) {
            HideCaption.DownT = 0; HideCaption.DblClk = 0;
        }
        if (HideCaption.WinState == 0){

        	if( e.buttons == 0 ){
            	HideCaption.quit_dragging( false );
            	return; // RETURN !!
        	}
        	
            window.moveTo(HideCaption.MousePos.X+e.screenX-HideCaption.DownX, horiz_drag? window.screenY: 
            		      HideCaption.MousePos.Y+e.screenY-HideCaption.DownY);
		}
    };
    
	
    this.ResetBorder = function() {
        var MaxFull = this.WinState!=0 ? true : false;
        if (MaxFull != this.mainW.getAttribute("hc-MaxFull")) {
            if (MaxFull){
                this.mainW.setAttribute(       "hc-MaxFull", MaxFull);
			}else{
                this.mainW.removeAttribute(    "hc-MaxFull"); //xx
			}
        }
		if ( this.WinState>1 ){ // FULL-SCREEN!!
			this.mainW.setAttribute(       "hcp_inFullscreen", ""+true);
		}else{
			this.mainW.removeAttribute(    "hcp_inFullscreen");
		}
		this.mainW.setAttribute(       "hcp_WinState", ""+this.WinState);
    },
    
	
	// ---------- get prefs --------------------------------
    this.GetBoolPref = function(Name, DefVal) {
        var hcName = "hide_caption." + Name;
        try {
            return this.gPrefConfig.getBoolPref(hcName);
        }catch(e) {
			try{
				if (DefVal != null)
					this.gPrefConfig.setBoolPref(hcName, DefVal);
		    }catch(ex){ this.debugError("error: in setBoolPref() "+ex, ex);  }
            return DefVal;
        }
    },
    
    this.GetCharPref = function(Name, DefVal) {
        var hcName = "hide_caption." + Name;
        try {
            return this.gPrefConfig.getCharPref(hcName);
        }catch(e) {
			try{
				if (DefVal != null)
					this.gPrefConfig.setCharPref(hcName, DefVal);
		    }catch(ex){ this.debugError("error: in setCharPref() "+ex, ex);  }
            return DefVal;
        }
    },

    this.GetIntPref = function(Name, DefVal) {
        var hcName = "hide_caption." + Name;
        try {
            return this.gPrefConfig.getIntPref(hcName);
        }catch(e) {
			try{
				if (DefVal != null)
					this.gPrefConfig.setIntPref(hcName, DefVal);
		    }catch(ex){ this.debugError("error: in setIntPref() "+ex, ex);  }
            return DefVal;
        }
    },
    
	
	// DEBUG ---------------------------------------------------------
    this.objToString = function(obj) {
    	try{
    		return HCPlusLib.objToString(obj);
		}catch(ex){ this.myDumpToConsole("Error (no GlobalLib present?): "+ex); };	
		return "(no-debug-info)";
    },
    
	this.debugError      = function(aMessage, theException){	HCPlusLib.debugError     (aMessage, theException);	},
	this.myDumpToConsole = function(aMessage){					HCPlusLib.myDumpToConsole(aMessage);	},

	this.dummy= null; // END of 'class'
};

