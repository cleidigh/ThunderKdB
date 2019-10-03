Components.utils.import("resource://gre/modules/FileUtils.jsm");

var console2 = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
var contattach = 0;
var lasturimessage = "";
var attachmentslist = "";
var msgHdr = "";
var timeA = new Date();	
var subjectA = "empty";
var recipientsA = "empty";
var autorA = "empty";
var emailA = "empty";
var tipoAnexadoAttach = "";
var pathAtt = "";

window.addEventListener("select", function(e) { 
	startup1(); 
}, false);

function startup1()
{
	popup_functions.click_popup();
}

var popup_functions =
{
	
	setTipoAnex: function(tAnexado)
	{
		tipoAnexadoAttach = tAnexado;
	},
	click_popup: function ()
	{		
		try
		{
			if ((gFolderDisplay != null) && (gFolderDisplay.selectedCount > 0)) //Si hay como mínimo un mensaje seleccionado.
			{
				var MessageURI = gFolderDisplay.selectedMessageUris[0].toString();

				if (lasturimessage != MessageURI)
				{
					lasturimessage = MessageURI;
					
					var popupatt = document.getElementById("popup_attach");	
					var popupatt2 = document.getElementById("popup_attach2");
					var popupatt_ref = document.getElementById("popup_attach_ref");	
					var popupatt2_ref = document.getElementById("popup_attach2_ref");
						
					if(popupatt != null)
					{
						while (popupatt.firstChild) 
						{
							popupatt.removeChild(popupatt.firstChild);
						}
					}
					
					if(popupatt2 != null)
					{
						while (popupatt2.firstChild) 
						{
							popupatt2.removeChild(popupatt2.firstChild);
						}
					}
					
					if(popupatt_ref != null)
					{
						while (popupatt_ref.firstChild) 
						{
							popupatt_ref.removeChild(popupatt_ref.firstChild);
						}
					}
					
					if(popupatt2_ref != null)
					{
						while (popupatt2_ref.firstChild) 
						{
							popupatt2_ref.removeChild(popupatt2_ref.firstChild);
						}
					}

					msgHdr = gFolderDisplay.selectedMessages[0];
					
					MsgHdrToMimeMessage(msgHdr, null, function (aMsgHdr, aMimeMsg) {
						try 
						{
							attachmentslist = "";
							attachmentslist = aMimeMsg.allUserAttachments || aMimeMsg.allAttachments;
														
							var indice = 0;														
							for (var att of attachmentslist)
							{
								var menitem = document.createElement("menuitem");
								menitem.setAttribute("label", att.name);
								var stringaux = "guardarAttach.Save(" + indice + ");";
								menitem.setAttribute("onclick", stringaux);
								
								var menitem2 = document.createElement("menuitem");
								menitem2.setAttribute("label", att.name);
								menitem2.setAttribute("onclick", stringaux);
								
								var menitem3 = document.createElement("menuitem");
								menitem3.setAttribute("label", att.name);
								menitem3.setAttribute("onclick", stringaux);
								
								var menitem4 = document.createElement("menuitem");
								menitem4.setAttribute("label", att.name);
								menitem4.setAttribute("onclick", stringaux);
																
								if(popupatt != null)
								{
									popupatt.appendChild(menitem);
								}
								if(popupatt2 != null)
								{
									popupatt2.appendChild(menitem2);
								}
								if(popupatt_ref != null)
								{
									popupatt_ref.appendChild(menitem3);
								}
								
								if(popupatt2_ref != null)
								{
									popupatt2_ref.appendChild(menitem4);
								}								
								indice++;
							}
														
							if (attachmentslist.length > 1) {						
								var menitem = document.createElement("menuitem");
								menitem.setAttribute("label", ">>ANEXAR TODOS LOS ADJUNTOS");
								var stringaux = "guardarAttach.Save(-1);";
								menitem.setAttribute("onclick", stringaux);
								
								var menitem2 = document.createElement("menuitem");
								menitem2.setAttribute("label", ">>ANEXAR TODOS LOS ADJUNTOS");
								menitem2.setAttribute("onclick", stringaux);
								
								var menitem3 = document.createElement("menuitem");
								menitem3.setAttribute("label", ">>ANEXAR TODOS LOS ADJUNTOS");
								menitem3.setAttribute("onclick", stringaux);
								
								var menitem4 = document.createElement("menuitem");
								menitem4.setAttribute("label", ">>ANEXAR TODOS LOS ADJUNTOS");
								menitem4.setAttribute("onclick", stringaux);
								
								if(popupatt != null)
								{
									popupatt.appendChild(menitem);
								}
								if(popupatt2 != null)
								{
									popupatt2.appendChild(menitem2);
								}
								if(popupatt_ref != null)
								{
									popupatt_ref.appendChild(menitem3);
								}
								
								if(popupatt2_ref != null)
								{
									popupatt2_ref.appendChild(menitem4);
								}
							}
								
							if(attachmentslist.length > 0) //Para activar o desactivar el botón según si hay attachments o no.
							{								
								if(document.getElementById("save-attachment") != null)
								{
									document.getElementById("save-attachment").disabled = false;
								}
								if(document.getElementById("buttonexteriorA") != null)
								{
									document.getElementById("buttonexteriorA").disabled = false;
								}
								if(document.getElementById("save-attachment-ref") != null)
								{
									document.getElementById("save-attachment-ref").disabled = false;
								}
								if(document.getElementById("buttonexteriorAR") != null)
								{
									document.getElementById("buttonexteriorAR").disabled = false;
								}
							}else
							{
								if(document.getElementById("save-attachment") != null)
								{
									document.getElementById("save-attachment").disabled = true;
								}
								if(document.getElementById("buttonexteriorA") != null)
								{
									document.getElementById("buttonexteriorA").disabled = true;
								}
								if(document.getElementById("save-attachment-ref") != null)
								{
									document.getElementById("save-attachment-ref").disabled = true;
								}
								if(document.getElementById("buttonexteriorAR") != null)
								{
									document.getElementById("buttonexteriorAR").disabled = true;
								}
							}														
						} catch (ex) 
						{
							console2.logStringMessage("ErrorSaveAttachments - MsgHdrToMimeMessage: " + ex);
						}
					}, true, { examineEncryptedParts: true, });
						
				}
			}
		}catch(ex)
		{
			console2.logStringMessage("ErrorSaveAttachments: " + ex);
		}
	}
}

