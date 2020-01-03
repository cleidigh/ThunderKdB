addEventListener("compose-send-message", autoAddressCleanerMain, true);

function autoAddressCleanerMain(evt)
{
	var msgType = document.getElementById("msgcomposeWindow").getAttribute("msgtype");
	//Now: 0, Later: 1, Save: 2, SaveAs: 3, SaveAsDraft: 4, SaveAsTemplate: 5, SendUnsent: 6, AutoSaveAsDraft: 7, Background: 8
	//console.log(document.getElementById("msgcomposeWindow").getAttribute("msgtype"));
	var donothing = [2, 4, 7, 5];
	if (gMsgCompose && gMsgCompose.compFields)
	{
	    //if (msgType == nsIMsgCompDeliverMode.Save ||
	    //  msgType == nsIMsgCompDeliverMode.SaveAsDraft ||
	    //  msgType == nsIMsgCompDeliverMode.AutoSaveAsDraft ||
	    //  msgType == nsIMsgCompDeliverMode.SaveAsTemplate)
	    if (donothing.includes(Number(msgType)))
	    {
            //do nothing
        }
        else
        {
		    if (gMsgCompose.compFields.to)
		        gMsgCompose.compFields.to = stripDisplayName(gMsgCompose.compFields.to);
		        
		    if (gMsgCompose.compFields.cc)
		        gMsgCompose.compFields.cc = stripDisplayName(gMsgCompose.compFields.cc);
		        
		    if (gMsgCompose.compFields.bcc)
		        gMsgCompose.compFields.bcc = stripDisplayName(gMsgCompose.compFields.bcc);
			removeEventListener("compose-send-message", autoAddressCleanerMain, true);
		}
	}
}

function stripDisplayName(addresses)
{
	var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
							.getService(Components.interfaces.nsIMsgHeaderParser);

	var strippedAddresses = {};
	try {
		// 72.01 or higher
		strippedAddresses = msgHeaderParser.makeFromDisplayAddress(addresses, {}).map(fullValue => msgHeaderParser.makeFromDisplayAddress(fullValue.email, fullValue.name)).join(", ");
	}
	catch (ex) {
		// 68.2 ok
		var fullNames = {};
		var names = {};
		var numAddresses =  0;
		msgHeaderParser.parseHeadersWithArray(addresses, strippedAddresses, names, fullNames, numAddresses);
		strippedAddresses = strippedAddresses.value.join(",");
	}
	//return strippedAddresses.value.join(",");
	return strippedAddresses;
}
