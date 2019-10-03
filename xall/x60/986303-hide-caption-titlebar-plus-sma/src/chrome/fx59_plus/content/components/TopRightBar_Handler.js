
"use strict";

// australis

var EXPORTED_SYMBOLS = ["TopRightBar_Handler_class"];


var TopRightBar_Handler_class= function( _win ){

	const window      = _win;
	const document    = window.document;
	const setTimeout  = window.setTimeout;
	const clearTimeout= window.clearTimeout;
	const parseInt    = window.parseInt;
	const parseFloat  = window.parseFloat;
	
	const HCPlusLib   = window.HCPlusLib;
	const HideCaption = window.HideCaption;


	const thySelf= this;
	
	//------------------------------------------
	

		this.mainBar = null,
	
		this.HcEvent_keydown= null,
		
		this.b_initd= false,
	
		this.init= function(){
			
			if( this.b_initd ){
				return;
			}
			this.b_initd = true;
			

			this.mainBar   = document.getElementById( "hcp-rightbar-fixed" );  //"hctp-controls-top-fixed"
			
			// keydown  event  -----------
			this.HcEvent_keydown      = new HideCaption.Hc_EventListener( document                    , "keydown"           , this, false);

			// DOMMenuBar*  events  -----------
			thySelf.DOMMenuBar_EventElem= document.getElementById( "menubar-items" );
			this.HcEvent_DMenuActive  = new HideCaption.Hc_EventListener( thySelf.DOMMenuBar_EventElem, "DOMMenuBarActive"  , this, false);
			this.HcEvent_DMenuInactive= new HideCaption.Hc_EventListener( thySelf.DOMMenuBar_EventElem, "DOMMenuBarInactive", this, false);

			
			// mouse* events -----------
			var hot_elem_array= new Array( this.mainBar );

			//adding an extra "function" layer here, allows to use "this" inside the original callback :-)
			this.hotspot_mouse_hover= new HideCaption.Hc_SpecialEvent( function(_ev, _SpecialEv){ thySelf.on_hot_mouse_hover_special(_ev,_SpecialEv); }, 'M' );
			this.hotspot_mouse_hover.for_state_active  .init(hot_elem_array, new Array("mouseenter"));  //over
			this.hotspot_mouse_hover.for_state_Inactive.init(hot_elem_array, new Array("mouseleave"));  //out

			
			// addListeners - ALL!!
			this.set_All_EventListeners( true );
		    
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

		
		this.bOptionFloatingButtons= true,
		this.setOptionFloatingButtons= function( _bOptionEnabled ){
			this.bOptionFloatingButtons= _bOptionEnabled;

			HideCaption.myDumpToConsole("       setOptionFloatingButtons( "+_bOptionEnabled+" ) ");
			
			if( !this.b_initd ){
				this.init();
			}
			
			if( _bOptionEnabled ){

				this.set_All_EventListeners( true );

				//visual feedback :-)
				this._setActive_now();
				setTimeout( function(self){
					self._setInactive_now();
				}, 450, this);

			}else{// !_bOptionEnabled

				// removeListeners .. etc !!!!
				this.set_All_EventListeners( false );
			}
		},

		//SHUTDOWN
		this.hc_shutdown= function() {
			try {
				HCPlusLib.myDumpToConsole(   "TopRight  Begin hc_shutdown()  " );

				// removeListeners .. etc !!!!
				this.set_All_EventListeners( false );
				
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
			return; // RETURN!! - Darth Madara: FIX for BUG when 2 equal events comes together!!!
		  }
          this._inactiveTimeout = setTimeout(function (self) {
	            //if (self.getAttribute("autohide") == "true") {
	              self._inactiveTimeout = null;
	              self._setInactive_now();
	            //}
          	}, this._inactive_millis, this);
		},

		this._setActive=  function (aEvent) {
		  if( ! this.bOptionFloatingButtons ){ // ! this.bCollapsedMain <-- NOT used for micro detection anymore
			return;
		  }
		  // do it
          if (this._inactiveTimeout) {
            clearTimeout(this._inactiveTimeout);
            this._inactiveTimeout = null;
          }
          
          if( this._active_millis < 1 || !aEvent || aEvent.type != "mouseenter" ){ // INSTANT Action! for keypress, DomMenubarActive, etc
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
			if( this.mainBar ){		this.mainBar.setAttribute("specialFixedPos", "false");	}
			this.HcEvent_keydown.removeEventListener();
		},
		this._setActive_now=  function () {
			if( this.mainBar ){		this.mainBar.setAttribute("specialFixedPos", "true" );	}
			this.HcEvent_keydown.addEventListener();
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
		},
		
		
//		bCollapsedMain: false,
//		setCollapsedMain: function(_bCollapsedMain){
//			this.bCollapsedMain= _bCollapsedMain;
//		},
		

		this.isDomActive= false, /**  isMous_Over: false, --->  using  this.hotspot_mouse_hover  **/
		
		this.on_hot_mouse_hover_special= function(event, _hotspot_mouse_hover){
			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");
			if( _hotspot_mouse_hover.isActive() ){ //active
				this._setActive(event);
			}else{ //NOT active
				if(this.isDomActive)
					return;
				this._setInactive_Async();
			}
		},

        this.handleEvent= function (event) {
		  
		  //HideCaption.myDumpToConsole("       topRight.handleEvent() event.type="+event.type+" --> "+event.target.id);
		  
          switch (event.type) {

            case "DOMMenuBarActive":
				this.isDomActive= true;
				this._setActive(event);
              break;
            case "DOMMenuBarInactive":
				this.isDomActive= false;
  				if( this.hotspot_mouse_hover.isActive() )
					break;
				this._setInactive_Async();
			  
				  //this.contextMenu.removeEventListener("popuphiding", this, false);
				  //this.contextMenu.removeEventListener("popupshown", this, false);
				  //this.contextMenu = null;
              break;
			 
            case "keydown":
    			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");
                if (event.keyCode == event.DOM_VK_ESCAPE){
    				this._setInactive_now();
      				if( this.hotspot_mouse_hover.isActive() ){ // ESC key is for me only! :-)
      					this.hotspot_mouse_hover.setActive( false ); // avoid blocking ESC when over TopRightBar ...
      					
    	    			//HideCaption.myDumpToConsole("     preventDefault() .. etc  (TopRightBar)");
    		            event.stopPropagation();
    		            event.preventDefault();
    				}
                } 
			  break;
          }
        },
        
        this.dummy= null; // END of 'class'
}; 
//end  TopRightBar_Handler

