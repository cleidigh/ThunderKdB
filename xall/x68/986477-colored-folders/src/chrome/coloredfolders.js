/* *
 * @package     Lab5 - Colored Folders
 *
 * version :  v1.3.4
 *
 * @author	:	Lab5 - Dennis Riegelsberger
 * @authorUrl	:	https://lab5.ch
 * @authorEmail	:	info@lab5.ch
 * @copyright	:	(C) 2019+ Lab5 - Dennis Riegelsberger.  / Copyright(c) 2011-2013 fisheater. All rights reserved.
 * @copyrightUrl	:	https://lab5.ch
 * @license	:	GNU General Public License version 2 or later;
 * @licenseUrl	:	https://www.gnu.org/licenses/gpl-2.0.html
 * @project	:	https://lab5.ch/blog
 * @CHANGELOG :
 * * 
			// Color Folders v1.0
			// Color Folders v1.1
			//   Modified to follow the API change in Gecko 22 and onwards
			//   (NB: TB replaced Gecko 17 with "24" at TB 24)
			//   thanks so much to Strim for providing thie modification.
			// Copyright(c) 2011-2013 fisheater
			// Released under Mozilla Public License, version 2.0

			// Color Folders v1.2
			// Corrected, resurrected, restaurated, extended and republished by Lab5 ( www.lab5.ch ) , anno 2019
			// Color Folders v1.3
			// Modded to follow new achitecture requirement
			// Extended the color-palette
 */ 
 
/////////////////////////////////////////////////////////////////////////////////

// console.log("ColoredFolders : JS File loaded.");

if(!com) var com = {};
if(!com.fisheater) com.fisheater = {};
if(!com.fisheater.colorFolders) com.fisheater.colorFolders = {};
if(!com.fisheater.is_loaded) com.fisheater.is_loaded = false; 

