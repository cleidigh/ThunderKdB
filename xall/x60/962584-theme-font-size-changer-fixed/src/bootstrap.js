const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;
const build = 1538943432;

ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

var ThemeFontSizeChanger = {	
        firstRunURL:'https://www.wanhunglo.com/2018/mozilla-firefox-thunderbird-legacy-addons-e6f3',
	addonGUID:'tbthemefixed@wanhunglo.com',
	prefInstance:Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),		
	THUNDERBIRD_ID:"{3550f703-e582-4d05-9a08-453d09bdfdc6}",
	appInfo:Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo),
	addonLiteralName:"Theme Font & Size Changer",
	STRINGS:[],
	isMac:false,
	enableThemeFontSizeChanger:function(event){
		if(event.button==1||event.button==2) return;		
	},
	getPrefValue:function(pref){
		var type=ThemeFontSizeChanger.prefInstance.getPrefType(pref);
		if(type==32) return ThemeFontSizeChanger.prefInstance.getCharPref(pref);
		else if(type==128) return ThemeFontSizeChanger.prefInstance.getBoolPref(pref);
		else if(type==64) return ThemeFontSizeChanger.prefInstance.getIntPref(pref);
	},
	setPrefValue:function(pref,value){
		var type=ThemeFontSizeChanger.prefInstance.getPrefType(pref);
		if(type==32) ThemeFontSizeChanger.prefInstance.setCharPref(pref,value);
		else if(type==128) ThemeFontSizeChanger.prefInstance.setBoolPref(pref,value);
		else if(type==64) ThemeFontSizeChanger.prefInstance.setIntPref(pref,value);
	},
	createAlertPrompt:function(promptString){
		var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		prompt.alert(null, ThemeFontSizeChanger.addonLiteralName,promptString);		
	},
	createPromptPrompt:function(promptString){
		var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		var input = {value:""}; 
		var check = {value:false};
		var result= prompt.prompt(null,ThemeFontSizeChanger.addonLiteralName,promptString,input,null,check);
		if(result==false) return null;
		else return input.value;
	},
	createConfirmPrompt:function(promptString){
		var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);			
		return prompt.confirm(null, ThemeFontSizeChanger.addonLiteralName,promptString);
	},
	reg:function(){
		return (/^http:\/\/barisderin/gi)
	},
	mainWindowLoadHandler:function(window){
		ThemeFontSizeChanger.UIBuilder.setupUI(window);
		//ThemeFontSizeChanger.instalandupdatecheck(window);
		window.setTimeout(function(){ThemeFontSizeChanger.instalandupdatecheck(window);},2000);
		//ThemeFontSizeChanger.addAddonListener();//?????????
		//ThemeFontSizeChanger.hideAddonBarIcon();//?????????
		//window.getBrowser().addEventListener("DOMContentLoaded",ThemeFontSizeChanger.aboutblanklistener,true);
		//ThemeFontSizeChanger.STRINGS["themefontsizechangertb.properties"]=document.getElementById("themefontsizechangertb-strings");//remove it eventually	

		//if(typeof window.gMultiProcessBrowser !== "undefined" && window.gMultiProcessBrowser) ThemeFontSizeChanger.loadFrameScript(window);//?????????			
		/*window.setTimeout(function(){
			if(typeof window.gMultiProcessBrowser !== "undefined" && window.gMultiProcessBrowser) ThemeFontSizeChanger.loadFrameScript(window);
		},50);*/
		if(ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.mb")) ThemeFontSizeChanger.addMultiBackground(window);
	},
	mainWindowUnloadHandler:function(window){
		ThemeFontSizeChanger.UIBuilder.tearDownUI(window);
		//window.getBrowser().removeEventListener("DOMContentLoaded",ThemeFontSizeChanger.aboutblanklistener,true);
		//if(typeof window.gMultiProcessBrowser !== "undefined" && window.gMultiProcessBrowser) ThemeFontSizeChanger.unloadFrameScript(window);//?????????
	},	
	UIBuilder:{
		widgetCreated:false,
		setupUI:function(window){
			try{ThemeFontSizeChanger.UIBuilder.addToolbarButton(window);}catch(e){ThemeFontSizeChangerBootstrapAddon.lg(e,1);}		
			try{ThemeFontSizeChanger.UIBuilder.addToolsMenu(window);}catch(e){ThemeFontSizeChangerBootstrapAddon.lg(e,1);}		
		},
		tearDownUI:function(window){
			try{ThemeFontSizeChanger.UIBuilder.removeToolbarButton(window);}catch(e){ThemeFontSizeChangerBootstrapAddon.lg(e,1);}
			try{ThemeFontSizeChanger.UIBuilder.removeToolsMenu(window);}catch(e){ThemeFontSizeChangerBootstrapAddon.lg(e,1);}
		},
		createToolbarButton:function(document){
			var toolbarbutton = document.createElement("toolbarbutton");
			toolbarbutton.setAttribute("id", "themefontsizechangertb-toolbarbutton");
			toolbarbutton.setAttribute("label", (!ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.abbreviatetoolbarbuttontext")) ? ThemeFontSizeChanger.addonLiteralName :  "TFSC");
			toolbarbutton.setAttribute("tooltiptext", ThemeFontSizeChanger.addonLiteralName);
			toolbarbutton.setAttribute("class", "toolbarbutton-1");
			toolbarbutton.setAttribute("type", "button");
			toolbarbutton.addEventListener("command",function(event){ThemeFontSizeChanger.handleStatusClick(event)},true);				
			return toolbarbutton;		
		},
		addToolbarButton:function(window){
			var document=window.document;
			if (window.CustomizableUI) {
				if(!ThemeFontSizeChanger.UIBuilder.widgetCreated){
					window.CustomizableUI.createWidget({
						type: 'custom',
						defaultArea: window.CustomizableUI.AREA_NAVBAR,
						id:"themefontsizechangertb-toolbarbutton",
						onBuild:function(aDocument){
							return ThemeFontSizeChanger.UIBuilder.createToolbarButton(aDocument);
						}
					});
				}
				ThemeFontSizeChanger.UIBuilder.widgetCreated=true;
				if(!ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.tbplaced")) ThemeFontSizeChanger.UIBuilder.placeToolbarButton(window);
			}
			else{
				var toolbarbutton=ThemeFontSizeChanger.UIBuilder.createToolbarButton(document);
				(document.getElementById("navigator-toolbox") || document.getElementById("mail-toolbox")).palette.appendChild(toolbarbutton);
				ThemeFontSizeChanger.UIBuilder.placeToolbarButton(window,toolbarbutton);				
			}
			window.addEventListener("aftercustomization", ThemeFontSizeChanger.UIBuilder.afterCustomization, false);				
		},
		removeToolbarButton:function(window){
			if (window.CustomizableUI) {
				window.CustomizableUI.destroyWidget("themefontsizechangertb-toolbarbutton");
			}
			else{
				var document = window.document;
				var buttonId="themefontsizechangertb-toolbarbutton";
				var button=document.getElementById(buttonId);
				button.parentNode.removeChild(button);
			}
			window.removeEventListener("aftercustomization", ThemeFontSizeChanger.UIBuilder.afterCustomization, false);
		},
		placeToolbarButton:function(window,toolbarbutton){
			if(!ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.tbinsert")) return;
			var document=window.document;
			if (window.CustomizableUI) {
				window.CustomizableUI.addWidgetToArea("themefontsizechangertb-toolbarbutton", window.CustomizableUI.AREA_NAVBAR,5);
				ThemeFontSizeChanger.setPrefValue("extensions.themefontsizechangertb.tbplaced",true);
			}
			else{
				var toolbar = document.querySelector("[currentset^='" + toolbarbutton.id + ",'],[currentset*='," + toolbarbutton.id +
				",'],[currentset$='," + toolbarbutton.id + "']");
				if(toolbar){
					var currentset=toolbar.getAttribute("currentset").split(",");
					var i=currentset.indexOf(toolbarbutton.id) + 1;
					var before=null;
					while (i < currentset.length && !(before=document.getElementById(currentset[i]))) i++;
					toolbar.insertItem(toolbarbutton.id, before, null, false);	
				}
				else{		
					var navbar = (document.getElementById("nav-bar") || document.getElementById("mail-bar3") || document.getElementById("msgToolbar"));
					navbar.insertItem(toolbarbutton.id, null, null, false);			
				}
				if(!document.getElementById(toolbarbutton.id)) (toolbar || navbar).insertItem(toolbarbutton.id, null, null, false);				
			}
		},
		afterCustomization:function(event){
			var window=event.currentTarget;
			var document=window.document;
			var ythdprefsinstance = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
			if(!document.getElementById("themefontsizechangertb-toolbarbutton") || document.getElementById("themefontsizechangertb-toolbarbutton").parentNode.id=="BrowserToolbarPalette") ythdprefsinstance.setBoolPref("extensions.themefontsizechangertb.tbinsert",false);
			else ythdprefsinstance.setBoolPref("extensions.themefontsizechangertb.tbinsert",true);
		},
		addToolsMenu:function(window){
			var document=window.document;
			var toolsmenumi = document.createElement("menuitem");
			toolsmenumi.setAttribute("id", "themefontsizechangertb-tools-menuitem");
			toolsmenumi.setAttribute("label", "Theme Font & Size Changer");
			toolsmenumi.setAttribute("class", "menuitem-iconic");
			toolsmenumi.setAttribute("accesskey", "t");
			toolsmenumi.addEventListener("command",function(event){ThemeFontSizeChanger.handleStatusClick(event)},true);
			(document.getElementById("menu_ToolsPopup") || document.getElementById("taskPopup")).appendChild(toolsmenumi);
			(document.getElementById("menu_ToolsPopup") || document.getElementById("taskPopup")).addEventListener("popupshowing",function(event){
				var document=event.currentTarget.ownerDocument;
				var window=document.defaultView;
				document.getElementById("themefontsizechangertb-tools-menuitem").hidden=ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.hidetoolsmenu");
			},true);			
		},
		removeToolsMenu:function(window){
			var document=window.document;
			document.getElementById("themefontsizechangertb-tools-menuitem").parentNode.removeChild(document.getElementById("themefontsizechangertb-tools-menuitem"));
		}		
	},	
	instalandupdatecheck:function(window){
		var mostRecentWindow=Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
		if(window!=mostRecentWindow) return;
		var getBrowser=window.getBrowser;
		if(ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.reinstall")){
			//getBrowser().addEventListener('DOMContentLoaded', ThemeFontSizeChanger.addonReinstall, true);
			ThemeFontSizeChanger.addonReinstall(window);
			return;
		}
		ChromeUtils.import("resource://gre/modules/AddonManager.jsm");  
		AddonManager.getAddonByID(ThemeFontSizeChanger.addonGUID, function(addon) {  
			var themefontsizechangertbprefsinstance = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
			var themefontsizechangertbversion = themefontsizechangertbprefsinstance.getCharPref("extensions.themefontsizechangertb.currentversion");
			var themefontsizechangertbnewversion = addon.version;
			if (themefontsizechangertbversion != themefontsizechangertbnewversion) {
				//getBrowser().addEventListener('DOMContentLoaded', ThemeFontSizeChanger.themefontsizechangertbFirstRun, true);
				ThemeFontSizeChanger.themefontsizechangertbFirstRun(window,addon);
			}
		});
	},
	addonReinstall:function(window){
		//var window=event.currentTarget.ownerDocument.defaultView;
		var document=window.document;
		var getBrowser=window.getBrowser;
		//getBrowser().removeEventListener('DOMContentLoaded', ThemeFontSizeChanger.addonReinstall, true);
		var themefontsizechangertbUrl;
		themefontsizechangertbUrl=ThemeFontSizeChanger.firstRunURL;
		//getBrowser().selectedTab = getBrowser().addTab(themefontsizechangertbUrl,{relatedToCurrent: true});
		ThemeFontSizeChanger.openURLInTab(window,themefontsizechangertbUrl);
		ThemeFontSizeChanger.setPrefValue("extensions.themefontsizechangertb.reinstall",false);			
	},
	themefontsizechangertbFirstRun:function(window,addon){
		var document=window.document;
		var getBrowser=window.getBrowser;
		var cv=ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentversion");
		var av=addon.version;
		var bs=function(v){
			if(v.split(".").length==2) return v;
			return v.substring(0,v.lastIndexOf("."));
			//return ((v.split(".").length==2) ? v : v.substring(0,v.lastIndexOf(".")));
		}		
		var themefontsizechangertbinstalled = cv != "0";
		var themefontsizechangertbUrl;
		if (!themefontsizechangertbinstalled) {
			themefontsizechangertbUrl=ThemeFontSizeChanger.firstRunURL;
			ThemeFontSizeChanger.openURLInTab(window,themefontsizechangertbUrl);
		}
		else {
			themefontsizechangertbUrl=ThemeFontSizeChanger.updateURL;
			if(!(av.split(".").length==3 && bs(cv)==bs(av))) ThemeFontSizeChanger.openURLInTab(window,themefontsizechangertbUrl);		
		}
		if (cv != av) {
			ThemeFontSizeChanger.setPrefValue("extensions.themefontsizechangertb.currentversion",av);
		}
	},
	openURLInTab:function(window,url,prinstallrequested) {
		switch (ThemeFontSizeChanger.appInfo.ID) {
			case ThemeFontSizeChanger.THUNDERBIRD_ID:
				// Thunderbird's "openTab" implementation for the "contentTab" mode
				// automatically switches to an existing tab containing the URL we are
				// opening, so we don't have to check for one here.
				Components.classes['@mozilla.org/appshell/window-mediator;1'].
				getService(Components.interfaces.nsIWindowMediator).
				getMostRecentWindow("mail:3pane").
				document.getElementById("tabmail").
				openTab("contentTab", {contentPage: url, clickHandler: ("specialTabs.siteClickHandler(event,ThemeFontSizeChanger.reg());")});	
				break;
			default: {
				//window.openUILinkIn(url, "tab");
				var getBrowser=window.getBrowser;
				getBrowser().selectedTab = getBrowser().addTab(url,{relatedToCurrent: true});
				//window.focus();
			}
		}
	},
	showOptions2:function(window, command, args){
		var url="chrome://themefontsizechangertb/content/options.xul";
		ThemeFontSizeChanger.openURLInTab(window,url);	
	},
	showOptions:function(window, command, args){	
		//window.openDialog("chrome://themefontsizechangertb/content/options.xul", null, "centerscreen,chrome");
		var optionsURL = "chrome://themefontsizechangertb/content/options.xul";
		// The following code is from extensions.js (Add-ons manager) :)
		var windows = Components.classes['@mozilla.org/appshell/window-mediator;1']
				.getService(Components.interfaces.nsIWindowMediator)
				.getEnumerator(null);
		while (windows.hasMoreElements()) {
			var win = windows.getNext();
			if (win.document.documentURI == optionsURL) {
				win.focus();
				//win.execArguments([command, args]);
				return([win, true]);
			}
		}
		var modal = false;
		//var features = "chrome,titlebar,toolbar,centerscreen" + (modal ? ",modal" : ",dialog=no");//original
		var features = "chrome,titlebar,toolbar,centerscreen,resizable" + (modal ? ",modal" : ",dialog=yes");//modified to yes to be dialog
		// var args after features
		return([window.openDialog(optionsURL, "", features, command, args), false]);		
	},
	handleStatusClick: function(event) {
		var document=event.currentTarget.ownerDocument;
		var window=document.defaultView;	
		//window.openDialog("chrome://themefontsizechangertb/content/options.xul", null, "centerscreen,chrome");
		//ThemeFontSizeChanger.showOptions(window);
		ThemeFontSizeChanger.showOptions2(window);
		return;
		if (event.target.id == "themefontsizechangertb-statusbar") {
			if (event.button == 2 || event.button == 1) {
				document.getElementById(event.target.getAttribute("popup")).openPopup(event.target, "before_start");
			} 
		}
	},
	abbreviateToolbarButtonText: function(event) {
		if(ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.abbreviatetoolbarbuttontext")) document.getElementById("themefontsizechangertb-toolbarbutton").setAttribute("label","TFSC");
	},	
	getContextCSS:function(fontcolor,backgrouncolor){
		if(fontcolor=="-moz-use-system-font" && backgrouncolor=="-moz-use-system-font") return "";
		var rawcss="@namespace url(http://www.w3.org/1999/xhtml);\n@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);\n\n.menu-accel-container { display: none !important; }\n\nmenupopup, context-menu, menupopup > menu > menupopup,\n#BMB_bookmarksPopup .arrowscrollbox-scrollbox, #bookmarksMenuPopup\n{ -moz-appearance: none !important;\nmax-height: 800px !important;\noverflow-y: auto !important; }\n\n#bookmarksMenuPopup .arrowscrollbox-scrollbox\n{ overflow-y: auto !important;\npadding-bottom: 10px !important; }\n\nmenupopup, context-menu, menupopup > menu > menupopup\n{ -moz-appearance: none!important; \nbackground: /*BACKGROUNDCOLOR*/ no-repeat !important;\nfont-size: 13px !important;\nborder-radius: 2px !important; \npadding: 0 !important;\n}\n\n.menu-right\n{ margin: -5px 0 !important; }\n\nmenupopup menu,\nmenupopup menuitem, \npanel, popup > menu, .splitmenu-menuitem, \n#PlacesChevronPopup .menu-iconic.bookmark-item, #interclue-state-popup menuitem\n{ -moz-appearance: none !important;\nborder: 1px solid transparent !important; \nfont-size: 13px !important; \ncolor: /*FONTCOLOR*/ !important;\n}\n\nmenupopup .popup-internal-box,\n#appmenuPrimaryPane menupopup .popup-internal-box,\n#appmenuSecondaryPane menupopup .popup-internal-box,\n#appmenuPrimaryPane menupopup,\n#appmenuSecondaryPane,\n.menuitem-iconic.interclue-selected\n{ padding: 3px !important;\nbackground: /*BACKGROUNDCOLOR*/ no-repeat !important;\nborder: 1px solid rgba(10,10,10, .5) !important; }\n\nmenubar > menu:hover, menubar > menu:focus,  \n.splitmenu-menu:hover, .splitmenu-menuitem:hover, \nmenupopup menuitem:hover, menupopup menu:hover, \npopup menu:hover, popup menuitem:hover,\nmenuitem:hover,\nmenupopup > menu:hover,menupopup > menu:focus, \npopup > menu:focus, popup > menu:hover,\n#appmenuPrimaryPane menu:hover,\n#appmenuSecondaryPane menu:hover,\n#appmenu_webDeveloper:hover, \n#appmenu_charsetMenu:hover,\n#nightly-appmenu:hover,\n#mmsearchpopupsearchengine menuitem:hover,\n.menuitem-iconic.menu-iconic.mmsearch_freesearch.mmsearch_freesearch-group:hover\n{ -moz-appearance: none !important;\nbackground: /*FONTCOLOR*/ no-repeat !important;\nborder-radius: 3px !important;\nborder: 1px solid rgba(10,10,10,.1) !important; \ncolor: /*BACKGROUNDCOLOR*/ !important;\n}\n\nmenu[_moz-menuactive=\"true\"],\nmenuitem[_moz-menuactive=\"true\"],\n.splitmenu-menuitem[_moz-menuactive=\"true\"]\n{ background-color: transparent !important;\nbox-shadow: none !important; }\n\nmenupopup, popup, context-menu\n{ border: 1px solid transparent !important; }\n\nmenu.menu-iconic > .menu-iconic-left,\nmenuitem.menuitem-iconic > .menu-iconic-left,\n.splitmenu-menuitem[iconic=\"true\"] > .menu-iconic-left\n{ -moz-appearance: none !important;\npadding-top: 0px !important;}\n\n#appmenu-popup .popup-internal-box\n{\nborder: none !important; }\n\n#appmenuPrimaryPane,\n#appmenuSecondaryPane\n{\nbackground: /*BACKGROUNDCOLOR*/ no-repeat !important;\nbox-shadow: inset rgba(0,0,0, 0.3) 1px 6px 16px 2px  !important;\nborder-radius: 3px !important;\nborder: 1px solid rgba(0,0,0,.3) !important; }\n\n#appmenu-popup menu>.menu-right\n{ padding: 0 !important;\nmargin-left: -2px !important; }\n\n.splitmenu-menuitem, .splitmenu-menu\n{ -moz-appearance: none !important; \nbackground: none !important;\n}\n\n.splitmenu-menu:hover, .splitmenu-menuitem:hover{ \n background: /*FONTCOLOR*/ no-repeat !important;\n color: /*BACKGROUNDCOLOR*/ !important;\n}\n\n/*GLOBAL CASCADE WORKAROUNDS*/\nmenubar > menu:hover > *,  \n.splitmenu-menu:hover > *, .splitmenu-menuitem:hover > *, \nmenupopup menuitem:hover > *, menupopup menu:hover > *, \npopup menu:hover > *, popup menuitem:hover > *,\nmenuitem:hover > *,\nmenupopup > menu:hover > *, popup > menu:hover > *,\n#appmenuPrimaryPane menu:hover > *,\n#appmenuSecondaryPane menu:hover > *,\n#appmenu_webDeveloper:hover > *, \n#appmenu_charsetMenu:hover > *,\n#nightly-appmenu:hover > *,\n#mmsearchpopupsearchengine menuitem:hover > *,\n.menuitem-iconic.menu-iconic.mmsearch_freesearch.mmsearch_freesearch-group:hover > * { \n color: /*BACKGROUNDCOLOR*/ !important;\n}\n\n#appmenu_webDeveloper:hover {\nborder: none !important;\n}";
		/*FONTCOLOR*/
		if(fontcolor=="-moz-use-system-font") rawcss=rawcss.replace(/color: \/\*FONTCOLOR\*\/ !important;/g,"").replace(/background: \/\*FONTCOLOR\*\/ no-repeat !important;/g,"");
		else {
			rawcss=rawcss.replace(/color: \/\*FONTCOLOR\*\/ !important;/g,"color: "+fontcolor+" !important;");
			if(backgrouncolor=="-moz-use-system-font") rawcss=rawcss.replace(/background: \/\*FONTCOLOR\*\/ no-repeat !important;/g,"");
			else rawcss=rawcss.replace(/background: \/\*FONTCOLOR\*\/ no-repeat !important;/g,"background: "+fontcolor+" no-repeat !important;");
		}
		/*BACKGROUNDCOLOR*/
		if(backgrouncolor=="-moz-use-system-font") rawcss=rawcss.replace(/background: \/\*BACKGROUNDCOLOR\*\/ no-repeat !important;/g,"").replace(/color: \/\*BACKGROUNDCOLOR\*\/ !important;/g,"");
		else {
			rawcss=rawcss.replace(/background: \/\*BACKGROUNDCOLOR\*\/ no-repeat !important;/g,"background: "+backgrouncolor+" no-repeat !important;");
			if(fontcolor=="-moz-use-system-font") rawcss=rawcss.replace(/color: \/\*BACKGROUNDCOLOR\*\/ !important;/g,"");
			else rawcss=rawcss.replace(/color: \/\*BACKGROUNDCOLOR\*\/ !important;/g,"color: "+backgrouncolor+" !important;");
		}
		return rawcss;
	},
	getMacThunderbirFixCSS:function(size,fontfamily){
		var rawsizecss, rawfontfamilyss;
		if(size == "-moz-use-system-font") rawsizecss="";
		rawsizecss = "treechildren:-moz-tree-row {height:"+Math.ceil(parseInt(size)*1.2)+"px !important;}";
		if(fontfamily == "-moz-use-system-font") rawfontfamilyss="";
		var rawfontfamilyss = "treechildren:-moz-tree-cell-text,treechildren:-moz-tree-cell-text(selected),treechildren:-moz-tree-cell-text(selected, focus),treechildren::-moz-tree-row,treechildren::-moz-tree-row(selected),treechildren::-moz-tree-row(selected, focus) {font-family: "+fontfamily+" !important;";
		return rawsizecss+rawfontfamilyss;
	},			
	changeFontSize:function (value){
		
		var sss=Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var ios=Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		var pB="extensions.themefontsizechangertb.";
		
		var currentfontsize = ThemeFontSizeChanger.getPrefValue(pB+"currentfontsize");			
		var currentfontfamily = ThemeFontSizeChanger.getPrefValue(pB+"currentfontfamily");
		var currentfontstyle = ThemeFontSizeChanger.getPrefValue(pB+"currentfontstyle");
		var currentfontweight = ThemeFontSizeChanger.getPrefValue(pB+"currentfontweight");	
		var currentfontcolor = ThemeFontSizeChanger.getPrefValue(pB+"currentfontcolor");	
		var currentbackgroundcolor = ThemeFontSizeChanger.getPrefValue(pB+"currentbackgroundcolor");							
		var oldcss = '@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n'
		+'@namespace html url("http://www.w3.org/1999/xhtml");\n'
		+'@namespace svg url("http://www.w3.org/2000/svg");\n'
		+'* {'
		+(currentfontsize=="-moz-use-system-font" ? "" : 'font-size: '+ currentfontsize + "px"+' !important;')
		+(currentfontfamily=="-moz-use-system-font" ? "" : "font-family:" + currentfontfamily + ' !important;')
		+(currentfontstyle=="-moz-use-system-font" ? "" : "font-style:" + currentfontstyle + ' !important;')
		+(currentfontweight=="-moz-use-system-font" ? "" : "font-weight:" + currentfontweight + ' !important;')	
		+(currentfontcolor=="-moz-use-system-font" ? "" : "color:" + currentfontcolor + ' !important;')
		+'}';

		if(ThemeFontSizeChanger.getPrefValue(pB+"contextmenuenabled")) var oldcontextCSS=ThemeFontSizeChanger.getContextCSS(currentfontcolor,currentbackgroundcolor);
		else var oldcontextCSS="";
		
		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);		
		var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);
								   
		if(xulRuntime.OS=="Darwin" && appInfo.name=="Thunderbird") var oldmacThunderbirFixCSS=ThemeFontSizeChanger.getMacThunderbirFixCSS(currentfontsize,currentfontfamily);
		else var oldmacThunderbirFixCSS="";			

		var olduri = ios.newURI('data:text/css,' + encodeURIComponent(oldcss + oldcontextCSS + oldmacThunderbirFixCSS), null, null);
		if(sss.sheetRegistered(olduri, sss.AGENT_SHEET)) {
			sss.unregisterSheet(olduri, sss.AGENT_SHEET);
		}

		var css = '@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n'
		+'@namespace html url("http://www.w3.org/1999/xhtml");\n'
		+'@namespace svg url("http://www.w3.org/2000/svg");\n'
		+'* {'
		+(document.getElementById("tfsc-size").selectedItem.value=="-moz-use-system-font" ? "" : 'font-size: '+ document.getElementById("tfsc-size").selectedItem.value + "px"+' !important;')
		+(document.getElementById("tfsc-fonts").selectedItem.value=="-moz-use-system-font" ? "" : "font-family:" + document.getElementById("tfsc-fonts").selectedItem.value+' !important;')
		+(document.getElementById("tfsc-style").selectedItem.value=="-moz-use-system-font" ? "" : "font-style:" + document.getElementById("tfsc-style").selectedItem.value+' !important;')
		+(document.getElementById("tfsc-weight").selectedItem.value=="-moz-use-system-font" ? "" : "font-weight:" + document.getElementById("tfsc-weight").selectedItem.value+' !important;')
		+(document.getElementById("tfsc-color").value=="-moz-use-system-font" ? "" : "color:" + document.getElementById("tfsc-color").value+' !important;')														
		+'}';

		var fontcolor = document.getElementById("tfsc-color").value;
		var backgroundcolor = document.getElementById("tfsc-backgroundcolor").selectedItem.value;
		var size=document.getElementById("tfsc-size").selectedItem.value;
		var fontfamily=document.getElementById("tfsc-fonts").selectedItem.value;
		
		if(document.getElementById("tfsc-contextmenuenabled").checked) var contextCSS=ThemeFontSizeChanger.getContextCSS(fontcolor,backgroundcolor);
		else var contextCSS="";
		
		if(xulRuntime.OS=="Darwin" && appInfo.name=="Thunderbird") var macThunderbirFixCSS=ThemeFontSizeChanger.getMacThunderbirFixCSS(size,fontfamily);
		else var macThunderbirFixCSS="";

		var uri = ios.newURI('data:text/css,' + encodeURIComponent(css + contextCSS + macThunderbirFixCSS), null, null);
		if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
			sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
		}
		
		ThemeFontSizeChanger.setPrefValue(pB+"currentfontsize",document.getElementById("tfsc-size").selectedItem.value);
		ThemeFontSizeChanger.setPrefValue(pB+"currentfontfamily",document.getElementById("tfsc-fonts").selectedItem.value);
		ThemeFontSizeChanger.setPrefValue(pB+"currentfontstyle",document.getElementById("tfsc-style").selectedItem.value);
		ThemeFontSizeChanger.setPrefValue(pB+"currentfontweight",document.getElementById("tfsc-weight").selectedItem.value);	
		ThemeFontSizeChanger.setPrefValue(pB+"currentfontcolor",document.getElementById("tfsc-color").selectedItem.value);	
		ThemeFontSizeChanger.setPrefValue(pB+"currentbackgroundcolor",document.getElementById("tfsc-backgroundcolor").selectedItem.value);	
		ThemeFontSizeChanger.setPrefValue(pB+"contextmenuenabled",document.getElementById("tfsc-contextmenuenabled").checked);	
		
		ThemeFontSizeChanger.addStylesForMacFix();
		ThemeFontSizeChanger.addStylesForWin7();

		window.setTimeout(function(){
			window.sizeToContent();
			var windowWidth=window.outerWidth;		
			var windowHeight=window.outerHeight;
			var screenWidth=screen.width;		
			var screenHeight=screen.height;
			window.moveTo((screenWidth-windowWidth)/2, (screenHeight-windowHeight)/2);			
		},1);
	},
	updateCheckedState:function(event){

		var currentfontsize = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentfontsize");
		
		var accFontSizeMenuitems = document.getElementById("themefontsizechangertb-statusbarpanel-menu").getElementsByTagName("menuitem");

		var gh=accFontSizeMenuitems[0];	
		
		for (var i=0;i<accFontSizeMenuitems.length;i++) {
		
			if(accFontSizeMenuitems[i].getAttribute("value")==currentfontsize) {

				gh=accFontSizeMenuitems[i];

			}
			
		}	

		document.getElementById("themefontsizechangertb-statusbarpanel-menu").parentNode.selectedItem=gh;
		
		
		
		var currentfontfamily = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentfontfamily");		
		
		var popup=document.getElementById("tfsc-fonts").getElementsByTagName("menupopup")[0];
		
		var accFontFamilyMenuitems = popup.getElementsByTagName("menuitem");

		var gh=accFontFamilyMenuitems[0];	
		
		for (var i=0;i<accFontFamilyMenuitems.length;i++) {
		
			if(accFontFamilyMenuitems[i].getAttribute("value")==currentfontfamily) {

				gh=accFontFamilyMenuitems[i];

			}
			
		}	

		document.getElementById("tfsc-fonts").selectedItem=gh;
			
		
		
		var currentfontstyle = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentfontstyle");		
		
		var popup=document.getElementById("tfsc-style").getElementsByTagName("menupopup")[0];
		
		var accFontFamilyMenuitems = popup.getElementsByTagName("menuitem");

		var gh=accFontFamilyMenuitems[0];	
		
		for (var i=0;i<accFontFamilyMenuitems.length;i++) {
		
			if(accFontFamilyMenuitems[i].getAttribute("value")==currentfontstyle) {

				gh=accFontFamilyMenuitems[i];

			}
			
		}	

		document.getElementById("tfsc-style").selectedItem=gh;
		
		
		var currentfontweight = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentfontweight");		
		
		var popup=document.getElementById("tfsc-weight").getElementsByTagName("menupopup")[0];
		
		var accFontFamilyMenuitems = popup.getElementsByTagName("menuitem");

		var gh=accFontFamilyMenuitems[0];	
		
		for (var i=0;i<accFontFamilyMenuitems.length;i++) {
		
			if(accFontFamilyMenuitems[i].getAttribute("value")==currentfontweight) {

				gh=accFontFamilyMenuitems[i];

			}
			
		}	

		document.getElementById("tfsc-weight").selectedItem=gh;	
		
		
		var currentfontcolor = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentfontcolor");		

		var popup=document.getElementById("tfsc-color").getElementsByTagName("menupopup")[0];
		
		var accFontFamilyMenuitems = popup.getElementsByTagName("menuitem");

		var gh=accFontFamilyMenuitems[0];	
		
		for (var i=0;i<accFontFamilyMenuitems.length;i++) {
		
			if(accFontFamilyMenuitems[i].getAttribute("value")==currentfontcolor) {

				gh=accFontFamilyMenuitems[i];

			}
			
		}
		
		document.getElementById("tfsc-color").selectedItem=gh;	
		
		
		var currentbackgroundcolor = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentbackgroundcolor");		

		var popup=document.getElementById("tfsc-backgroundcolor").getElementsByTagName("menupopup")[0];
		
		var accFontFamilyMenuitems = popup.getElementsByTagName("menuitem");

		var gh=accFontFamilyMenuitems[0];	
		
		for (var i=0;i<accFontFamilyMenuitems.length;i++) {
		
			if(accFontFamilyMenuitems[i].getAttribute("value")==currentbackgroundcolor) {

				gh=accFontFamilyMenuitems[i];

			}
			
		}
		
		document.getElementById("tfsc-backgroundcolor").selectedItem=gh;				

		/*document.getElementById("tfsc-color").value=currentfontcolor;
		document.getElementById("tfsc-color").style.background=currentfontcolor;*/					

		var contextmenuenabled = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.contextmenuenabled");
		document.getElementById("tfsc-contextmenuenabled").checked=contextmenuenabled;
		
	},
	onpanelshowing:function(event){
	//ThemeFontSizeChanger.buildFontList(null,'serif',document.getElementById('tfsc-fonts'));
	ThemeFontSizeChangerFonts._rebuildFonts();
	ThemeFontSizeChanger.changeColorPickerColorMenuitem();
	ThemeFontSizeChanger.updateCheckedState();
	ThemeFontSizeChanger.addFontStyles();

	var dialogHeight=parseInt(screen.height*0.8);
	var dialogWidth=parseInt(screen.width*0.8);
	document.getElementById("themefontsizechangertboptionsdialog").style.maxHeight=dialogHeight+"px";
	document.getElementById("themefontsizechangertboptionsdialog").style.maxWidth=dialogWidth+"px";
	//window.moveTo((screen.width-dialogWidth)/2, (screen.height-dialogHeight)/2);
	
	},
	onpanelclosing:function(event){
		ThemeFontSizeChanger.removeFontStyles();
	},		
	changeColorPickerColorMenuitem:function(){
		var themefontsizechangertbpickercolor = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.picker.color");
		document.getElementById("themefontsizechangertb-fontcolor-custom-menuitem").setAttribute("label",themefontsizechangertbpickercolor);
		document.getElementById("themefontsizechangertb-fontcolor-custom-menuitem").setAttribute("value",themefontsizechangertbpickercolor);
		var themefontsizechangertbpickerbackgroundcolor = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.picker.backgroundcolor");
		document.getElementById("themefontsizechangertb-backgroundcolor-custom-menuitem").setAttribute("label",themefontsizechangertbpickerbackgroundcolor);
		document.getElementById("themefontsizechangertb-backgroundcolor-custom-menuitem").setAttribute("value",themefontsizechangertbpickerbackgroundcolor);			
	},
	removeMacFix:function(requester){

		var macfix=ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.macfix");	
		var currentfontcolor = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentfontcolor");
						
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);

		var oldcss = '@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n'
		+'@namespace html url("http://www.w3.org/1999/xhtml");\n'
		+'@namespace svg url("http://www.w3.org/2000/svg");\n'
		+"#TabsToolbar{height:"+macfix+" !important;background-position:0 "+macfix+" !important;}.textbox-input-box {height:auto !important;}html|*.textbox-input:-moz-placeholder,html|*.textbox-textarea:-moz-placeholder{color:"+currentfontcolor+" !important;}";			
		var olduri = ios.newURI('data:text/css,' + encodeURIComponent(oldcss), null, null);
		if(sss.sheetRegistered(olduri, sss.AGENT_SHEET)) {
			sss.unregisterSheet(olduri, sss.AGENT_SHEET);
		}

	},
	assignMacFix:function(requester){

	var w = ((requester == "window") ? window : window.opener);
		try{var tabheight=w.getComputedStyle(w.document.getElementsByClassName("tabbrowser-tab")[0], null).getPropertyValue("height");}catch(e){return;}
		var TabsToolbarheight=w.getComputedStyle(w.document.getElementById("TabsToolbar"), null).getPropertyValue("height");
		if(tabheight!=TabsToolbarheight){
			//assign the css
		
		var macfix=ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.macfix");	
		var currentfontcolor = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentfontcolor");
						
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);

		var oldcss = '@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n'
		+'@namespace html url("http://www.w3.org/1999/xhtml");\n'
		+'@namespace svg url("http://www.w3.org/2000/svg");\n'
		+"#TabsToolbar{height:"+macfix+" !important;background-position:0 "+macfix+" !important;}.textbox-input-box {height:auto !important;}html|*.textbox-input:-moz-placeholder,html|*.textbox-textarea:-moz-placeholder{color:"+currentfontcolor+" !important;}";			
		var olduri = ios.newURI('data:text/css,' + encodeURIComponent(oldcss), null, null);
		if(sss.sheetRegistered(olduri, sss.AGENT_SHEET)) {
			sss.unregisterSheet(olduri, sss.AGENT_SHEET);
		}

		var css = '@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n'
		+'@namespace html url("http://www.w3.org/1999/xhtml");\n'
		+'@namespace svg url("http://www.w3.org/2000/svg");\n'
		+"#TabsToolbar{height:"+tabheight+" !important;background-position:0 "+tabheight+" !important;}.textbox-input-box {height:auto !important;}html|*.textbox-input:-moz-placeholder,html|*.textbox-textarea:-moz-placeholder{color:"+currentfontcolor+" !important;}";	
		var uri = ios.newURI('data:text/css,' + encodeURIComponent(css), null, null);
		if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
			sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
		}
		
		ThemeFontSizeChanger.setPrefValue("extensions.themefontsizechangertb.macfix",tabheight);	
				
		}
	},
	addStylesForMacFix: function(requester){

		ThemeFontSizeChanger.isMac = ThemeFontSizeChanger.checkMac();
		var isThemeDefault = ThemeFontSizeChanger.getPrefValue("general.skins.selectedSkin") == "classic/1.0";
		if(ThemeFontSizeChanger.isMac && isThemeDefault){
			ThemeFontSizeChanger.removeMacFix(requester ? requester : null);
			ThemeFontSizeChanger.assignMacFix(requester ? requester : null);
		}

	},
	addStylesForWin7: function(requester){

		ThemeFontSizeChanger.isMac = ThemeFontSizeChanger.checkMac();
		var isThemeDefault = ThemeFontSizeChanger.getPrefValue("general.skins.selectedSkin") == "classic/1.0";
		if(!ThemeFontSizeChanger.isMac && isThemeDefault && window.opener.TabsInTitlebar){
			window.opener.TabsInTitlebar.allowedBy("sizemode",false);
			window.opener.TabsInTitlebar.allowedBy("sizemode",true);
		}

	},
		checkMac : function() {
			var dir = false;
			try {
				var dirsvc = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);   
				dir = dirsvc.get("UsrDsk", Components.interfaces.nsIFile);
			} catch(e) {
				console.log("MacOSX check failed");	
				console.log(e);	
			}
			return dir;
		},
	showPicker:function(event, command, args){
		document.getElementById("themefontsizechangertb-statusbar-panel").setAttribute("assignedelement",event.target.id);
		//window.openDialog("chrome://themefontsizechangertb/content/options.xul", null, "centerscreen,chrome");
		var optionsURL = "chrome://themefontsizechangertb/content/picker/picker.xul";
		// The following code is from extensions.js (Add-ons manager) :)
		var windows = Components.classes['@mozilla.org/appshell/window-mediator;1']
				.getService(Components.interfaces.nsIWindowMediator)
				.getEnumerator(null);
		while (windows.hasMoreElements()) {
			var win = windows.getNext();
			if (win.document.documentURI == optionsURL) {
				win.focus();
				win.execArguments([command, args]);
				return([win, true]);
			}
		}
		var modal = true;
		//var features = "chrome,titlebar,toolbar,centerscreen" + (modal ? ",modal" : ",dialog=no");//original
		var features = "chrome,titlebar,toolbar,centerscreen" + (modal ? ",modal" : ",dialog=yes");//modified to yes to be dialog
		// var args after features
		return([open(optionsURL, "", features, command, args), false]);		
	},
	colorPickerRevertBack: function() {
		var currentelement = document.getElementById(document.getElementById("themefontsizechangertb-statusbar-panel").getAttribute("assignedelement"));
		var value =	currentelement.getAttribute("elementvalue");
		var currentcolor = ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.current"+value);
		currentelement.parentNode.parentNode.selectedItem = (currentcolor=="-moz-use-system-font") ? currentelement.previousSibling.previousSibling.previousSibling.previousSibling : currentelement.previousSibling.previousSibling;
	},
	addAddonListener:function(){
		var beingUninstalled;  
		var listener = {  
			onInstalling: function(addon) {  
				if (addon.id == ThemeFontSizeChanger.addonGUID) {  
					beingUninstalled = true;  
					if(ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentversion")==addon.version) ThemeFontSizeChanger.setPrefValue("extensions.themefontsizechangertb.reinstall",true);
				}  
			},  
			onUninstalling: function(addon) {  
				if (addon.id == ThemeFontSizeChanger.addonGUID) {  
					beingUninstalled = true;  
					const Cc = Components.classes;
					const Ci = Components.interfaces;
					const Cr = Components.results;
					const Cu = Components.utils;
					// modules that come with Firefox
					Cu.import("resource://gre/modules/XPCOMUtils.jsm");
					// LightweightThemeManager may not be not available (Firefox < 3.6 or Thunderbird)
					try { Cu.import("resource://gre/modules/LightweightThemeManager.jsm"); }
					catch (e) { LightweightThemeManager = null; }
					LightweightThemeManager.currentTheme=null
					ThemeFontSizeChanger.setPrefValue("extensions.themefontsizechangertb.currentbackgroundcolor","-moz-use-system-font");	
				}  
			},  
			onOperationCancelled: function(addon) {  
				if (addon.id == ThemeFontSizeChanger.addonGUID) {  
				  beingUninstalled = (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) != 0;  
				  // alert("canceled")
				}  
			}  
		}  
		try {  
			ChromeUtils.import("resource://gre/modules/AddonManager.jsm");  
			AddonManager.addAddonListener(listener);  
		} catch (ex) {} 
	},
	getTheme:function(backgroundcolor){
		//textcolor is removed
		return {
			accentcolor: backgroundcolor ? backgroundcolor : ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentbackgroundcolor"),
			custom: true,
			footerURL: "resource://themefontsizechangertb/chrome/content/spacer.gif",
			headerURL: "resource://themefontsizechangertb/chrome/content/spacer.gif",
			id: "themefontsizechangertb-lightweight-theme",
			name: "Theme Font & Size Changer LightWeightTheme"
		}			
	},
	changeTheme:function(backgroundcolor) {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		const Cu = Components.utils;
		// modules that come with Firefox
		Cu.import("resource://gre/modules/XPCOMUtils.jsm");
		// LightweightThemeManager may not be not available (Firefox < 3.6 or Thunderbird)
		try { Cu.import("resource://gre/modules/LightweightThemeManager.jsm"); }
		catch (e) { LightweightThemeManager = null; }
		if(backgroundcolor=="-moz-use-system-font") {
			LightweightThemeManager.currentTheme=null;
			ThemeFontSizeChanger.changeFontSize(null);
			return;
		}
		//textcolor is removed
		var CP = ThemeFontSizeChanger.getTheme(backgroundcolor);	
		try{
			PersonaService.previewPersona(CP)
			PersonaService.changeToPersona(CP);
		}
		catch(err) {
			LightweightThemeManager.previewTheme(CP)
			LightweightThemeManager.setLocalTheme(CP);
		}	
		ThemeFontSizeChanger.changeFontSize(null);
	},
	askColorPickerElementValue:function(event){
		return document.getElementById(document.getElementById("themefontsizechangertb-statusbar-panel").getAttribute("assignedelement")).getAttribute("elementvalue");
	},
	handleColorPick: function(selectedcolor) {
		var currentelement=document.getElementById(document.getElementById("themefontsizechangertb-statusbar-panel").getAttribute("assignedelement"));
		currentelement.previousSibling.previousSibling.setAttribute("label",selectedcolor);
		currentelement.previousSibling.previousSibling.setAttribute("value",selectedcolor);
		currentelement.parentNode.parentNode.selectedItem=currentelement.previousSibling.previousSibling;
		//currentelement.firstChild.style.backgroundColor=selectedcolor;
		//FirefoxReader.enableFIREFOXREADER();
	},
	addFontStyles:function(){
		/*
			var a=document.getElementById("tfsc-fonts").getElementsByClassName("tfmi");
			var css="";
			for (var i=0;i<a.length;i++) {
				css+=".tfmi:nth-of-type("+(i+2)+") * {font-family:'"+a[i].getAttribute("label")+"' !important;}\n";
			}
		*/
		var css=ThemeFontSizeChangerFonts.allFontsCSS;
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		var uri = ios.newURI('data:text/css,' + encodeURIComponent(css), null, null);
		if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
			sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
		}	
	},    
	removeFontStyles:function(){
		/*
			var a=document.getElementById("tfsc-fonts").getElementsByClassName("tfmi");
			var css="";
			for (var i=0;i<a.length;i++) {
				css+=".tfmi:nth-of-type("+(i+2)+") * {font-family:'"+a[i].getAttribute("label")+"' !important;}\n";
			}
		*/
		var css = ThemeFontSizeChangerFonts.allFontsCSS;
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		var uri = ios.newURI('data:text/css,' + encodeURIComponent(css), null, null);
		if(sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
			sss.unregisterSheet(uri, sss.AGENT_SHEET);
		}		
	},
	hideToolsMenu:function(event){
		document.getElementById("themefontsizechangertb-tools-menuitem").hidden=ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.hidetoolsmenu");
	},   
	hideAppMenu:function(event){
		if(document.getElementById("themefontsizechangertb-appmenu-menuitem")) document.getElementById("themefontsizechangertb-appmenu-menuitem").hidden=ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.hideappmenu");
	},
	addMultiBackground:function(window){
		ChromeUtils.import("resource://gre/modules/LightweightThemeConsumer.jsm");
		ChromeUtils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
		if (!PrivateBrowsingUtils.isWindowPrivate(window)){return;}
		var lTheme = window.document.documentElement._lightweightTheme;
		if (lTheme && lTheme._lastScreenHeight == null) {
			var original_isWindowPrivate = PrivateBrowsingUtils.isWindowPrivate;
			try {
				PrivateBrowsingUtils.isWindowPrivate=function(){return false};
				LightweightThemeConsumer.call(lTheme,window.document);
			}
			catch(e){}
			PrivateBrowsingUtils.isWindowPrivate = original_isWindowPrivate;
		}
	}	    				
}