var guardarAttach =
{
	Save: function (index)
	{
		try
		{
			if (index != -1) {
				var att = attachmentslist[index];
				var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
				pathAtt = file.path + "\\" + att.name;			
				var msguri = msgHdr.folder.getUriForMsg(msgHdr);
				messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
				messenger.saveAttachmentToFolder(att.contentType, att.url, encodeURIComponent(att.name), msguri, file);
			} else {		
				var tmpDir = FileUtils.getFile("TmpD", ["LATB"]);
				if (tmpDir.exists()) {
					tmpDir.remove(true);
				}
				tmpDir.create(tmpDir.DIRECTORY_TYPE, 0775);
														
				for (var att of attachmentslist) {							
					var msguri = msgHdr.folder.getUriForMsg(msgHdr);
					messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
					messenger.saveAttachmentToFolder(att.contentType, att.url, encodeURIComponent(att.name), msguri, tmpDir);				
				}
				pathAtt = tmpDir.path;				
			}			
			
			cargarVariablesEmail(msgHdr);
			ejecutarProgramaGuardadoA(attachmentslist.length);
		}catch(ex)
		{
			console2.logStringMessage("Error: " + ex);
		}
	}
}

function cargarVariablesEmail(header)
{
	try
	{
		timeA.setTime((gFolderDisplay.selectedMessage.date/1000));
	}catch(ex)
	{
		console2.logStringMessage("Error. " + ex);
		timeA = "empty";
	}	
	subjectA = gFolderDisplay.selectedMessage.mime2DecodedSubject;
	if(subjectA.length<1)
	{
		subjectA = "empty";
	}
	recipientsA = gFolderDisplay.selectedMessage.mime2DecodedRecipients;
	if(recipientsA.length<1)
	{
		recipientsA = "empty";
	}		
	autorA = gFolderDisplay.selectedMessage.mime2DecodedAuthor;
	if(autorA.length<1)
	{
		autorA = "empty";
	}	
	var result = autorA.search("<");
	if(result == -1)
	{
		emailA = autorA;
	}else
	{
		emailA =  autorA.substring((result + 1),(autorA.length - 1));
		if(result > 1){
			var aux = autorA.substring(0,(result - 1));
			autorA = aux;
		}
		if(emailA.length < 1)
		{
			emailA = "empty";
		}
	}
}

function ejecutarProgramaGuardadoA (numAtts)
{		
	//Leemos el archivo de configuracion linea a linea.
	var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
	file.initWithPath(buscarKMDDEtxt());
	
	if(file.exists())
	{
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
		istream.init(file, 0x01, 0444, 0);
		istream.QueryInterface(Components.interfaces.nsILineInputStream);

		var line = {}, linea, hasmore;
		var fin = false;
		var resultbusq
		var pathapp = ""; //Aqui se inicializara el path dnd esta el .exe que trata a los emails.
		do 
		{
			hasmore = istream.readLine(line);
			linea = line.value;

			resultbusq = linea.search("APP_PATH");
			if(resultbusq != -1) //Si ha leido la parte del KMDDE que tiene el APP_PATH.
			{
				fin = true;
				pathapp = linea.substring((linea.search("=") + 1), linea.length) + "\\GuardarEmail.exe";
			}	  
		} while((hasmore) && (fin==false));
		istream.close();
				
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
		file.initWithPath(pathapp);
		
		var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		process.init(file);
					
		var auxTimeStringA	= timeA.getDate() + "/" + (timeA.getMonth() + 1) + "/" + timeA.getFullYear() + " " + timeA.getHours() + ":" + timeA.getMinutes();
		var args = [pathAtt, emailA, recipientsA, auxTimeStringA, autorA, subjectA, 2, tipoAnexadoAttach, numAtts];
		process.run(false, args, args.length);
	}else
	{
		console2.logStringMessage("El fichero de appdata no existe: " + file.path);
	}	
}
