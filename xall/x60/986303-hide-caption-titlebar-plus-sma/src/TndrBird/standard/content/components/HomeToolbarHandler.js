

HideCaption.HomeToolbarHandler= {
	
		DOMMenuBar_EventElem: null,
		
		menubarItems: null,
		homeToolbar : null,
		
		fx4ButtonContainer: null,
	
		HcEvent_keydown: null,
		
		b_initd: false,
		
		initHomeToolbar: function(){
			
			if( this.b_initd ){
				return;
			}
			this.b_initd = true;
			
			
		    //document.addEventListener("keydown" , this, false);
			this.HcEvent_keydown= new HideCaption.Hc_EventListener(document, "keydown", this, false),
			
			this.DOMMenuBar_EventElem= document.getElementById( "menubar-items" );
			
			this.menubarItems= document.getElementById( "menubar-items" );
			this.homeToolbar = document.getElementById( "hctp-appmenu-button-container"  ); // NOT using ...-fixed here  bc the subparent's appearance make it width=3px

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
			
			
			const thySelf= this;
			
			// Si aca defino solo un "set_All_EventListeners" local, sin el [thySelf], me da error de [this.DOMMenuBar_EventElem undefined]
			thySelf.set_All_EventListeners= function( bAdd ){

				if( !bAdd ){
					if( this.HcEvent_keydown ){
						this.HcEvent_keydown.set_EventListener( bAdd );
					}
				}

				// ---- menu active!!
				
				HideCaption.set_EventListener( bAdd, this.DOMMenuBar_EventElem, "DOMMenuBarActive"  , this, false);
				HideCaption.set_EventListener( bAdd, this.DOMMenuBar_EventElem, "DOMMenuBarInactive", this, false);
				
				HideCaption.set_EventListener( bAdd, this.menubarItems, "mouseover", this, false);
				HideCaption.set_EventListener( bAdd, this.menubarItems, "mouseout" , this, false);
				
				HideCaption.set_EventListener( bAdd, this.homeToolbar, "mouseover", this, false);
				HideCaption.set_EventListener( bAdd, this.homeToolbar, "mouseout" , this, false);


				try{
				  if( this.fx4ButtonContainer ){
					  HideCaption.set_EventListener( bAdd, this.fx4ButtonContainer, "mouseover", this, false);
					  HideCaption.set_EventListener( bAdd, this.fx4ButtonContainer, "mouseout" , this, false);
				  }
				}catch(ex){ HideCaption.debugError("error: "+ex, ex);  }
			}
			
			thySelf.set_All_EventListeners( true );

			
			// UNLOADERS ------------------------------ 
		    HideCaption.unloaders.push(function() {
				thySelf.set_All_EventListeners( false );  // HomeTBar...
				
				thySelf.menubarItems.style.removeProperty("left");
	    	});
			
			// just to restore at shutdown
			HCPlusLib.setAttribute_withBkp( this.menubarItems, "inactive", "true");
			
			this._setInactive();
			
			//document.getElementById( "hctp-fx-homebutton" ).addEventListener("click", function(event){
			//		document.getElementById("file-menu").dispatchEvent(event);
			//	}, false);
		},
		

		_inactiveTimeout: null,
		_activeTimeout: null,
		
		_setInactive_Async:  function () {
          if (this._activeTimeout) {
              clearTimeout(this._activeTimeout);
              this._activeTimeout = null;
          }
          if (this._inactiveTimeout) {
			return; // RETURN!! - Darth Madara: FIX for *potential* BUG when 2 equal events comes together!!! (happened with mouseout in mmcButtons!)
		  }
          this._inactiveTimeout = setTimeout(function (self) {
	            //if (self.getAttribute("autohide") == "true") {
	              self._inactiveTimeout = null;
	              self._setInactive();
	            //}
            }, this._inactive_millis, this);
		},

		_setActive:  function (aEvent) {
          if (this._inactiveTimeout) {
            clearTimeout(this._inactiveTimeout);
            this._inactiveTimeout = null;
          }

		  /* duplicated and stucked menu problem when I do ie.:  ALT+F  R  (to restart)
		  if( this.menubarItems.getAttribute("inactive") == "true" ){
			HideCaption.timeDelayed( function(){
			  var menuToOpen= document.getElementById('tools-menu');
			  if( menuToOpen ){ menuToOpen.open = true; }
			}, 1);
		  }
		  */

          if( this._active_millis < 1 || !aEvent || aEvent.type != "mouseover" ){ // INSTANT Action! - fix menu location problem
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

		_setInactive:  function () {
			if( this.menubarItems ){
				this.menubarItems.setAttribute("inactive", "true");
				// ERASE top. (only top!, bc. is defaulted to -40px offscreen)
				this.menubarItems.style.removeProperty("top");
			}
			//doing this HERE, bc it's attached to whole document!
		    this.HcEvent_keydown.removeEventListener();
		},
		_setActive_now:  function (aEvent) {
			if( this.menubarItems ){
				this.menubarItems.removeAttribute("inactive"); //TODO: ?
				
	      		//adjust TOP & LEFT position
	      		var pos_topLeft= this.menu_TopLeft_floatingPos(aEvent);
	      		this.menubarItems.style.setProperty("left", pos_topLeft.X+"px", "" );
	      		this.menubarItems.style.setProperty("top" , pos_topLeft.Y+"px", "" );
			}
			//doing this HERE, bc it's attached to whole document!
		    this.HcEvent_keydown.addEventListener();
		},
		
		_active_millis  :   0,
		_inactive_millis: 100,

		setActive_millis:  function (_millis) {
			if(_millis> 2000){ _millis= 2000;}
			if(_millis<    0){ _millis=    0;}
			
			this._active_millis  = parseInt(_millis);
		},
		setInactive_millis:  function (_millis) {
			if(_millis> 2000){ _millis= 2000;}
			if(_millis<    0){ _millis=    0;}
			
			this._inactive_millis= parseInt(_millis);
		},
		
//		isTarget:  function (aEvent, aTargetElement) {
//			return aEvent.target == aTargetElement;
//		},

		menu_TopLeft_floatingPos  :  function (aEvent) { // detect !"home_enabled"==true for MOVABLE-customizable-FX-BUTTON
			var is_home_enabled= HideCaption.mainW.getAttribute("dz_home_enabled")=="true";
			var anchorElem= this.fx4ButtonContainer && (
				  				// this.isTarget(aEvent, this.fx4ButtonContainer) || <-- detectar bien (parent search) los 2 botones, para cuando el mouse va al menu! 
								HideCaption.fx4_titlebar_enabled || 
							  	! is_home_enabled )? 
							  		this.fx4ButtonContainer: 
							  		this.homeToolbar; // an anchor like openPopup()'s one ...
			var thePos    = new HCPlusLib.Hcp_Point()
							.setX( anchorElem? (anchorElem.boxObject.x + anchorElem.boxObject.width - 0) :1 )
							.setY( anchorElem? (anchorElem.boxObject.y + 0                          - 2) :1 );

			var pos_screenAvail    = new HCPlusLib.Hcp_Point().setX( screen.availLeft - 2 )
							                        .setY( screen.availTop  - 2 ); // substract this to adjust final value!
			var pos_menuScreenDelta= new HCPlusLib.Hcp_Point().setX( this.menubarItems.boxObject.x - this.menubarItems.boxObject.screenX )
							                        .setY( this.menubarItems.boxObject.y - this.menubarItems.boxObject.screenY );
			/*
			var pos_mainWmargin= new HCPlusLib.Hcp_Point().setX( HideCaption.get_ComputedStyle_CssValue_Float(HideCaption.mainW, "margin-left") )
							                    .setY( HideCaption.get_ComputedStyle_CssValue_Float(HideCaption.mainW, "margin-top" ) );
			// screenY var. counts also standard-caption/chrxxemargin!
			*/
			
			// STAY in same screen! (ie: secondary monitor) - (enforces that menu's-screenX&Y to be 0!)
			thePos.enforceMinimumValue(
							pos_screenAvail.getSum( pos_menuScreenDelta ) 
			                           );
			return thePos;
		},
		homeRightPos:  function () {  //used in calSpaceforButtons...()
			return this.homeToolbar?
						(this.homeToolbar.boxObject.x + this.homeToolbar.boxObject.width - 1):
						1;
		},
		
		setOptionFloatingMenu: function(_bOptionFloatingMenu){
			if( !this.b_initd ){
				this.initHomeToolbar();
			}

			//visual feedback :-)
			this._setActive_now();
			//this.menubarItems.removeAttribute("inactive"); 
			setTimeout( function(self){
				self._setInactive();
				//self.menubarItems.setAttribute("inactive", "true" );
			  }, 450, this);
		},
		
		isDomActive: false, isMouseOver: false,
		
        handleEvent: function (event) {

		  //HideCaption.myDumpToConsole("       HomeToolbar.handleEvent() event.type="+event.type+"  - "+event.target.id);
		  
          switch (event.type) {
            case "DOMMenuBarActive":
				// --- HideCaption.TopRightBar_Handler.handleEvent(event); // call for topRight buttons!
				
				this.isDomActive= true;
				this._setActive(event);
				
              //this.toolbar.removeEventListener("mousemove", this, false);
              break;
            case "DOMMenuBarInactive":
				// --- HideCaption.TopRightBar_Handler.handleEvent(event); // call for topRight buttons!
				
				this.isDomActive= false;
				if(this.isMouseOver)
					break;
				//if (!this._contextMenuListener.active){
					this._setInactive_Async();
				//}
			  
				  //this.toolbar.removeEventListener("mousemove", this, false);
				  //this.contextMenu.removeEventListener("popuphiding", this, false);
				  //this.contextMenu.removeEventListener("popupshown", this, false);
				  //this.contextMenu = null;
              break;
			 
			 //for Home toolbar here!
            case "mouseover":
    			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");
				this.isMouseOver= true;
				this._setActive(event);
			  break;
            case "mouseout":
    			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");
				this.isMouseOver= false;
				if(this.isDomActive)
					break;
				this._setInactive_Async();
			  break;
            case "keydown":
				//now has it's own dynamic-activated handler!!! -- HideCaption.TopRightBar_Handler.handleEvent(event); // call for topRight buttons!
				
    			//HideCaption.myDumpToConsole("       event.type="+event.type+"   event.target.id="+event.target.id+"");
                if (event.keyCode == event.DOM_VK_ESCAPE){
    				this._setInactive();
    				if( this.isMouseOver ){ // ESC key is for me only! :-)
    					this.isMouseOver = false; // avoid blocking ESC when over hometoolbar ...
    	    			//HideCaption.myDumpToConsole("     preventDefault() .. etc  ");
    		            event.stopPropagation();
    		            event.preventDefault();
    				}
                } 
			  break;
          }
        },
		
        create_activate_Event: function () {
			/*
			//DOMFocusIn  DOMFocusOut  DOMActivate
			
			var activEvt= document.createEvent("KeyboardEvent");
			activEvt.initKeyEvent(
                 "keyup",        //  in DOMString typeArg,
				  true,			//  in boolean canBubbleArg,
                  true,             //  in boolean cancelableArg,
                  null,             //  in nsIDOMAbstractView viewArg,  Specifies UIEvent.view. This value may be null.
                  false,            //  in boolean ctrlKeyArg,
                  false,            //  in boolean altKeyArg,
                  false,            //  in boolean shiftKeyArg,
                  false,            //  in boolean metaKeyArg,
                   activEvt.VK_ALT,               //  in unsigned long keyCodeArg,
                   0);              //  in unsigned long charCodeArg);      			
			
			//DOMMenuBarActive
			var activEvt= document.createEvent("UIEvents");
			activEvt.initUIEvent("DOMMenuBarActive", true, false, null, {detail:1}); 
			var menubarItems= document.getElementById( "main-menubar" ).firstChild;
			menubarItems.dispatchEvent(activEvt);
			//gBrowser.dispatchEvent(activEvt);
			
			*/
		}
    	//, END of 'class'
};
	
	