function ThemeFontSizeChangerStartup() { 
}
ThemeFontSizeChangerStartup.prototype = {
	classID:Components.ID("{7372e7d5-408d-45b8-960f-3c8921f1c26a}"),
	contractID:"@themefontsizechangertb/bootstartup;1",
	classDescription:"ThemeFontSizeChanger BootStartup",
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIObserver, Components.interfaces.nsISupportsWeakReference, Components.interfaces.nsISupports]),
	get wrappedJSObject(){return(this);},
	observe: function(aSubject,aTopic,aData){
		switch(aTopic) {
		  case "http-on-modify-request":
			break;       
		  case "quit-application":
			break;
		  case "quit-application-requested":	
			break;		
		  default:
			throw Components.Exception("Unknown topic: "+aTopic);
		}
	},
	registerObservers:function(){
	},
	unregisterObservers:function(){
	},
	prefObserver:{
		register: function(){
			var prefService = Components.classes["@mozilla.org/preferences-service;1"]
										.getService(Components.interfaces.nsIPrefService);
			this._branch = prefService.getBranch("extensions.themefontsizechangertb.");
			this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
			this._branch.addObserver("", this, false);
		},
		unregister: function(){
			if(!this._branch) {return;}
			this._branch.removeObserver("", this);
		},
		observe: function(aSubject, aTopic, aData){
			if(aTopic != "nsPref:changed") {return;}
			if(aData=="enableembeddedvideo"){
				var ythdprefsinstance = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
				var ythdenableembeddedvideo = ythdprefsinstance.getBoolPref("extensions.themefontsizechangertb.enableembeddedvideo");
				if(ythdenableembeddedvideo) Components.classes["@themefontsizechangertb/bootstartup;1"].getService().wrappedJSObject.registerObservers();
				else Components.classes["@themefontsizechangertb/bootstartup;1"].getService().wrappedJSObject.unregisterObservers();
			}
		}
	},	
	registerPrefObserver:function(){
		this.prefObserver.register(); 
	},	
	unregisterPrefObserver:function(){
		this.prefObserver.unregister(); 
	},
	requestAddFullPageCSS:function(){
		ThemeFontSizeChangerBootstrapAddon.addFullPageCSS();
	},
	requestRemoveFullPageCSS:function(){
		ThemeFontSizeChangerBootstrapAddon.removeFullPageCSS();
	}
}

