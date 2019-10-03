
"use strict";

// australis

var EXPORTED_SYMBOLS = ["HomeToolbarHandler_class"];


var HomeToolbarHandler_class= function( _win ){

	const window      = _win;
	const document    = window.document;
	const setTimeout  = window.setTimeout;
	const clearTimeout= window.clearTimeout;
	const screen      = window.screen;
	const parseInt    = window.parseInt;
	const parseFloat  = window.parseFloat;

	const HCPlusLib   = window.HCPlusLib;
	const HideCaption = window.HideCaption;

	
	const thySelf= this;
	
	
	//------------------------------------------
	
	
		this.menubarItems= null,
		this.homeToolbar = null,
		this.fx4ButtonContainer= null,
	
		this.HcEvent_keydown= null,
		
		this.b_initd= false,
		
		this.initHomeToolbar= function(){
			
			if( this.b_initd ){
				return;
			}
			this.b_initd = true;
			
			
			this.menubarItems= document.getElementById( "menubar-items" );
			this.homeToolbar = document.getElementById( "hctp-appmenu-button-cont-fixed"  ); // deprecating "hcp-home-toolbar" ...  

			this.fx4ButtonContainer= document.getElementById( "appmenu-button-container" );
			if( !this.fx4ButtonContainer ){
				this.fx4ButtonContainer= document.getElementById("appmenu-toolbar-button"); // LINUX FX button
			}
			var appmenuButton= document.getElementById( "appmenu-button" );
			if( this.fx4ButtonContainer!=null && appmenuButton!=null && appmenuButton.parentNode!=null && appmenuButton.parentNode.id != this.fx4ButtonContainer.id ){
				this.fx4ButtonContainer = appmenuButton; // button was moved OUT of its original place (ie. Movable-Fx-button add-on) 
			}
			
			//this.menubarItems.parentNode.removeChild(this.menubarItems);
			//this.homeToolbar.insertBefore(this.menubarItems, null);

			
			// keydown  event  -----------
			this.HcEvent_keydown      = new HideCaption.Hc_EventListener( document                    , "keydown"           , this, false);

			// DOMMenuBar*  events  -----------
			thySelf.DOMMenuBar_EventElem= document.getElementById( "menubar-items" );
			this.HcEvent_DMenuActive  = new HideCaption.Hc_EventListener( thySelf.DOMMenuBar_EventElem, "DOMMenuBarActive"  , this, false);
			this.HcEvent_DMenuInactive= new HideCaption.Hc_EventListener( thySelf.DOMMenuBar_EventElem, "DOMMenuBarInactive", this, false);

			
			// mouse* events -----------
			var   hot_elem_array= new Array( this.menubarItems, this.homeToolbar );
			try{
			  if( this.fx4ButtonContainer ){
				  hot_elem_array.push(this.fx4ButtonContainer);
			  }
			}catch(ex){ HideCaption.debugError("error: "+ex, ex);  }

			//adding an extra "function" layer here, allows to use "this" inside the original callback :-)
			this.hotspot_mouse_hover= new HideCaption.Hc_SpecialEvent( function(_ev, _SpecialEv){ thySelf.on_hot_mouse_hover_special(_ev,_SpecialEv); }, 'U' );
			this.hotspot_mouse_hover.for_state_active  .init(hot_elem_array, new Array("mouseenter","dragenter"));  //over //(Ie: to drag bookmarks!) 
			this.hotspot_mouse_hover.for_state_Inactive.init(hot_elem_array, new Array("mouseleave"));  // "dragleave" no anda pq se activa apenas abandono el fx but...

			
			// addListeners - ALL!!
			this.set_All_EventListeners( true );
			
			//to restore at shutdown!
			HCPlusLib.setAttribute_withBkp( this.menubarItems, "inactive", "true" );
			

			this._setInactive_now();
		},
		
		this.set_All_EventListeners=  function ( bAdd ){

			if( !bAdd ){
			    this.HcEvent_keydown.set_EventListener( bAdd );
			}

			// DOMMenuBar... events -----------
		    this.HcEvent_DMenuActive  .set_EventListener( bAdd );
		    this.HcEvent_DMenuInactive.set_EventListener( bAdd );
			

			this.hotspot_mouse_hover.setEnabled( bAdd ); // when enabled calls  setActive(false)  (active=false, so ADD-listeners to activate, and viceversa)
		},		
		
		
		this.setOptionFloatingMenu= function( _bOptionEnabled ){

			HideCaption.myDumpToConsole("       setOptionFloatingMenu( "+_bOptionEnabled+" ) ");
			
			if( !this.b_initd ){
				this.initHomeToolbar();
			}
			
			if( _bOptionEnabled ){

				this.set_All_EventListeners( true );

				// NOT on startup....
				if( (new Date().getTime() - HideCaption.opened_time)/1000 > 8 ){ // 8 secs since THIS window opened 
					
					//visual feedback :-)
					this._setActive_now();
					setTimeout( function(self){
						self._setInactive_now();
					}, 450, this);
				}
				
			}else{// !_bOptionEnabled

				// removeListeners .. etc !!!!
				this.set_All_EventListeners( false );
			}
		},

		//SHUTDOWN
		this.hc_shutdown= function() {
			try {
				HCPlusLib.myDumpToConsole(   "Home  Begin hc_shutdown()  " );
				
				// removeListeners .. etc !!!!
				this.set_All_EventListeners( false );

				if( this.menubarItems ){
					this.menubarItems.style.removeProperty("top");
					this.menubarItems.style.removeProperty("left");
				}
				
			} catch (ex) {	HCPlusLib.debugError(" Ignoring error: "+ex, ex);	}
	    },

	    //----------------------------------------------------------------

	    
		this._inactiveTimeout= null,
		this._activeTimeout= null,
		
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
            }, this._inactive_millis, this);
		},

		this._setActive=  function (aEvent) {
          if (this._inactiveTimeout) {
            clearTimeout(this._inactiveTimeout);
            this._inactiveTimeout = null;
          }

          if( this._active_millis < 1 || !aEvent || aEvent.type != "mouseenter" && aEvent.type != "dragenter" ){ // INSTANT Action! - fix menu location problem
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

		this._setInactive_now=  function () {
			if( this.menubarItems ){
				this.menubarItems.setAttribute("inactive", "true");
				// ERASE top. (only top!, bc. is defaulted to -40px offscreen)
				this.menubarItems.style.removeProperty("top");
			}
			//doing this HERE, bc it's attached to whole document!
		    this.HcEvent_keydown.removeEventListener();
			//this.hotspot_mouse_hover.setActive(false); // done inside obj...
		},
		this._setActive_now=  function (aEvent) {
			if( this.menubarItems ){
				this.menubarItems.removeAttribute("inactive"); //TODO: ?
				
	      		//adjust TOP & LEFT position
	      		var pos_topLeft= this.menu_TopLeft_floatingPos(aEvent);
	      		this.menubarItems.style.setProperty("left", pos_topLeft.X+"px", "" );
	      		this.menubarItems.style.setProperty("top" , pos_topLeft.Y+"px", "" );
			}
			//doing this HERE, bc it's attached to whole document!
		    this.HcEvent_keydown.addEventListener();
			//this.hotspot_mouse_hover.setActive(true); // done inside obj...
		},
		
		this._active_millis  =   0,
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
		};
		
//		isTarget:  function (aEvent, aTargetElement) {
//			return aEvent.target == aTargetElement;
//		},

		const MIN_WIDTH= 4;
		var anchor_lastWidth= MIN_WIDTH;
		
		this.menu_TopLeft_floatingPos  =  function (aEvent) { // detect !"home_enabled"==true for MOVABLE-customizable-FX-BUTTON
			var is_home_enabled= this.homeToolbar.getAttribute("dz_home_enabled")=="true";
			var anchorElem= this.fx4ButtonContainer && (
				  				// this.isTarget(aEvent, this.fx4ButtonContainer) || <-- detectar bien (parent search) los 2 botones, para cuando el mouse va al menu! 
								HideCaption.fx4_titlebar_enabled || 
							  	! is_home_enabled )? 
							  		this.fx4ButtonContainer: 
							  		this.homeToolbar; // .. // ago-2015: DON'T use firstChild! ("hctp-appmenu-button-container"), It was moved down for collapsed parent.
			
			const tempWidth= anchorElem.boxObject.width;
			if(   tempWidth > MIN_WIDTH ){ 
				anchor_lastWidth= tempWidth ; 
			}
			var thePos    = new HCPlusLib.Hcp_Point()
							.setX( anchorElem? (anchorElem.boxObject.x + anchor_lastWidth - 1) :1 )
							.setY( anchorElem? (anchorElem.boxObject.y + 0                          - 2) :1 );

			var pos_screenAvail    = new HCPlusLib.Hcp_Point().setX( screen.availLeft - 2 )
							                        .setY( screen.availTop  - 2 ); // substract this to adjust final value!
			var pos_menuScreenDelta= new HCPlusLib.Hcp_Point().setX( this.menubarItems.boxObject.x - this.menubarItems.boxObject.screenX )
							                        .setY( this.menubarItems.boxObject.y - this.menubarItems.boxObject.screenY );
			/*
			var pos_mainWmargin= new HCPlusLib.Hcp_Point().setX( HideCaption.get_ComputedStyle_CssValue_Float(HideCaption.mainW, "margin-left") )
							                    .setY( HideCaption.get_ComputedStyle_CssValue_Float(HideCaption.mainW, "margin-top" ) );
			// screenY var. counts also standard-caption/chromemargin!
			*/
			
			// STAY in same screen! (ie: secondary monitor) - (enforces that menu's-screenX&Y to be 0!)
			thePos.enforceMinimumValue(
							pos_screenAvail.getSum( pos_menuScreenDelta ) 
			                           );
			return thePos;
		};

		this.homeRightPos_rel=  function ( elem_ref ) {  //used in calSpaceforButtons...()
			if( elem_ref ){
				// 2017: el checkeo de [width > 1] soluciona un FEROZ BUG cuando el Fx-but esta DESHABILITADO y Fx esta en el monitor secundario a la IZQUIERDA, pq screenX *MIENTE* con 'display:none' !!
				return this.homeToolbar && this.homeToolbar.boxObject.width > 1 ?
				      (this.homeToolbar.boxObject.screenX - elem_ref.boxObject.screenX + this.homeToolbar.boxObject.width - 1):
				       1;
			}else{ // ! elem_ref
				return this.homeToolbar?
						(this.homeToolbar.boxObject.x + this.homeToolbar.boxObject.width - 1):
						1;
			}
		};
		
		
		this.isDomActive= false; /**  isMous_Over: false, --->  using  this.hotspot_mouse_hover  **/

		// mouse section -------------------------------------
        this.mouse_activate= function(event, bActive){
        	this.hotspot_mouse_hover.setActive(bActive);
        	
        	this.on_hot_mouse_hover_special(event, this.hotspot_mouse_hover);
        };
		
		this.on_hot_mouse_hover_special= function(event, _hotspot_mouse_hover){
			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");
			if( _hotspot_mouse_hover.isActive() ){ //active
				this._setActive(event);
			}else{ //NOT active
				if(this.isDomActive)
					return;
				this._setInactive_Async();
			}
		};

		

        this.handleEvent= function (event) {

		  //HideCaption.myDumpToConsole("       HomeToolbar.handleEvent() event.type="+event.type+" --> "+event.target.id);
		  
          switch (event.type) {
            case "DOMMenuBarActive":
				// xHideCaption.TopRightBar_Handler.handleEvent(event); // call for topRight buttons!
				
				this.isDomActive= true;
				this._setActive(event);
              break;
            case "DOMMenuBarInactive":
				// xHideCaption.TopRightBar_Handler.handleEvent(event); // call for topRight buttons!
				
				this.isDomActive= false;
				if(this.hotspot_mouse_hover.isActive())
					break;
				//if (!this._contextMenuListener.active) ...
  				this._setInactive_now();
				
				  //should bring this logic from toolbars.js!
				  //this.contextMenu.removeEventListener("popuphiding", this, false);
				  //this.contextMenu.removeEventListener("popupshown", this, false);
				  //this.contextMenu = null;
              break;
              
            case "keydown":
              if (event.keyCode == event.DOM_VK_ESCAPE){
  				this._setInactive_now();
  				if( this.hotspot_mouse_hover.isActive() ){ // ESC key is for me only! :-)
  					this.hotspot_mouse_hover.setActive( false ); // avoid blocking ESC when over hometoolbar ...
  					
  	    			//HideCaption.myDumpToConsole("     preventDefault() .. etc  ");
  		            event.stopPropagation();
  		            event.preventDefault();
  				}
              } 
              break;
          }
        };
};