com.fisheater.colorFolders = {
	  
	debug: false, // false true
	  
	//////////////////////////////////////////////////////
	init: function() {
	//////////////////////////////////////////////////////
					
					if(this.debug ) console.log("ColoredFolders : INIT ");
					
					if( com.fisheater.is_loaded ){
						
									if(this.debug ) console.log("ColoredFolders : ALREADY LOADED :) ");
						
					}
					
					com.fisheater.is_loaded = true; 
					window.removeEventListener("load", com.fisheater.colorFolders.init, false);
					
					/* * *
					https://developer.thunderbird.net/add-ons/updates/tb68#changed-xul-elements
					https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Thunderbird_extensions/Styling_the_Folder_Pane
					https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeView#getCellProperties()
					* * */
					
					//////////////////////////////////
					// override function getCellProperties()
					//////////////////////////////////
					gFolderTreeView.originalGetCellProperties = gFolderTreeView.getCellProperties;
					gFolderTreeView.getCellProperties = function(row, col) {
							
							var props = gFolderTreeView.originalGetCellProperties(row, col);
							if (col.id == "folderNameCol") {
								
										var folder = gFolderTreeView.getFolderForIndex(row);
										
										////////////////
										var folderType = com.fisheater.colorFolders.getFolderType( folder );
										// to have standard folders artificially have its own type/'flag'
										/* 
										Because the old Version worked this way :  Since teh Default folders do not have a flag, the CSS set the standart Icon as the default for absolutely ALL folders and then reconstruct the folders we DONT need to normal via CSS. - Now we can specifically only reference the Folders we need.
										*/
										if ( folderType == "normal" && !folder.isServer ) {
											
													props += " " + "folderType-normal"; 
										}
										////////////////
										var folderColor;
										
										if ( folderColor = folder.getStringProperty("folderColor") ) {
												
														if(this.debug ) console.log("ColoredFolders loop : " + folderColor );
													
														// save folder color
														props += " " + folderColor;
												
										}
										////////////////
										
							}
							return props;
						
					} // end of override
					//////////////////////////////////
					
					
					// addEventListener for onPopupShowing for folderPaneContext
					var elm = document.getElementById("folderPaneContext");
					elm.addEventListener("popupshowing", com.fisheater.colorFolders.onPopupShowing, false);

					
					// addEventListener for onCommand for folderColorPopup
					elm = document.getElementById("folderColorPopup");
					elm.addEventListener("command", com.fisheater.colorFolders.setFolderColor, false);


					// addEventListener for onSelect for folderColorPicker (capture = true)
					elm = document.getElementById("folderColorPicker");
					elm.addEventListener("change", com.fisheater.colorFolders.setFolderColor, true);
					// elm.addEventListener("input", com.fisheater.colorFolders.setFolderColor, true); // already on select of field ( without even confirming ).

					if(this.debug ) console.log("ColoredFolders : INIT eof ");

	},
	///////////////////////////////////////////////////////////////////////////////////
	// event listener for popup menu
	setFolderColor: function(event) {
	///////////////////////////////////////////////////////////////////////////////////

					
					if(this.debug ) console.log("ColoredFolders : setFolderColor");
					
					/*****
					
					// MIGRATE Elements :
					https://developer.thunderbird.net/add-ons/tb68/changes#less-than-colorpicker-greater-than
					
					// OLD ELEMENTS : 
					colorpicker :
					https://developer.mozilla.org/en-US/docs/Archive/Mozilla/XUL/colorpicker
					
					// ELEMENTS : 
					=> migrate to =>
					https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Input/color
					
					*****/
					
					var id = event.target.id;
					var folderColor;
					//////////////////////////////////
					if (id == "folderColorPicker") {
					//////////////////////////////////
					
									folderColor = document.getElementById("folderColorPicker").value;
									folderColor = folderColor.replace("#", "folderColor");
									
									if(this.debug ) console.log("setFolderColor : #folderColorPicker : " + folderColor );

									folderColor = "folderColor" + folderColor.substring( 1, 7 );
						
					//////////////////////////////////
					} else if (id != "folderColorPopup") {
					//////////////////////////////////
					
									var folderColor = event.target.value;
									
									if(this.debug ) console.log("setFolderColor : ! #folderColorPopup : " + folderColor );
									
									if (folderColor == "folderColorTypeDefault") { folderColor = ""; }
						
					}  ////////////////////////////////
					
					
					//////////////////////////////////
					// apply for all selected folders
					//////////////////////////////////
					
					
							var folders = gFolderTreeView.getSelectedFolders();
							for  (var  fndx in folders) {
								
										
											var folder = folders[fndx];
											folder.setStringProperty("folderColor", folderColor);
											// folder.style.listStyleImage = "url('chrome://coloredfolders/skin/foldersvg2.svg')"; 
				
											/* * *
											for( folder_attr in folder ){
												
																if(this.debug ) console.log( "folder_attr: "+ folder_attr +" : "+ folder.folder_attr); 
											}
											* * */
							}
					
					//////////////////////////////////
					// close popup
					//////////////////////////////////
					
							// necessary as selecting colorpicker does not close popup
							// must be here otherwise 'selectedFolders' are lost and gets back to previous selection
							document.getElementById("folderPaneContext").hidePopup();
				
					/*****
					//////////////////////////////////
					// force redraw the folder pane
					//////////////////////////////////
					
							// var box = document.getElementById("folderTree").boxObject;
							// box.QueryInterface(Components.interfaces.nsITreeBoxObject);
							// box.invalidate();
							https://developer.thunderbird.net/add-ons/tb68/changes#nsitreeboxobject-nsitreecolumn-nsitreeview
							https://developer.thunderbird.net/add-ons/tb78/changes#window-queryinterface
					
					*****/

	},
	//////////////////////////////////////////////////////
	// event listener for popupshowing
	getFolderType: function( folder ) {
	//////////////////////////////////////////////////////
	
							/* * *
							Defined here :
							https://dxr.mozilla.org/comm-central/source/comm/mailnews/base/public/nsMsgFolderFlags.idl
							* * */
							const specialFolderFlagsMask = Components.interfaces.nsMsgFolderFlags.SpecialUse;
							/* * *
									// New and shorter form of  : 
									SpecialUse = Inbox|Drafts|Trash|SentMail|Templates|Junk|Archive|Queue;
									Components.interfaces.nsMsgFolderFlags.Inbox | ... rFlags.Drafts | . . . 
							* * */
							
							///////////////////////////////////////
							var type = "";
							
										// if ( folder.isServer || folder.flags & specialFolderFlagsMask ) {
										if ( 
												( folder.isServer && !( folder.server.type == "nntp" || folder.server.type == "rss" ) ) ||  
												( !folder.isServer && ( folder.server.type == "nntp" || folder.server.type == "rss" ) ) ||  
												( folder.flags & specialFolderFlagsMask ) ) 
										{
														// to disable menu "folderPaneContext-colorFolders" if any one of folders is special
														type = "special";
														return type;	
											
										}else if ( folder.flags & Components.interfaces.nsMsgFolderFlags.Virtual ) {
									 
														if (type == "") {
																type = "virtual";
														}
														else if (type != "virtual") {
																type = "normal";
																// break; // ???
														}
										}					
										else if ( folder.server.type == "nntp" || folder.server.type == "rss" ) {
												
														if (type == "") {
																type = folder.server.type;
														}
														else if (type != folder.server.type) {
																type = "normal";
																// break; // ???
														}
										}
										else {
														type = "normal";
										}
										
							///////////////////////////////////////
										
					return type;					

	},
	//////////////////////////////////////////////////////
	// event listener for popupshowing
	onPopupShowing: function(event) {
	//////////////////////////////////////////////////////
	
				if(this.debug ) console.log("ColoredFolders : onPopupShowing ");

				if (event.target.id == "folderPaneContext") {
					
							/*****
							
							https://developer.mozilla.org/en-US/docs/Archive/Mozilla/XUL/XUL_controls
							https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Thunderbird_extensions/Styling_the_Folder_Pane
							
							*****/
							
							var folders = gFolderTreeView.getSelectedFolders();
						
							var type = "";
							
							/////////////////////////////////////////////////////////
							for  (var  fndx in folders) {
										
										var folder = folders[fndx];
										
										console.log( "---------------------" );
										console.log("folder.isServer : " + folder.isServer );
										console.log("folder.flags : " + folder.flags );
										console.log("folder.server.type : " + folder.server.type );
										
										AAAA_coloredfolders_Lastfolder = folder ;
										
							}
							/* * *
							* * */
							/////////////////////////////////////////////////////////
							for  (var  fndx in folders) {
										
										var folder = folders[fndx];
										
										type = com.fisheater.colorFolders.getFolderType( folder );
										// to disable menu "folderPaneContext-colorFolders" if any one of folders is special
										if ( type == "special" ) break;
										
							}
							/////////////////////////////////////////////////////////
							if ( type != "special" )  {
							for  (var  fndx in folders) {
											
											var folder = folders[fndx];
											
											type = com.fisheater.colorFolders.getFolderType( folder );
											// to have standard folder icons in popup if not all types are the same
											if ( type == "normal" ) break;
										
							} }
							/////////////////////////////////////////////////////////
							
							
							if(this.debug ) console.log("type = " + type );
							
							
							var aMenu = document.getElementById("folderPaneContext-colorFolders");
							if ( type == "special" ) {
												
												// disabling menu "folderPaneContext-colorFolders" if any one of folders is special
												aMenu.disabled = true; 
							}
							else {
										
												aMenu.disabled = false;
												var aPopup = document.getElementById("folderColorPopup");
												
												if (type == "virtual" ) {
													// having virtual folder icons in popup if all folders are virtual
													aPopup.setAttribute("class", "folderColorTypeVirtual", "");
												}	
												else if (type == "rss" ) {
													// having rss folder icons in popup if all folders are rss
													aPopup.setAttribute("class", "folderColorTypeRss", "");
												}	
												else if (type == "nntp" ) {
													// having nntp folder icons in popup if all folders are nntp
													aPopup.setAttribute("class", "folderColorTypeNntp", "");
												}	
												else {
													// having standard folder icons in popup if any one of folders is normal
													aPopup.setAttribute("class", "folderColorTypeDefault", "");
												}
												
												// set "More Colors..." menu an icon
												var folderColor = document.getElementById("folderColorPicker").value;
												folderColor = "folderColor" + folderColor.substring( 1, 7 );

												aPopup = document.getElementById("folderColorMoreColors");
												aPopup.setAttribute("class", "menu-iconic "+folderColor, "")
												
												/*****
												
												https://developer.thunderbird.net/add-ons/tb68/changes#less-than-colorpicker-greater-than
												
												colorpicker :
												https://developer.mozilla.org/en-US/docs/Archive/Mozilla/XUL/colorpicker
												
												=> migrate to =>
												https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Input/color
												
												*****/
												
							}
				}
	},
	//////////////////////////////////////////////////////
	debugMsg: function(event) {
	//////////////////////////////////////////////////////

						console.log("ColoredFolders : debugMsg ");

	} //////////////////////////////////////////////////// 

};


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener("load", com.fisheater.colorFolders.init, false);