var WindowListener = {
	setupBrowserUI: function(window,closebar) {
		// Take any steps to add UI or anything to the browser window
		// document.getElementById() etc. will work here 
		try{
			ThemeFontSizeChanger.mainWindowLoadHandler(window);
		} catch(e){
			ThemeFontSizeChangerBootstrapAddon.lg(e,1);
		}		
	},
	tearDownBrowserUI: function(window) {
		// Take any steps to remove UI or anything from the browser window
		// document.getElementById() etc. will work here
		ThemeFontSizeChanger.mainWindowUnloadHandler(window);
	},
	// nsIWindowMediatorListener functions
	onOpenWindow: function(xulWindow) {
		// A new window has opened
		var domWindow = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								 .getInterface(Components.interfaces.nsIDOMWindow);
		// Wait for it to finish loading
		domWindow.addEventListener("load", function listener() {
			domWindow.removeEventListener("load", listener, false);
			// If this is a browser window then setup its UI	  
			if (domWindow.document.documentElement.getAttribute("windowtype")=="navigator:browser" || domWindow.document.documentElement.getAttribute("windowtype")=="mail:3pane") WindowListener.setupBrowserUI(domWindow);
		}, false);
	},
	onCloseWindow: function(xulWindow) {
	},
	onWindowTitleChange: function(xulWindow, newTitle) {
	}
};

