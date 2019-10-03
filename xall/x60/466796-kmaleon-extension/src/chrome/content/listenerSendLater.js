Components.utils.import("chrome://kmaleonext/content/modules/MailUtils.js");

var consoleSL = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);

var interval = window.setInterval(
	function() {
		funcionesSL.comprobarCarpetasBorrador(); 
	}, 120000); //Cada 5 min
         
var funcionesSL = 
{
    comprobarCarpetasBorrador: function ()
    {
        //consoleSL.logStringMessage("LISTENER SEND LATER");
        try
        {
            var accountdefaultLF =  Services.prefs.getCharPref(("mail.accountmanager.defaultaccount"));
            var accountdefaultidentityLF =  Services.prefs.getCharPref("mail.account."+accountdefaultLF+".identities");
            var defaultFolderDraftLF = Services.prefs.getCharPref(("mail.identity."+accountdefaultidentityLF+".draft_folder"));
            var folderSL = MailUtils.getFolderForURI(defaultFolderDraftLF, false);  //para crear uno .QueryInterface(Components.interfaces.nsIMsgFolder); //Se obtiene el folder de draft de la cuenta principal
            var mensajesFolderDRAFT = folderSL.messages;
           /* consoleSL.logStringMessage("\tURI: "+folderSL.URI);
            consoleSL.logStringMessage("\tMESSAGES: "+mensajesFolderDRAFT);
            consoleSL.logStringMessage("\tTOTALMESSAGES: "+folderSL.getTotalMessages(true));
            consoleSL.logStringMessage("FOLDER: "+gFolderDisplay.displayedFolder+ " URI: "+gFolderDisplay.selectedMessageUris);*/
            var contAUX = 0;
            var msgHeader = null;
            var dataENVIO, dataACTUAL;
            var horaSalida = "";
            while(mensajesFolderDRAFT.hasMoreElements() && contAUX < folderSL.getTotalMessages(true)) //Se itera sobre los mensajes que hay en Drafr (Borradores)
            {
                try
                {
                    msgHeader = mensajesFolderDRAFT.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr); //Obtenermos el header del mensaje
                    horaSalida = "";
                    horaSalida = funcionesSL.obtenerStringSalida(msgHeader.subject); //Obtenemos el subject del mensaje
                    
                    //consoleSL.logStringMessage("La fecha de envio es: " + horaSalida);
                    if(horaSalida.length > 1)
                    {
                        dataACTUAL = new Date();
                        dataENVIO = new Date(horaSalida);

                        consoleSL.logStringMessage("dataACTUAL: " + dataACTUAL + "\ndataENVIO: " + dataENVIO);                                       
                        if(dataACTUAL.getTime()>dataENVIO.getTime()) //Si la fecha actual es mas grande que la del envio se tiene que enviar 
                        {
                            consoleSL.logStringMessage("HAY QUE ENVIAR");
                            
                            var arrayHDR = new Array();
                            //msgHeader.subject = "MODI " + msgHeader.subject.replace("[date="+horaSalida+"]","");
                            arrayHDR[0] = folderSL.getUriForMsg(msgHeader);
                            funcionesSL.AbrirMensajeDraft(folderSL,arrayHDR);

                        }else
                        {
                            consoleSL.logStringMessage("NO HAY QUE ENVIAR");
                        }
                    
                    }else
                    {

                    }
                    contAUX++;
                }catch(ex)
                {
                    contAUX++;
                    consoleSL.logStringMessage(ex); 
                }

            }
            
        }catch(ex)
        {
            consoleSL.logStringMessage(ex);
        }
        
    },
    AbrirMensajeDraft: function(folder,uriArray)
    {
      /*ComposeMessage(Components.interfaces.nsIMsgCompType.Draft,
                     Components.interfaces.nsIMsgCompFormat.Default,
                     gFolderDisplay.displayedFolder,
                     gFolderDisplay.selectedMessageUris);*/
        consoleSL.logStringMessage("INTERNO-> FOLDER: "+folder+ " URI: "+uriArray);
        ComposeMessage(Components.interfaces.nsIMsgCompType.Draft,
                     Components.interfaces.nsIMsgCompFormat.Default,
                     folder,
                     uriArray);
    },
    obtenerStringSalida: function(subject)
    {
        //var endDate = new Date("2011-06-09T15:20:00");
        //en la etiqueta: [date=2011-06-09T15:20:00]
        try
        {
            var resultB = funcionesSL.buscarStringSL(subject,"[date=")
            
            if(resultB != -1)
            {
                
                var resultS = subject.search("]")
                if(resultS != -1)
                {
                    return subject.substring(6,resultS); //el 6 es para quitar el [date= de delante
                }else
                {
                    return "";
                }
                
            }else
            {
                return "";
            }
            
        }catch(ex)
        {
            consoleSL.logStringMessage(ex);
            return "";
        }
    },
    buscarStringSL: function (cadena_origen, cadena_buscar) //La cadena origen es la cadena donde se quiere buscar y la cadena_buscar es la cadena que se quiere buscar
    {	
            var i=0;
            if(cadena_origen.length <= 0 || cadena_buscar.length <= 0)//Las dos cadenas tienen que ser mas grandes que 0
            {
				return -1;
            }
            if(cadena_origen.length<cadena_buscar.length)
            {
				return -1;
            }

            do
            {
				if(cadena_origen[i] == cadena_buscar[i])
				{
					i++;
				}else
				{
					return -1;
				}		

            }while(i<cadena_buscar.length&&i<cadena_origen.length);

            return 1;
    }
};


/* //Procesar todos los folders
 function processFolder(folderID){
   
   if (folderID >=window.document.getElementById('folderTree').view.rowCount)
      generateSubject();
   else{
      if(!window.document.getElementById('folderTree').view.getLevel(folderID) == 0){
         try{
            var folderResource = GetFolderResource(window.document.getElementById('folderTree'), folderID);
            var folder = GetMsgFolderFromUri(folderResource.Value, false);
            //var messageList = folder.getMessages(null);
         }catch (err) { 
            // only get here if there are no messages in the folder
            dump("no messages in the folder");
            folderID++;
            processFolder(folderID);
            return;
         }
         collectMsgData(folder, folderID);
      }
      else {
         dump ("processed account");
         folderID++;
         processFolder(folderID)
      }
         
   }
}

function collectMsgData(folder, folderID){

   var msgEnu = folder.messages;
      
   while(msgEnu.hasMoreElements()){
      msgHeader = msgEnu.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
      msgUriArray[count] = msgHeader.folder.getUriForMsg(msgHeader);  
      msgHdrArray[count] = msgHeader;
      msgSubArray[count] = msgHeader.subject;
      msgAuthorArray[count] = msgHeader.author;
      count++;
   }
   folderID++;
   processFolder(folderID);

}
 */