


HideCaption.LoaderXUL = {
	
	
	LOAD_XUL_DOCUMENT :  function( the_unloaders ){
			
			if( !document.getElementById( "hcp-root-box" ) ){
				this.xul_onLoad(HideCaption.XUL_main_overlay_doc, the_unloaders);
			}else{
				HCPlusLib.debugError(" ignored error:  repetitive? call to load-over ");

				// me parece qno, pq ya hizo de nuevo todos los new xxx;  --->  return; // RETURN!
			}
	},

	
	xul_onLoad :  function(xul_document, the_unloaders) {

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

			
		    function overlay_styleSheets(){
				
				for( var nn = xul_document.firstChild; nn; nn = nn.nextSibling ) {
					if( nn.nodeType == nn.PROCESSING_INSTRUCTION_NODE ) {
						//console.log(" node: " + nn.data, nn);
						if( nn.nodeName == "xml-stylesheet" && (""+nn.nodeValue).indexOf("chrome://HideCaptionTb") >= 0 ){
							//console.log(" style hc3: "+nn.data);
							
							var nnFree= document.importNode( nn , true );
							document.insertBefore( nnFree, HideCaption.mainW );
							
							//for the_unloaders ...
							elemList.push( nnFree );
						}
					}
				};
		    };
			

		    function overlayNode( elem, strGap, targetParent){

		    	let target= elem.id? document.getElementById( elem.id ): null; 
				
				/**
		    	if( elem.nodeType == elem.ELEMENT_NODE && elem.tagName.toLowerCase() == "hctp_special_palette" ){

					if( HCPlusLib.HcSingleton.get_CustomizableUI() ) {
						
						HCPlusLib.myDumpToConsole( "Skipping: " + strGap + "  "+elem.tagName+"   id="+elem.id );
						return;
					}else{
						// old code, eg. PALEMOON !!
						target= window.gNavToolbox.palette;
					}
		    	}
				**/
				
				/**
		    	if( target == null && elem.id == "BrowserToolbarPalette" && window.gNavToolbox.palette && window.gNavToolbox.palette.id == elem.id ){ // check PALETTE!
		    		target= window.gNavToolbox.palette;
		    	}
				**/
				
				
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
		    
			
		    // 1ST! stylesheets!!
		    overlay_styleSheets();
			
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

			/**
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
			**/
			
	},  // xul_onLoad

	
};