var ThemeFontSizeChangerBootstrapAddon = {
	prefsinstance:Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	startup:function(data,reason){
		this.requestAddPrerequisites(data);
		//this.registerComponent();
		this.setDefaultPrefs();
		this.addAddonListener();
		this.setDefaultLocalizations();
		this.setupBrowserUI();
		this.addWindowListener();
		this.addAddonSkinCSS();
		this.addExtraCSS();
		//this.requestAddFullPageCSS();
		//this.requestRegisterObservers();
		//this.requestRegisterPrefObserver();
		if (reason == ADDON_ENABLE) {
			if(ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.currentbackgroundcolor")!="-moz-use-system-font"){
				const Cc = Components.classes;
				const Ci = Components.interfaces;
				const Cr = Components.results;
				const Cu = Components.utils;
				// modules that come with Firefox
				Cu.import("resource://gre/modules/XPCOMUtils.jsm");
				// LightweightThemeManager may not be not available (Firefox < 3.6 or Thunderbird)
				try { Cu.import("resource://gre/modules/LightweightThemeManager.jsm"); }
				catch (e) { LightweightThemeManager = null; }
				try { LightweightThemeManager.currentTheme = ThemeFontSizeChanger.getTheme();}
				catch (e) {}				
			}
		}
	},
	shutdown:function(data,reason){
		// When the application is shutting down we normally don't have to clean
		// up any UI changes made
		if (reason == APP_SHUTDOWN) return;
		this.removeAddonListener();
		this.removeDefaultLocalizations();
		this.tearBrowserUI();
		this.removeWindowListener();
		this.removeAddonSkinCSS();
		this.removeExtraCSS();		
		//this.removeFullPageCSS();		
		//this.requestUnregisterObservers();
		//this.requestUnregisterPrefObserver();
		//this.unregisterComponent();
		this.requestRemovePrerequisites(data);
        if (reason == ADDON_DISABLE) {
			const Cc = Components.classes;
			const Ci = Components.interfaces;
			const Cr = Components.results;
			const Cu = Components.utils;
			// modules that come with Firefox
			Cu.import("resource://gre/modules/XPCOMUtils.jsm");
			// LightweightThemeManager may not be not available (Firefox < 3.6 or Thunderbird)
			try { 
				Cu.import("resource://gre/modules/LightweightThemeManager.jsm"); 
			}
			catch (e) { 
				LightweightThemeManager = null; 
			}
			try { 
				//if(LightweightThemeManager.currentTheme.name == "Theme Font & Size Changer LightWeightTheme") {
					LightweightThemeManager.forgetUsedTheme(LightweightThemeManager.currentTheme.id);
				//}
			}
			catch (e) {
				try{
					LightweightThemeManager.currentTheme=null;
				}
				catch(e){} 
			}
			Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).clearUserPref("layout.css.devPixelsPerPx");			
        }
	},	
	requestAddPrerequisites:function(data){
		 //this.addResourceProtocol(data);	
		 //this.addChromeProtocol(data);	
	},
	requestRemovePrerequisites:function(data){
		 //this.removeResourceProtocol(data);	
		 //this.removeChromeProtocol(data);	
	},	
	addChromeProtocol:function(data){
		var pV = Services.appinfo.platformVersion;
		if (Services.vc.compare(pV, "10.0") < 0 && Services.vc.compare(pV, "8.0") >= 0) Cm.addBootstrappedManifestLocation(data.installPath);	
	},
	removeChromeProtocol:function(data) {
		var pV = Services.appinfo.platformVersion;
		if (Services.vc.compare(pV, "10.0") < 0 && Services.vc.compare(pV, "8.0") >= 0) Cm.removeBootstrappedManifestLocation(data.installPath);
	},
	registerComponent:function(){
		if (XPCOMUtils.generateNSGetFactory)
			var NSGetFactory = XPCOMUtils.generateNSGetFactory([ThemeFontSizeChangerStartup]);
		var componentRegistrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar)
		var contractID = ThemeFontSizeChangerStartup.prototype.contractID;
		try{
			componentRegistrar.unregisterFactory(componentRegistrar.contractIDToCID(contractID), componentRegistrar.getClassObjectByContractID(contractID, Ci.nsISupports));
		}catch(e){}
		var component = ThemeFontSizeChangerStartup.prototype;
		var factory = NSGetFactory(component.classID)
		//Note for Validator: This is safe and used to register a generic component for our add-on.
		componentRegistrar.registerFactory(component.classID, component.classDescription, component.contractID, factory);
	},
	unregisterComponent:function(reason){
		var componentRegistrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		componentRegistrar.unregisterFactory(componentRegistrar.contractIDToCID("@themefontsizechangertb/bootstartup;1"),componentRegistrar.getClassObjectByContractID("@themefontsizechangertb/bootstartup;1", Components.interfaces.nsISupports));
	},	
	setDefaultPrefs:function(){
		function setDefaultPrefs(name, value){
			function setPrefs(branch, name ,value){
				if(typeof value == "string"){
					branch.setStringPref(name, value);
				}
				else if(typeof value == "number"){
					branch.setIntPref(name, value);
				}
				else if(typeof value == "boolean"){
					branch.setBoolPref(name, value);
				}
			}
			var defaultBranch = Services.prefs.getDefaultBranch(null);
			setPrefs(defaultBranch, name, value);
		}
		Services.scriptloader.loadSubScript(this.getPrefsJS(), {pref:setDefaultPrefs});	
	},
	getPrefsJS:function(){
		return "resource://themefontsizechangertb/defaults/preferences/defaults.js";
	},
	addAddonListener:function(){
		try {  
			ChromeUtils.import("resource://gre/modules/AddonManager.jsm");  
			AddonManager.addAddonListener(this.AddonListener);  
		} catch (ex) {} 	
	},
	removeAddonListener:function(){
		try {  
			ChromeUtils.import("resource://gre/modules/AddonManager.jsm");  
			AddonManager.removeAddonListener(this.AddonListener);  
		} catch (ex) {} 
	},	
	AddonListener:{  
		onInstalling: function(addon) {  
			if (addon.id == ThemeFontSizeChanger.addonGUID) {  
				var version=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).getCharPref("extensions.themefontsizechangertb.currentversion");
				if(version==addon.version) Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).setBoolPref("extensions.themefontsizechangertb.reinstall",true);
			}  
		},  
		onUninstalling: function(addon) {  
			if (addon.id == ThemeFontSizeChanger.addonGUID) {
				//foo
			}  
		},  
		onOperationCancelled: function(addon) {  
			if (addon.id == ThemeFontSizeChanger.addonGUID) {
				//foo
			}  
		}  
	},
	setDefaultLocalizations:function(){
		Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).flushBundles();
		ThemeFontSizeChanger.STRINGS["themefontsizechangertb.properties"]=Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://themefontsizechangertb/locale/themefontsizechangertb.properties"+"?"+build);
		ThemeFontSizeChanger.STRINGS["themefontsizechangertb_bootstrap.properties"]=Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://themefontsizechangertb/locale/themefontsizechangertb_bootstrap.properties"+"?"+build);
	},
	removeDefaultLocalizations:function(){
		ThemeFontSizeChanger.STRINGS=[];
		Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).flushBundles();
	},	
	setupBrowserUI:function(){
		var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
			   getService(Ci.nsIWindowMediator);
		// Get the list of browser windows already open
		var windows = wm.getEnumerator(this.getWindowType());
		while (windows.hasMoreElements()) {
			var domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
			WindowListener.setupBrowserUI(domWindow,false);
		}
	},
	tearBrowserUI:function(){
		var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
			   getService(Ci.nsIWindowMediator);
		// Get the list of browser windows already open
		var windows = wm.getEnumerator(this.getWindowType());
		while (windows.hasMoreElements()) {
			var domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
			WindowListener.tearDownBrowserUI(domWindow);
		}
	},
	getWindowType:function(){
		switch (ThemeFontSizeChanger.appInfo.ID) {
			case ThemeFontSizeChanger.THUNDERBIRD_ID:
				return "mail:3pane";	
				break;
			default:{
				return "navigator:browser";
			}
		}	
	},
	addWindowListener:function(){
		var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
			   getService(Ci.nsIWindowMediator);
		// Wait for any new browser windows to open
		wm.addListener(WindowListener);
	},
	removeWindowListener:function(){
		var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
			   getService(Ci.nsIWindowMediator);
		// Stop listening for any new browser windows to open	   
		wm.removeListener(WindowListener);	
	},
	registerStyle:function(url){
		var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
							.getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		var uri = ios.newURI(url, null, null);
		if(!sss.sheetRegistered(uri, sss.AGENT_SHEET))
			//Note for Validator: This is safe and used to register our add-on skin, i.e. chrome://themefontsizechangertb/skin/overlay.css			
			sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);	
	},
	unregisterStyle:function(url){
		var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
							.getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		var u = ios.newURI(url, null, null);
		if(sss.sheetRegistered(u, sss.AGENT_SHEET))
		  sss.unregisterSheet(u, sss.AGENT_SHEET); 	
	},	
	addAddonSkinCSS:function(){
		this.registerStyle(this.getOverlayCSS());
	},
	removeAddonSkinCSS:function(){
		this.unregisterStyle(this.getOverlayCSS());
	},
	getOverlayCSS:function(){
		return "chrome://themefontsizechangertb/skin/overlay.css";
	},
	getTFSCStyle:function(){
		var getContextCSS=function(fontcolor,backgrouncolor){

			if(fontcolor=="-moz-use-system-font" && backgrouncolor=="-moz-use-system-font") return "";
			
			var rawcss="@namespace url(http://www.w3.org/1999/xhtml);\n@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);\n\n.menu-accel-container { display: none !important; }\n\nmenupopup, context-menu, menupopup > menu > menupopup,\n#BMB_bookmarksPopup .arrowscrollbox-scrollbox, #bookmarksMenuPopup\n{ -moz-appearance: none !important;\nmax-height: 800px !important;\noverflow-y: auto !important; }\n\n#bookmarksMenuPopup .arrowscrollbox-scrollbox\n{ overflow-y: auto !important;\npadding-bottom: 10px !important; }\n\nmenupopup, context-menu, menupopup > menu > menupopup\n,#context-navigation{ -moz-appearance: none!important; \nbackground: /*BACKGROUNDCOLOR*/ no-repeat !important;\nfont-size: 13px !important;\nborder-radius: 2px !important; \npadding: 0 !important;\n}\n\n.menu-right\n{ margin: -5px 0 !important; }\n\nmenupopup menu,\nmenupopup menuitem, \npanel, popup > menu, .splitmenu-menuitem, \n#PlacesChevronPopup .menu-iconic.bookmark-item, #interclue-state-popup menuitem\n{ -moz-appearance: none !important;\nborder: 1px solid transparent !important; \nfont-size: 13px !important; \ncolor: /*FONTCOLOR*/ !important;\n}\n\nmenupopup .popup-internal-box,\n#appmenuPrimaryPane menupopup .popup-internal-box,\n#appmenuSecondaryPane menupopup .popup-internal-box,\n#appmenuPrimaryPane menupopup,\n#appmenuSecondaryPane,\n.menuitem-iconic.interclue-selected\n{ padding: 3px !important;\nbackground: /*BACKGROUNDCOLOR*/ no-repeat !important;\nborder: 1px solid rgba(10,10,10, .5) !important; }\n\nmenubar > menu:hover, menubar > menu:focus,  \n.splitmenu-menu:hover, .splitmenu-menuitem:hover, \nmenupopup menuitem:hover, menupopup menu:hover, \npopup menu:hover, popup menuitem:hover,\nmenuitem:hover,\nmenupopup > menu:hover,menupopup > menu:focus, \npopup > menu:focus, popup > menu:hover,\n#appmenuPrimaryPane menu:hover,\n#appmenuSecondaryPane menu:hover,\n#appmenu_webDeveloper:hover, \n#appmenu_charsetMenu:hover,\n#nightly-appmenu:hover,\n#mmsearchpopupsearchengine menuitem:hover,\n.menuitem-iconic.menu-iconic.mmsearch_freesearch.mmsearch_freesearch-group:hover\n{ -moz-appearance: none !important;\nbackground: /*FONTCOLOR*/ no-repeat !important;\nborder-radius: 3px !important;\nborder: 1px solid rgba(10,10,10,.1) !important; \ncolor: /*BACKGROUNDCOLOR*/ !important;\n}\n\nmenu[_moz-menuactive=\"true\"],\nmenuitem[_moz-menuactive=\"true\"],\n.splitmenu-menuitem[_moz-menuactive=\"true\"]\n{ background-color: transparent !important;\nbox-shadow: none !important; }\n\nmenupopup, popup, context-menu\n{ border: 1px solid transparent !important; }\n\nmenu.menu-iconic > .menu-iconic-left,\nmenuitem.menuitem-iconic > .menu-iconic-left,\n.splitmenu-menuitem[iconic=\"true\"] > .menu-iconic-left\n{ -moz-appearance: none !important;\npadding-top: 0px !important;}\n\n#appmenu-popup .popup-internal-box\n{\nborder: none !important; }\n\n#appmenuPrimaryPane,\n#appmenuSecondaryPane\n{\nbackground: /*BACKGROUNDCOLOR*/ no-repeat !important;\nbox-shadow: inset rgba(0,0,0, 0.3) 1px 6px 16px 2px  !important;\nborder-radius: 3px !important;\nborder: 1px solid rgba(0,0,0,.3) !important; }\n\n#appmenu-popup menu>.menu-right\n{ padding: 0 !important;\nmargin-left: -2px !important; }\n\n.splitmenu-menuitem, .splitmenu-menu\n{ -moz-appearance: none !important; \nbackground: none !important;\n}\n\n.splitmenu-menu:hover, .splitmenu-menuitem:hover{ \n background: /*FONTCOLOR*/ no-repeat !important;\n color: /*BACKGROUNDCOLOR*/ !important;\n}\n\n/*GLOBAL CASCADE WORKAROUNDS*/\nmenubar > menu:hover > *,  \n.splitmenu-menu:hover > *, .splitmenu-menuitem:hover > *, \nmenupopup menuitem:hover > *, menupopup menu:hover > *, \npopup menu:hover > *, popup menuitem:hover > *,\nmenuitem:hover > *,\nmenupopup > menu:hover > *, popup > menu:hover > *,\n#appmenuPrimaryPane menu:hover > *,\n#appmenuSecondaryPane menu:hover > *,\n#appmenu_webDeveloper:hover > *, \n#appmenu_charsetMenu:hover > *,\n#nightly-appmenu:hover > *,\n#mmsearchpopupsearchengine menuitem:hover > *,\n.menuitem-iconic.menu-iconic.mmsearch_freesearch.mmsearch_freesearch-group:hover > * { \n color: /*BACKGROUNDCOLOR*/ !important;\n}\n\n#appmenu_webDeveloper:hover {\nborder: none !important;\n}";
			
			/*FONTCOLOR*/
			if(fontcolor=="-moz-use-system-font") rawcss=rawcss.replace(/color: \/\*FONTCOLOR\*\/ !important;/g,"").replace(/background: \/\*FONTCOLOR\*\/ no-repeat !important;/g,"");
			else {
			
				rawcss=rawcss.replace(/color: \/\*FONTCOLOR\*\/ !important;/g,"color: "+fontcolor+" !important;");
				
				if(backgrouncolor=="-moz-use-system-font") rawcss=rawcss.replace(/background: \/\*FONTCOLOR\*\/ no-repeat !important;/g,"");
				else rawcss=rawcss.replace(/background: \/\*FONTCOLOR\*\/ no-repeat !important;/g,"background: "+fontcolor+" no-repeat !important;");
				
			}
			
			/*BACKGROUNDCOLOR*/
			if(backgrouncolor=="-moz-use-system-font") rawcss=rawcss.replace(/background: \/\*BACKGROUNDCOLOR\*\/ no-repeat !important;/g,"").replace(/color: \/\*BACKGROUNDCOLOR\*\/ !important;/g,"");
			else {
			
				rawcss=rawcss.replace(/background: \/\*BACKGROUNDCOLOR\*\/ no-repeat !important;/g,"background: "+backgrouncolor+" no-repeat !important;");
				
				if(fontcolor=="-moz-use-system-font") rawcss=rawcss.replace(/color: \/\*BACKGROUNDCOLOR\*\/ !important;/g,"");
				else rawcss=rawcss.replace(/color: \/\*BACKGROUNDCOLOR\*\/ !important;/g,"color: "+backgrouncolor+" !important;");
			
			}
			
			return rawcss;
		
		}
	  
		var getThreadPaneCSS=function(threadpanebackgroundcolor,fontcolor){

			if(threadpanebackgroundcolor=="-moz-use-system-font") return "";

			var isMac = ThemeFontSizeChanger.checkMac();
			if(isMac) var rawcss="#folderTree,#threadTree,#agenda-listbox,.calendar-task-tree {background-color: "+threadpanebackgroundcolor+" !important;} treechildren:-moz-tree-cell-text,treechildren:-moz-tree-cell-text(selected),treechildren:-moz-tree-cell-text(selected, focus),treechildren::-moz-tree-row,treechildren::-moz-tree-row(selected),treechildren::-moz-tree-row(selected, focus) {background-color: "+threadpanebackgroundcolor+" !important;color: "+fontcolor+" !important;}";
			else var rawcss="#folderTree,#threadTree,#agenda-listbox,.calendar-task-tree {background-color: "+threadpanebackgroundcolor+" !important;}";

			return rawcss;

		}	
		
		var getMacThunderbirFixCSS=function(size,fontfamily){

			var rawsizecss, rawfontfamilyss;

			if(size=="-moz-use-system-font") rawsizecss="";

			rawsizecss="treechildren:-moz-tree-row {height:"+Math.ceil(parseInt(size)*1.2)+"px !important;}";

			if(fontfamily=="-moz-use-system-font") rawfontfamilyss="";

			var rawfontfamilyss="treechildren:-moz-tree-cell-text,treechildren:-moz-tree-cell-text(selected),treechildren:-moz-tree-cell-text(selected, focus),treechildren::-moz-tree-row,treechildren::-moz-tree-row(selected),treechildren::-moz-tree-row(selected, focus) {font-family: "+fontfamily+" !important;";

			return rawsizecss+rawfontfamilyss;

		}
		
		var pB="extensions.themefontsizechangertb.";
		var nPB=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);		
		var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);
		
		var size=nPB.getCharPref(pB+"currentfontsize");
		var fontfamily=nPB.getCharPref(pB+"currentfontfamily");
		var fontstyle=nPB.getCharPref(pB+"currentfontstyle");
		var fontweight=nPB.getCharPref(pB+"currentfontweight");
		var fontcolor=nPB.getCharPref(pB+"currentfontcolor");
		var backgroundcolor=nPB.getCharPref(pB+"currentbackgroundcolor");
		var threadpanebackgroundcolor=nPB.getCharPref(pB+"currentthreadpanebackgroundcolor");
		
		var css = '@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n'
		+'@namespace html url("http://www.w3.org/1999/xhtml");\n'
		+'@namespace svg url("http://www.w3.org/2000/svg");\n'
		+'* {'
		+(size=="-moz-use-system-font" ? "" : 'font-size: '+ size + "px"+' !important;')
		+(fontfamily=="-moz-use-system-font" ? "" : "font-family:" + fontfamily + ' !important;')
		+(fontstyle=="-moz-use-system-font" ? "" : "font-style:" + fontstyle + ' !important;')
		+(fontweight=="-moz-use-system-font" ? "" : "font-weight:" + fontweight + ' !important;')	
		+(fontcolor=="-moz-use-system-font" ? "" : "color:" + fontcolor + ' !important;')
		+'}';
	
		if(nPB.getBoolPref(pB+"contextmenuenabled")) var contextCSS=getContextCSS(fontcolor,backgroundcolor);
		else var contextCSS="";
		
		var threadPaneCSS=getThreadPaneCSS(threadpanebackgroundcolor,fontcolor);								   
		if(xulRuntime.OS=="Darwin" && appInfo.name=="Thunderbird") var macThunderbirFixCSS=getMacThunderbirFixCSS(size,fontfamily);
		else var macThunderbirFixCSS="";

		return css + contextCSS + threadPaneCSS + macThunderbirFixCSS;	
	},
	addExtraCSS:function(){
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		var themefontsizechangertbprefsinstance = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);		
		var uri = ios.newURI('data:text/css,' + encodeURIComponent(this.getTFSCStyle()), null, null);
		if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
			sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
		}
		var themefontsizechangertbsbiconhide = themefontsizechangertbprefsinstance.getBoolPref("extensions.themefontsizechangertb.sbiconhide");
		if (themefontsizechangertbsbiconhide) {
			var css4 = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);#themefontsizechangertb-statusbar {display: none !important;}";
			var uri4 = ios.newURI("data:text/css," + encodeURIComponent(css4), null, null);
			if (!sss.sheetRegistered(uri4, sss.AGENT_SHEET)) {
				sss.loadAndRegisterSheet(uri4, sss.AGENT_SHEET);
			}			
		}
		var isThemeDefault = themefontsizechangertbprefsinstance.getCharPref("general.skins.selectedSkin") == "classic/1.0";
		if (!isThemeDefault) {
			var css2 = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);#tfsc-backgroundcolor-groupbox {display: none !important;}";
			var uri2 = ios.newURI("data:text/css," + encodeURIComponent(css2), null, null);
			if (!sss.sheetRegistered(uri2, sss.AGENT_SHEET)) {
				sss.loadAndRegisterSheet(uri2, sss.AGENT_SHEET);
			}			
		}			
		/*
		if (!themefontsizechangertbtoolsmnhide){
			var css = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);#themefontsizechangertb-tools-menu {display: -moz-box !important;}";
			var uri = ios.newURI("data:text/css," + css, null, null);
			if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
				sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
			}
		}
		*/
	},
	removeExtraCSS:function(){
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		var themefontsizechangertbprefsinstance = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);		
		var uri = ios.newURI('data:text/css,' + encodeURIComponent(this.getTFSCStyle()), null, null);
		if (sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
			sss.unregisterSheet(uri, sss.AGENT_SHEET);
		}
		var themefontsizechangertbsbiconhide = themefontsizechangertbprefsinstance.getBoolPref("extensions.themefontsizechangertb.sbiconhide");
		if (themefontsizechangertbsbiconhide) {
			var css4 = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);#themefontsizechangertb-statusbar {display: none !important;}";
			var uri4 = ios.newURI("data:text/css," + encodeURIComponent(css4), null, null);
			if (sss.sheetRegistered(uri4, sss.AGENT_SHEET)) {
				sss.unregisterSheet(uri4, sss.AGENT_SHEET);
			}			
		}
		var isThemeDefault = themefontsizechangertbprefsinstance.getCharPref("general.skins.selectedSkin") == "classic/1.0";
		if (!isThemeDefault) {
			var css2 = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);#tfsc-backgroundcolor-groupbox {display: none !important;}";
			var uri2 = ios.newURI("data:text/css," + encodeURIComponent(css2), null, null);
			if (sss.sheetRegistered(uri2, sss.AGENT_SHEET)) {
				sss.unregisterSheet(uri2, sss.AGENT_SHEET);
			}			
		}			
		/*
		if (!themefontsizechangertbtoolsmnhide){
			var css = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);#themefontsizechangertb-tools-menu {display: -moz-box !important;}";
			var uri = ios.newURI("data:text/css," + css, null, null);
			if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
				sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
			}
		}
		*/
	},	
	requestAddFullPageCSS:function(){
		if(this.prefsinstance.getCharPref("extensions.themefontsizechangertb.currentvideosize")=="fullpage") this.addFullPageCSS();	
	},
	addFullPageCSS:function(){
		this.registerStyle(this.getFullPageCSS());			
	},
	removeFullPageCSS:function(){
		this.unregisterStyle(this.getFullPageCSS()); 	  
	},
	getFullPageCSS:function(){
		return "chrome://themefontsizechangertb/content/style.css";
	},	
	requestRegisterObservers:function(){
		if(this.prefsinstance.getBoolPref("extensions.themefontsizechangertb.enableembeddedvideo")) {
			var c=Components.classes["@themefontsizechangertb/bootstartup;1"].getService().wrappedJSObject;
			c.registerObservers();
		}	
	},
	requestUnregisterObservers:function(){
		if(this.prefsinstance.getBoolPref("extensions.themefontsizechangertb.enableembeddedvideo")) {
			var c=Components.classes["@themefontsizechangertb/bootstartup;1"].getService().wrappedJSObject;
			c.unregisterObservers();
		}	
	},
	requestRegisterPrefObserver:function(){
		var c=Components.classes["@themefontsizechangertb/bootstartup;1"].getService().wrappedJSObject;
		c.registerPrefObserver();
	},
	requestUnregisterPrefObserver:function(){
		var c=Components.classes["@themefontsizechangertb/bootstartup;1"].getService().wrappedJSObject;
		c.unregisterPrefObserver();
	},
	lg:function(e,m){
		if(ThemeFontSizeChanger.getPrefValue("extensions.themefontsizechangertb.db")){
			switch(m) {
				case 0:
					try{
						var console = (ChromeUtils.import("resource://gre/modules/Console.jsm", {})).console;
						console.log(e); 
					}
					catch(error){
						var console = (ChromeUtils.import("resource://gre/modules/"+"devtools"+"/Console.jsm", {})).console;
						console.log(e);					  
					}			
				break;
				case 1:
					var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
					prompts.alert(null, ThemeFontSizeChanger.addonLiteralName, e + ((e.lineNumber) ? ("\n" + e.lineNumber) : ""));			
				break;
				case 2:
					Components.utils.reportError(e + ((e.lineNumber) ? ("\n" + e.lineNumber) : ""));
				break;
				default:
				//throw Components.utils.reportError("Unknown topic: "+e);
			}			
		}
	},
	compile:function(){
		if((build+'').length != 10) Services.prompt.alert(null, 'CompileAddon', 'An error occured');
		return true;
	}
}

