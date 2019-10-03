
"use strict";

var EXPORTED_SYMBOLS = ["DynamicElemPos_class"];

//  DynamicElemPos

var DynamicElemPos_class= function ( _win, _ParentID ){

        const window      = _win;
        const document    = window.document;
        const setTimeout  = window.setTimeout;
        const clearTimeout= window.clearTimeout;
        const getComputedStyle= window.getComputedStyle;
        const parseInt    = window.parseInt;
        const parseFloat  = window.parseFloat;
        
        const HCPlusLib   = window.HCPlusLib;
        const HideCaption = window.HideCaption;

        // --------------------------------------------------------------
        
        const thySelf= this;

		this.array_content_events  = new Array();
        this.elem_array_for_Active = new Array();

        var callback_onActive;
        var callback_onInactive;
        
        var b_initd = false;
        
        // enabled flag!
        this.bEnabled = false;
                
		this.init= function( _menubarItems, _callback_onActive, _callback_onInactive ) {

			if( b_initd ){
				HCPlusLib.myDumpToConsole( "   ... DynamicElemPos.init(): already called " );
				return;
			}
			b_initd = true;

			
            callback_onActive  = _callback_onActive;
            callback_onInactive= _callback_onInactive;
        
        
            this.menubarItems= _menubarItems;
   			this.box_browser = document.getElementById( "browser" );

			this.array_content_events= new Array();
			this.array_content_events.push( new HideCaption.Hc_EventListener(this.box_browser, "mousedown"    , function(ev){ thySelf.on_content_click(ev);      }, false));
			//changed CLICK to MOUSEDOWN !!! :-)

            
			const       elem_array_for_Inactive= new Array( this.box_browser );
			const eventTypes_array_for_Inactive= new Array("mouseover", "mousemove", "dragenter");
			
			this.hotspot_mouse_hover= new HideCaption.Hc_SpecialEvent( function(_ev, _SpecialEv){ thySelf.on_hot_mouse_hover_special(_ev,_SpecialEv); }, _ParentID );
			//is.hotspot_mouse_hover.for_state_active  .init( elem_array_for_Active  , new Array("xxxxx"));
			this.hotspot_mouse_hover.for_state_Inactive.init( elem_array_for_Inactive, eventTypes_array_for_Inactive);
			//este Inactive --> "mous_over" sirve cuando se sale de un popup (con ALT) y el mouse q esta en el area-content NO se movio! TAMBIEN para el BUG de Fx con FLASH OBJECTs!

			// NEW!! (2016-03) **for DEACTIVATION only**!!!
			this.hotspot_mouse_hover_deactivOnly= new HideCaption.Hc_SpecialEvent( function(_ev, _SpecialEv){ thySelf.on_hot_mouse_hover_special__deactivOnly(_ev,_SpecialEv); }, _ParentID );
			this.hotspot_mouse_hover_deactivOnly.for_state_active  .init( new Array()            , new Array()); // ALL EMPTY here!
			this.hotspot_mouse_hover_deactivOnly.for_state_Inactive.init( elem_array_for_Inactive, eventTypes_array_for_Inactive);
		},

		
		this.set_All_EventListeners=  function( bAdd ){

			HCPlusLib.myDumpToConsole(" DynamicElemPos:   set_All_EventListeners("+bAdd+")");

			if( bAdd == this.bEnabled ){ // ALREADY in requested state!!
				if( !this.bEnabled ){
					HCPlusLib.myDumpToConsole("            .....  DynamicElemPos:  bEnabled==FALSE  already!, RETURNING.  ");  
					return; // VERY IMPORTANT at shutdown when disabled!!, was giving "hotspot_mouse_hover is undefined"
				}else{
					HCPlusLib.myDumpToConsole("            .....  DynamicElemPos:  bEnabled==TRUE   already!, ignoring.  (warn?) ");  
				}
			}
			
	        // enabled flag!
			this.bEnabled= bAdd;
			
            if(!bAdd ){
                //do a good reset of all flags and listeners !
                this._setInactive_now();
            }
            
			if( bAdd ){
				// MY BUTTON CELLS!
				this.button_loadCells( bAdd );
				
				//1- disable mouse
				thySelf.hotspot_mouse_hover.setEnabled( false );
				//2- init active array -  (elem_array_for_Active is LOADED outside!)
				thySelf.hotspot_mouse_hover.for_state_active  .init( thySelf.elem_array_for_Active, new Array("mouseenter","dragenter")); //dragenter: ie. for dragging bookmarks !!
			}
			//enable/disable hover !
			thySelf.hotspot_mouse_hover            .setEnabled( bAdd ); // when enabled calls  setActive(false)  (active=false, so ADD-listeners to activate, and viceversa)
			thySelf.hotspot_mouse_hover_deactivOnly.setEnabled( bAdd );
			
			// main-menu active!! -----------------------------------------------------------------
			//var my_DOMMenuBar_EventElem= document.getElementById( "menubar-items" );
			HideCaption.set_EventListener( bAdd, thySelf.menubarItems	, "DOMMenuBarActive"  	, thySelf, false); // my_DOMMenuBar_EventElem 
			HideCaption.set_EventListener( bAdd, thySelf.menubarItems	, "DOMMenuBarInactive"	, thySelf, false); // solo 'salta' si el mainmenu esta en los floating...
			//usaba el hctpToolbox!
			
			// popups! ----------------------------------------------------------------------------
			HideCaption.set_EventListener( bAdd, document				, "popupshown" 			, thySelf, false);
			HideCaption.set_EventListener( bAdd, document				, "popuphidden"			, thySelf, false);
			
			// FOCUS  stuff ------------------------------------------------------------------------
			// falta el identitybox focus? -- para mi q nop.
			//TODO: poner un querySelector para estos?? (thySelf.menubarItems.querySelector...(...)), creo q no pq si los muevo (customize) tengo q agregar mucho codigo de unset/set on-the-fly.
			const urlBar   = document.getElementById( "urlbar" );
			const searchBar= document.getElementById( "searchbar" );
			if( urlBar ){
				HideCaption.set_EventListener( bAdd, urlBar   , "focus", thySelf.on_focus_or_blur, false);
				HideCaption.set_EventListener( bAdd, urlBar   , "blur" , thySelf.on_focus_or_blur, false);
			}
			if( searchBar ){
				HideCaption.set_EventListener( bAdd, searchBar, "focus", thySelf.on_focus_or_blur, false);
				HideCaption.set_EventListener( bAdd, searchBar, "blur" , thySelf.on_focus_or_blur, false);
			}
			//focus events that BUBBLES ! - catch'em ONLY inside my FLOAT obj!
			HideCaption.set_EventListener( bAdd, thySelf.menubarItems	, "h_focus"				, thySelf, false);
			HideCaption.set_EventListener( bAdd, thySelf.menubarItems	, "h_blur" 				, thySelf, false);
			HideCaption.set_EventListener( bAdd, thySelf.menubarItems	, "dnld_progress_true"	, thySelf, false);
			HideCaption.set_EventListener( bAdd, thySelf.menubarItems	, "dnld_progress_false"	, thySelf, false);
			
			// KEYBOARD stuff ------------------------------------------------------------------------
			HideCaption.set_EventListener( bAdd, document				, "keydown"				, thySelf, false);
            
            
            if( bAdd ){
                //do a good reset of all flags and listeners !
                //this._setInactive_now();

            	this.set_cell_active( 5, true);
            	thySelf.hotspot_mouse_hover.setActive(true);
            }
            
            if(!bAdd ){
				// MY BUTTON CELLS!
				this.button_loadCells( bAdd );
            }
        },

		this.on_focus_or_blur= function(event){
			//"h_focus","h_blur"
			event.target.dispatchEvent( new window.CustomEvent( "h_"+event.type, {'bubbles': true, 'cancelable': true}) );
		};

		
		//  --- DEBUG INFO -------------------------------------
		const string_flags= function() {
			return "  flags:  ["
					+ string_ONE_flag("popupOpen_level", thySelf.popupOpen_level)
					+ string_ONE_flag("isDomActive"    , thySelf.isDomActive)
					+ string_ONE_flag("isKeyActive"    , thySelf.isKeyActive)
					+ string_ONE_flag("isFocusActive"  , thySelf.isFocusActive)
					+ string_ONE_flag("isTempActive"   , thySelf.isTempActive)
					+ string_ONE_flag("hotspot_mouse_hover            .isActive()", thySelf.hotspot_mouse_hover            .isActive())
					+ string_ONE_flag("hotspot_mouse_hover_deactivOnly.isActive()", thySelf.hotspot_mouse_hover_deactivOnly.isActive())
					+"]";
		};
		function string_ONE_flag(sTitle, bFlag) {	return !!bFlag? "    "+sTitle+"= "+bFlag: "";  };
		
		
		//  ----------------------------------------
		
		this.floatActivated= false,
		
		this._inactiveTimeout= null,
		this._activeTimeout= null,
		
		//this._extra_inactive_delay= 0,
		
		this._setInactive_Async=  function () {
          if (this._activeTimeout) {
              clearTimeout(this._activeTimeout);
              this._activeTimeout = null;
          }
          if (this._inactiveTimeout) {
			return; // RETURN!! - Darth Madara: FIX for *potential* BUG when 2 equal events comes together!!! (happened with mous_out in mmcButtons!)
		  }
          this._inactiveTimeout = setTimeout(function (self) {
	            //if (self.getAttribute("autohide") == "true") {
	              self._inactiveTimeout = null;
	              self._setInactive_now();
	            //}
            }, this._inactive_millis, this); // + this._extra_inactive_delay
          //this._extra_inactive_delay= 0;
		},

		this._setActive_Async=  function (aEvent) {
          if (this._inactiveTimeout) {
            clearTimeout(this._inactiveTimeout);
            this._inactiveTimeout = null;
          }

          if( this._active_millis < 1 || !aEvent || aEvent.type != "mouseenter" ){ // INSTANT Action! - fix menu location problem 
        	  //HideCaption.myDumpToConsole("Performance GAIN:  calling DIRECLY _setActive_now() ");
              this._setActive_now(aEvent);
          }else{
	          if (this._activeTimeout) {
	  			return; // RETURN!! 
	  		  }
	          this._activeTimeout = setTimeout(function (self) {
	                self._activeTimeout = null;
	                self._setActive_now(aEvent);
	            }, this._active_millis, this);
          }
		},
		
		this.bannedActivation= false,
		
		this._setInactive_now=  function () {
			if( this.menubarItems ){
				
				this.floatActivated= false;
				
				this.menubarItems.setAttribute("inactive", "true");
				
				// ERASE top. (only top!, bc. is defaulted to -40px offscreen)
				// xxis.menubarItems.style.removeProperty("top"); // done in CSS !
                
                callback_onInactive();	// this.last_active_top_pos_setted= false;
			}
			
			if( this.isDomActive ){ // should inactivate menubar!! it remained activated after tab-selecting from a float-tboxhide-tab to a normal one... 
			    setTimeout(function () {
					thySelf.dispatch_event("main-menubar", "DOMMenuBarInactive");
			    }, 100);
			}
			
			//this.isMouse_Hover  = false;
			this.hotspot_mouse_hover            .setActive(false);
			this.hotspot_mouse_hover_deactivOnly.setActive(false);
			this.isDomActive  = false;
			this.isKeyActive  = false;
			this.isFocusActive= false; // llamar a .blur() aca? -- usar una var de current_focused de mis items CONOCIDOS! <<--- mar-2013: ya esta esto 100% me parece -al menos con ESC-.
			this.isTempActive = false;
			this.popupOpen_level= 0;

			//mybutton cells...
			for( var ix=1; ix <= 6; ix++){
				this.set_cell_active( ix, false);
			}

		    this.array_content_events.forEach(function(mItem) {
		    	mItem.removeEventListener(); //1st mous_move event is 'same' as Fx-fullscr!
		    });
		    
		    //ban activation for a little time...
		    this.bannedActivation= true;
		    setTimeout(function (self) {
			    self.bannedActivation= false;
		    }, 30, this);
		},
		this._setActive_now=  function (aEvent) {
			
			//HideCaption.myDumpToConsole("       _setActive_now():  " + string_flags() );

			if(	this.bannedActivation ){
				if( !this.isDomActive && !this.isKeyActive && !this.isTempActive ){
					//HideCaption.myDumpToConsole("       bannedActivation!  returning...");
					this.hotspot_mouse_hover            .setActive(false);
					this.hotspot_mouse_hover_deactivOnly.setActive(false);
					return; // only for 'soft' quick mous_overs, etc...?
				}
			}
			
			if( this.menubarItems ){
				
				this.floatActivated= true;
				
				this.menubarItems.removeAttribute("inactive"); //TODO: ?
				
                callback_onActive();  //if( this.setFloatPosition() ) ...
			}
			
		    this.array_content_events.forEach(function(mItem) {
		    	mItem.addEventListener(); //1st mous_move event is 'same' as Fx-fullscr!
		    });
		},

		
		this._active_millis=   0,
		this._inactive_millis= 100,

		this.setActive_millis=  function (_millis) {
			if(_millis> 2000){ _millis= 2000;}
			if(_millis<    0){ _millis=    0;}
			
			this._active_millis  = parseInt(_millis);
		},
		this.setInactive_millis=  function (_millis) {
			if(_millis> 2000){ _millis= 2000;}
			if(_millis<    0){ _millis=    0;}
			
			this._inactive_millis= parseInt(_millis);
		},


		//-------------------
		this.dispatch_event= function( elem_id, ev_type ) {
			// DEPRECATED WAY!!: doc.createEvent("Event"); ev.initEvent(...);
			document.getElementById(elem_id).dispatchEvent( new window.CustomEvent(ev_type, {'bubbles': true, 'cancelable': true}) );
		};
		
		
		// DUMMY function to be overriden eg. in TBoxHide !!
		this.on_DOMMenuBarActive= function( bSet ) {
		};
		
		// HANDLERS ---------------------------------------------------------------------------------

		//is.isMouse_Hover= false,
		this.isDomActive  = false, 
		this.isKeyActive  = false,
		this.isFocusActive= false,
		this.isTempActive = false,
		this.popupOpen_level= 0,
		
		this.setKeyActive 		= function( _act ){	this.isKeyActive	= _act;	this.set_cell_active( 1, _act);	 };
		this.setDomActive 		= function( _act ){	this.isDomActive	= _act;	this.set_cell_active( 2, _act);	 this.on_DOMMenuBarActive(_act); };
		this.setFocusActive 	= function( _act ){	this.isFocusActive	= _act;	this.set_cell_active( 3, _act);	 };
		this.setPopupOpen_level = function( _lev ){ if( _lev < 0 ){  _lev = 0; }
		                                            this.popupOpen_level= _lev;	this.set_cell_active( 4, _lev!=0); };
		//this.setMOUSExxx 		= function( _act ){	this.isMouse...		= _act;	this.set_cell_active( 5, _act);	 };
		this.setTempActive 		= function( _act ){	this.isTempActive	= _act;	this.set_cell_active( 6, _act);	 };
		
		
		this._safeToCollapse= function(forceHide) {
			//if (!gPrefService.getBoolPref("browser.fullscreen.autohide"))
			//	return false;

			// a popup menu is open (or other activation is in use) in chrome: don't collapse chrome
			if (!forceHide && 
			   (this.popupOpen_level > 0 || this.isDomActive || this.isKeyActive || this.isFocusActive || this.isTempActive || 
				this.hotspot_mouse_hover            .isActive() || 
				this.hotspot_mouse_hover_deactivOnly.isActive() 
				) ) { //this.isMouse_Hover

				//HideCaption.myDumpToConsole("       NOT _safeToCollapse():  " + string_flags() );
				//XXCaption.myDumpToConsole("           .... " + "forceHide= " + forceHide+"    " );
				
				return false;
			}

			//HideCaption.myDumpToConsole("       OK  _safeToCollapse():  " + string_flags() );
			//HideCaption.myDumpToConsole("           .... " + "forceHide= " + forceHide+"    " );

			// llamar aca a .blur()  vd? <<--- mar-2013: ya esta esto 100% me parece -al menos con ESC-.
			
			/* Fx-FullScreen code:
			// a textbox in chrome is focused (location bar anyone?): don't collapse chrome
			if (document.commandDispatcher.focusedElement &&
				document.commandDispatcher.focusedElement.ownerDocument == document &&
				document.commandDispatcher.focusedElement.localName == "input") {
				if (forceHide)
					// hidden textboxes that still have focus are bad bad bad
					document.commandDispatcher.focusedElement.blur();
				else
					return false;
			}
			*/
			return true;
		},
    
		this.activation_Toggle= function(event, aShow, forceHide) {
		    if( !aShow && aShow == this.floatActivated ||     //TODO: en esta linea TB tuve q user [!aShow] pq sino me desactiva cuando pasa de un focus (URLbar) al otro.
		        !aShow && !this._safeToCollapse(forceHide) ){
		    	return;
		    }
		    if( !this.bEnabled ){
			  	HideCaption.myDumpToConsole("  activation_Toggle():  feature NOT enabled, returning. ");
			  	return;
		    }
			
		    if( aShow ){ //activate!
				this._setActive_Async(event);
		    }else{       //DEactivate!
		    	if( forceHide ){
    				this._setInactive_now();  
		    	}else{
					this._setInactive_Async();
		    	}
		    }
		},

        // it's 'on_mousedown' really!
        this.on_content_click= function(event){ 
		  	//HideCaption.myDumpToConsole("       on_content...->"+event.type);
			if( this.floatActivated ){ // this is for me only ... not!
	            //event.stopPropagation();
	            //event.preventDefault();
			}
			//this.isXXXXXX= false; <-- redundant with forceHide
			
			//act on PRIMARY button mousedown only!!
			if( event && event.button == 0 ){
				this.activation_Toggle(event, false, true); //forceHide!
			}
        },
    

        // MOUSE section ------------------------------------------------------
        this.hotspot_style= "default",
        
        //incluimos nomas el nuevo boton al array ...
        this.mouse_activate= function(event, bActive){
        	this.hotspot_mouse_hover.do_activate(bActive);
        	
        	//xx.on_hot_mouse_hover_special(event, this.hotspot_mouse_hover);
        	
        	// APAGAMOS tb el ..._deactivOnly // TODO: dejo por ahora esto, pero entiendo q ya es redundante pq se setea ya en el handler mismo.
        	if( !bActive ){
            	this.hotspot_mouse_hover_deactivOnly.do_activate(bActive);
        	}
        };
        
		
        this.spot_oldPropValue= null;
        this.spot_oldPropPrior= null;
		
        this.on_hot_mouse_hover_special= function(event, _hotspot_mouse_hover){
			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");

        	var mouse_hover_Active= _hotspot_mouse_hover.isActive();
        	
        	if(!mouse_hover_Active ){
				this.setTempActive( false ); // 1) mouse DE-activation forces temp==off also...
				// 2) ALSO 2nd mouse-handler!
				this.hotspot_mouse_hover_deactivOnly.setActive(false);
        	}
        	if( !_hotspot_mouse_hover.forDeactivationOnly ){ // TODO:  esto pongo pero 1) NO USO este flag en esta instancia y ENCIMA 2) cuando mouse_hover_Active es FALSE, NO TOMA todavia este flag 'dentro de la clase' 
        		this.set_cell_active( 5, mouse_hover_Active, "moveDownOnly_"+_hotspot_mouse_hover.moveDownOnly );
        	}
        	
			var wasActivated= this.floatActivated;
			
			this.activation_Toggle(event, mouse_hover_Active);
			
        	if( mouse_hover_Active ){

				if(	! this.bannedActivation ){
					if( thySelf.hotspot_style != "none" ){

						// Esto esta bueno solo para las esquinas, no toolbox (grandes)
						if( !wasActivated && 
							event.currentTarget != this.menubarItems ){ //!this.isMous_Over

							if(!thySelf.spot_oldPropValue ){
								var currTgStyle= event.currentTarget.style;
								thySelf.spot_oldPropValue= currTgStyle.getPropertyValue(   "box-shadow");
								thySelf.spot_oldPropPrior= currTgStyle.getPropertyPriority("box-shadow");
								
								currTgStyle.setProperty("box-shadow", "0 0 2px 1px blue, 0 0 2px 1px blue inset", "");
								setTimeout( function(){
									//gStyle.removeProperty("box-shadow");
									currTgStyle.setProperty("box-shadow", thySelf.spot_oldPropValue, ""+thySelf.spot_oldPropPrior);
									thySelf.spot_oldPropValue= null;  // reset it!
								}, 300);
							}
						}
					}
				}
			}
        };
		
        // ..._deactivOnly !
        this.on_hot_mouse_hover_special__deactivOnly= function(event, _hotspot_mouse_hover){
			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");

        	var mouse_hover_Active= _hotspot_mouse_hover.isActive();
        	
        	if(!mouse_hover_Active ){
				this.setTempActive( false ); // mouse-DEactivation forces temp==off also...
        	}
        	
        	/*** anulado pq 'adentro de este class' todavia no toma la var: "forDeactivationOnly" 
        	if( !_hotspot_mouse_hover.forDeactivationOnly ){
        		this.set_cell_active( 5, mouse_hover_Active, "moveDownOnly_"+_hotspot_mouse_hover.moveDownOnly );
        	}
        	***/
        	
			this.activation_Toggle(event, mouse_hover_Active);
        };
        
        
        this.handleEvent= function (event) {

		  //HideCaption.myDumpToConsole("       handleEvent() event.type="+event.type+"  - "+event.target.id+
          //	  							"  -   currentTarget:"+(event.currentTarget?event.currentTarget.id:"---") );
		  
          switch (event.type) {
			
            case "DOMMenuBarActive":	this.setDomActive(true );	this.activation_Toggle(event, true ); 	break;
            case "DOMMenuBarInactive":	this.setDomActive(false);	this.activation_Toggle(event, false);	break;
			 
            case "keydown":
    			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");
                if (event.keyCode == event.DOM_VK_ESCAPE){
    				if( this.floatActivated ){ // ESC key is for me only! :-)
    	    			//HideCaption.myDumpToConsole("     preventDefault() .. etc  ");
    		            event.stopPropagation();
    		            event.preventDefault();
    				}
                    
                    var _was_FocusActive= this.isFocusActive;
                    
    				this.activation_Toggle(event, false, true); //forceHide! -> forced *and* instant deactivation! 
                    
                    if(_was_FocusActive){ // REMOVE focus!
                        
            			setTimeout( function(){
                            var urlBar   = document.getElementById( "urlbar" );
                            var searchBar= document.getElementById( "searchbar" );
                            if(urlBar   ){ urlBar.blur();     }
                            if(searchBar){
                                searchBar.blur();
                                searchBar= document.getAnonymousElementByAttribute(searchBar, "anonid", "searchbar-textbox");
                                if(searchBar){ 
                                    searchBar.blur();
                                }
                            }
            			}, 200);
                    }
                }
                /*
                else if (event.keyCode == event.DOM_VK_F6){
                	this.key_toggleActivation(event);
                }
                */
			  break;
			  
		    //HTCP: comment from Firefox-FULLSCREEN code.
            // Popups should only veto chrome collapsing if they were opened when the chrome was not collapsed.
            // Otherwise, they would not affect chrome and the user would expect the chrome to go away.
            // e.g. we wouldn't want the autoscroll icon firing this event, so when the user
            // toggles chrome when moving mouse to the top, it doesn't go away again.
            case "popupshown":
                // window.console.log( "popupshown event: ",  event);
                // Can be included in comparison: <target>.ownerGlobal/ownerDocument , for eg. addon-page, etc
                if ( event.target.localName != "tooltip" && 
                	 event.target.localName != "window"  &&
                	 event.originalTarget.localName != "tooltip"  &&
                	 this.floatActivated  ){ // !FullScreen._isChromeCollapsed
                    this.setPopupOpen_level(this.popupOpen_level + 1);
                }
              break;
            case "popuphidden":
                if ( event.target.localName != "tooltip" &&
                	 event.target.localName != "window"  &&
                	 event.originalTarget.localName != "tooltip" ){
                    this.setPopupOpen_level(this.popupOpen_level - 1);
                    if( this.popupOpen_level <= 0 ){
                    	//this.popupOpen_level = 0; // done inside setter
                    	
        				this.activation_Toggle(event, false); //this uses level == 0
                    }
                }
			  break;

            case "dnld_progress_true":   
            case "dnld_progress_false":  
            	this.active_timeout({}, 2500);
              break;
			  
            case "h_focus":		this.setFocusActive(true );	this.activation_Toggle(event, true );	break;
            case "h_blur":		this.setFocusActive(false);	this.activation_Toggle(event, false);	break;
          }
        },

    	//CALLED by <KEY> !! - // if( thySelf.bEnabled )  TKEYlogic  en hc.js
    	this.key_toggleActivation= function(event){	  	this.setKeyActive (!this.isKeyActive);	this.activation_Toggle(event, this.isKeyActive);
    	},
        
        //CALLED by timeout()
    	this.timeout_Activate    = function(bActive){	this.setTempActive( bActive);			this.activation_Toggle({}   , bActive);
    	};
    	

    	const active_tOut= new HCPlusLib.HcSingleton.Hc_Timeout();
    	// active_tOut.clear_removeTimeout();  //no haría falta pq implmente y uso el 6to flag aqui!
    	this.active_timeout      = function( _dummy_event, _millis ) {
    		if( !thySelf.bEnabled ){
    			return;  // !!
    		}
    		
    		//HCPlusLib.myDumpToConsole( "   active_timeout( ,"+_millis+")" );
			
    		thySelf.timeout_Activate(true);
    		
    		thySelf.hotspot_mouse_hover_deactivOnly.moveDownOnly       = true;
    		thySelf.hotspot_mouse_hover_deactivOnly.forDeactivationOnly= true;
    		thySelf.hotspot_mouse_hover_deactivOnly.do_activate(true );

    		active_tOut.setTimeout( function() {
    			//HCPlusLib.myDumpToConsole( "   active_timeout()  UNSET ** " );
    			if( thySelf.hotspot_mouse_hover_deactivOnly.forDeactivationOnly ){
    				thySelf.hotspot_mouse_hover_deactivOnly.do_activate(false ); // ya apaga tb el setTempActive() y ya actualiza en activation_Toggle()  
    			}
    			thySelf.timeout_Activate(false);
    		}, _millis? _millis: 1800);
    	};
    	
    	
    	// My special button with color boxes! ----------------------------------------------------------
    	var mySpecialButton= null;
		var cellArray      = new Array();
		var bLoaded= false;
    	this.set_cell_active= function( numcell, bActive, extra_value) {
    		// if( cellArray.length == 0 ){  //... improve EFFICIENCY , load cells smartly?
    		//  	this.button_loadCells( true );
    		// }
    		if( bLoaded ){
        		cellArray[numcell].setAttribute("active", ""+bActive);
        		// extra_value
        		cellArray[numcell].setAttribute("extra" , ""+extra_value);
    		}
    	};
    	this.button_loadCells= function( bLoad ) {
    		if( bLoad && this.bEnabled ){ // ONLY if ENABLED!
        		mySpecialButton=  this.menubarItems.id == "navigator-toolbox"?  
        									HideCaption.getElementById_includingPalette("hctp_float_tbox_button"):
        									HideCaption.getElementById_includingPalette("hctp_floatbars_extra_button");
        		bLoaded= !!mySpecialButton;
        		if( bLoaded ){
            		for( var ix=1; ix <= 6; ix++){
            			cellArray[ix]= mySpecialButton.querySelector("[cell='"+ix+"']");
            		}
        		}
    		}else{ // !bLoad || !this.bEnabled  --> UNload
    			bLoaded= false;
    			cellArray= new Array(); // empty !
    		}
    		if( mySpecialButton ){
    			mySpecialButton.setAttribute("disabled", ""+(!this.bEnabled) );
    		}
		};
};