function install(data) {
}

function uninstall(data,reason){
	if(reason!=ADDON_UNINSTALL) return;
	Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.themefontsizechangertb.").deleteBranch("");
	Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).clearUserPref("layout.css.devPixelsPerPx");	
	Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).flushBundles();
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const Cr = Components.results;
	const Cu = Components.utils;
	// modules that come with Firefox
	Cu.import("resource://gre/modules/XPCOMUtils.jsm");
	// LightweightThemeManager may not be not available (Firefox < 3.6 or Thunderbird)
	try { 
		Cu.import("resource://gre/modules/LightweightThemeManager.jsm"); 
	}
	catch (e) { 
		LightweightThemeManager = null; 
	}
	try { 
		//if(LightweightThemeManager.currentTheme.name == "Theme Font & Size Changer LightWeightTheme") {
			LightweightThemeManager.forgetUsedTheme(LightweightThemeManager.currentTheme.id);
		//}
	}
	catch (e) {
		try{
			LightweightThemeManager.currentTheme=null;
		}
		catch(e){} 
	}	
}

function startup(data, reason) {
	try{
		//console.log(data); 
		//console.log(reason); 
		if(!ThemeFontSizeChangerBootstrapAddon.compile()) return;
		ThemeFontSizeChangerBootstrapAddon.startup(data,reason);
	} catch(e){
		ThemeFontSizeChangerBootstrapAddon.lg(e,1);
	}
}

function shutdown(data, reason) {
	try{
		ThemeFontSizeChangerBootstrapAddon.shutdown(data,reason);
	} catch(e){
		ThemeFontSizeChangerBootstrapAddon.lg(e,1);
	}
}
