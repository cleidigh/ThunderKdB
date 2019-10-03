/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Sun Microsystems code.
 *
 * The Initial Developer of the Original Code is Sun Microsystems.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   diesmo <partoche@yahoo.com>
 *   Andreas Noback <netz@rechnerpool.com>
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
const XML_HEADER = '<?xml version="1.0" encoding="utf-8" ?>';

const DAV_PRIVILEGES = ['all', 'read','read-acl','write-acl','unbind','write-properties','write-content','bind'];

let gPropertySetUrisCache = {};
let gPrincipalUrisCache = {};

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://calendar/modules/calUtils.jsm");

/**
 *  getPrincipalPropertySetURI  *
 *  searchPrincipal
 *  searchCalendarHome
 * 
 *  Retrieves the principals location (/dav/principals, /principals/users, etc.)
 *  calendarUri : the calendar on which the request should be run
 *  opListener    : The result/error handler
 */
function getPrincipalPropertySetURI(calendarUri, opListener) {
  // The selected calendar
  let uri = calendarUri.clone();
  
  // Ensure trailing slash
  uri = uri.mutate().setPathQueryRef(addTrailingSlash(uri.pathQueryRef)).finalize(); 
  
  if (gPropertySetUrisCache[uri.pathQueryRef]) {
    opListener.onResult(gPropertySetUrisCache[uri.pathQueryRef]);
    return;
  }
  // Prepare the request  
  let  xmlQuery =   '<D:propfind xmlns:D="DAV:">\n' +
                    '  <D:prop>\n' +
                    '    <D:principal-collection-set/>\n' +
                    '  </D:prop>\n' +
                    '</D:propfind>';
  xmlQuery = XML_HEADER + xmlQuery;
 
  logIt("SERVER: "+uri.spec+" PATH: "+uri.pathQueryRef+" REQUEST :" + xmlQuery);
 
  let resultHandler = {};
  resultHandler.onError = function(status) {
    opListener.onError(status);
  };
  resultHandler.onResult = function(multistatus) {
    logIt(multistatus);
	
	let doc = cal.xml.parseString(multistatus);
    
	let res = doc.getElementsByTagNameNS('DAV:','principal-collection-set')[0]
	             .getElementsByTagNameNS('DAV:','href')[0].textContent;
    
	opListener.onResult(res);
    
	gPropertySetUrisCache[uri.pathQueryRef] = res;
  };
  runXmlHttpRequest(uri, "PROPFIND", {Depth:0}, xmlQuery, resultHandler, calendarUri);
}

/**
 *  getPrincipalPropertySetURI  
 *  searchPrincipal            *
 *  searchCalendarHome
 * 
 *  Search for a principal
 *  calendarUri : the calendar on which the request should be run
 *  opListener  : The result/error handler
 */
function searchPrincipal(calendarUri, str,opListener) 
{ 
  let resultHandler = {};
  resultHandler.onError = function(statusCode) {
    opListener.onError(statusCode);
  };
  resultHandler.onResult = function(principalPropertySetUri) {
    let uri = calendarUri.clone();
    uri = uri.mutate().setPathQueryRef(principalPropertySetUri).finalize(); 
	
	
	logIt("URIIIII " +  principalPropertySetUri);
	for( let i in uri)
    logIt("URI -->" + i + '=' + uri[i]);
 
   logIt("URI PATH -->" + uri.pathQueryRef);
	
    
    // Prepare the request  
    let  xmlQuery = '<D:principal-property-search xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n'+
                    '    <D:property-search>\n'+
                    '        <D:prop>\n'+
                    '            <D:displayname/>\n'+
                    '        </D:prop>\n'+
                    '        <D:match>'+str+'</D:match>\n'+
                    '    </D:property-search>\n'+
                    '    <D:prop>\n'+
                    '        <C:calendar-home-set/>\n'+
                    '        <D:displayname/>\n'+
                    '        <C:calendar-user-type />\n'+
                    '    </D:prop>\n'+
                    '</D:principal-property-search>';
    xmlQuery = XML_HEADER + xmlQuery;
  
    let resultHandler2 = {};
    resultHandler2.onError = function(statusCode) {
      opListener.onError(statusCode);
    };
    resultHandler2.onResult = function(responseStr) {
	
	  let responseXML = cal.xml.parseString(responseStr);
	  let responses = responseXML.getElementsByTagNameNS('DAV:','response');
      for(let i=0; i < responses.length; i++) {
	    let response = responses[i];
	    let principal = response.getElementsByTagNameNS('DAV:','href')[0].textContent;
        let principalType = 'USER';
		principalType = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar-user-type')[0].textContent;

        
        let mail = principal.replace(uri.pathQueryRef, '');
        mail = principal.replace('/','');

        let displayName = response.getElementsByTagNameNS('DAV:','displayname')[0].textContent;
        
		let calendarHomeSets = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav','calendar-home-set');
		let calendarHomeSet = null;
		
		// If href is empty, most probably the access is forbidden, check this and 
		// disable the entry
		if(calendarHomeSets.length > 0) {
		  hrefs = calendarHomeSets[0].getElementsByTagNameNS('DAV:','href');
		  if(hrefs.length > 0) {
		    calendarHomeSet = hrefs[0].textContent;
		  }
		}
		
		opListener.onResult( [{'principal':principal, 'mail':mail, 'type':principalType, 
		                       'displayName':displayName, 'calendarHomeSet':calendarHomeSet}
							 ]);
	 }
     opListener.onFinish();		
    };
    runXmlHttpRequest(uri, "REPORT", {Depth:0}, xmlQuery, resultHandler2, calendarUri);
  };
  getPrincipalPropertySetURI(calendarUri, resultHandler);
}


/**
 *  getCurrentUserPrincipalURI  *
 *  getCalendarHomeSetURI
 * 
 *  Retrieves the location for the current principal (currently logged in user)
 *  calendarUri : the calendar on which the request should be run (should not point to another principal)
 *  opListener    : The result/error handler
 */
function getCurrentUserPrincipalURI(calendarUri, opListener) {
  // The selected calendar
  let uri = calendarUri.clone();
  logIt("URI -->" + uri);
  // Ensure trailing slash
  uri = uri.mutate().setPathQueryRef(addTrailingSlash(uri.pathQueryRef)).finalize(); 
  
  if (gPrincipalUrisCache[uri.pathQueryRef]) {
    opListener.onResult(gPrincipalUrisCache[uri.pathQueryRef]);
    return;
  }
  // Prepare the request  
  let  xmlQuery =   '<D:propfind xmlns:D="DAV:">\n' +
                    '  <D:prop>\n' +
                    '    <D:current-user-principal/>\n' +
                    '  </D:prop>\n' +
                    '</D:propfind>';
  xmlQuery = XML_HEADER + xmlQuery;
 
  logIt("SERVER: "+uri.spec+" PATH: "+uri.pathQueryRef+" REQUEST :" + xmlQuery);
 
  let resultHandler = {};
  resultHandler.onError = function(status) {
    opListener.onError(status);
  };
  resultHandler.onResult = function(multistatus) {
    logIt(multistatus);
	
	let doc = cal.xml.parseString(multistatus);
    
	let res = doc.getElementsByTagNameNS('DAV:','current-user-principal')[0]
	             .getElementsByTagNameNS('DAV:','href')[0].textContent;
    
	opListener.onResult(res);
    
	gPrincipalUrisCache[uri.pathQueryRef] = res;
  };
  runXmlHttpRequest(uri, "PROPFIND", {Depth:0}, xmlQuery, resultHandler, calendarUri);
}

/**
 *  getCurrentUserPrincipalURI
 *  getCalendarHomeSetURI  *
 * 
 *  Search for the calendar-home-set path of the current principal
 *  calendarUri : the calendar on which the request should be run
 *  opListener  : The result/error handler
 */
function getCalendarHomeSetURI(calendarUri, str,opListener) 
{
  let resultHandler = {};
  resultHandler.onError = function(statusCode) {
    opListener.onError(statusCode);
  };
  resultHandler.onResult = function(CalendarHomeSetURI) {
    let uri = calendarUri.clone();
    uri = uri.mutate().setPathQueryRef(CalendarHomeSetURI).finalize(); 

    
    // Prepare the request  
    let  xmlQuery = '<D:propfind xmlns:D="DAV:">\n'+
                    '    <D:prop>\n'+
                    '        <C:calendar-home-set xmlns:C=\"urn:ietf:params:xml:ns:caldav\"/>\n'+
                    '        <D:displayname xmlns:C=\"urn:ietf:params:xml:ns:caldav\"/>\n'+
                    '        <C:calendar-user-type  xmlns:C=\"urn:ietf:params:xml:ns:caldav\"/>\n'+
                    '    </D:prop>\n'+
                    '</D:propfind>';
    xmlQuery = XML_HEADER + xmlQuery;
  
    let resultHandler2 = {};
    resultHandler2.onError = function(statusCode) {
      opListener.onError(statusCode);
    };
    resultHandler2.onResult = function(responseStr) {
	
	  let responseXML = cal.xml.parseString(responseStr);
	  let responses = responseXML.getElementsByTagNameNS('DAV:','response');
      for(let i=0; i < responses.length; i++) {
	    let response = responses[i];
	    let principal = response.getElementsByTagNameNS('DAV:','href')[0].textContent;
        let principalType = 'USER';
		principalType = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar-user-type')[0].textContent;

        
        let mail = principal.replace(uri.pathQueryRef, '');
        mail = principal.replace('/','');

        let displayName = response.getElementsByTagNameNS('DAV:','displayname')[0].textContent;
        
		let calendarHomeSets = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav','calendar-home-set');
		let calendarHomeSet = null;
		
		// If href is empty, most probably the access is forbidden, check this and 
		// disable the entry
		if(calendarHomeSets.length > 0) {
		  hrefs = calendarHomeSets[0].getElementsByTagNameNS('DAV:','href');
		  if(hrefs.length > 0) {
		    calendarHomeSet = hrefs[0].textContent;
		  }
		}
		
		opListener.onResult( [{'principal':principal, 'mail':mail, 'type':principalType, 
		                       'displayName':displayName, 'calendarHomeSet':calendarHomeSet}
							 ]);
	 }
     opListener.onFinish();		
    };
    runXmlHttpRequest(uri, "PROPFIND", {Depth:0}, xmlQuery, resultHandler2, calendarUri);
  };
  getCurrentUserPrincipalURI(calendarUri, resultHandler);
}



/**
 *  getPrincipalPropertySetURI  
 *  searchPrincipal            
 *  searchCalendarHome         *
 * 
 *  Retrieves the calendar objects under one principal's home
 *  If you don't have privileges to access a calendar, then the server  
 *  will not show you this calendar (no access denied or so is thrown by the server)
 *  Same thing if the user has no calendar.
 *
 *  calendarUri : the calendar on which the request should be run
 *  home        : the home uri as string
 *  opListener  : The result/error handler
 */
function searchCalendarHome(calendarUri,home,opListener) 
{

  let uri = calendarUri.clone();
  uri = uri.mutate().setPathQueryRef(home).finalize(); 
  let resultHandler = {};
  
  // Prepare the request  
  let  xmlQuery = '<D:propfind  xmlns:D="DAV:">\n'+
                  '  <D:prop>\n'+
                  '    <D:displayname/>\n'+
                  '    <D:calendar-color xmlns:D="http://apple.com/ns/ical/"/>\n'+
                  '    <D:current-user-privilege-set/>\n'+
                  '    <D:resourcetype />\n'+
                  '  </D:prop>\n'+
                  '</D:propfind>';
  xmlQuery = XML_HEADER + xmlQuery;

  resultHandler.onError = function(statusCode) {
    opListener.onError(statusCode);
  };
  resultHandler.onResult = function(responseStr) {
  
    let responseXML = cal.xml.parseString(responseStr);
	let responses = responseXML.getElementsByTagNameNS('DAV:','response');
    for(let i=0; i < responses.length; i++) {
	  let response = responses[i];
      let calHref = response.getElementsByTagNameNS('DAV:','href')[0].textContent;
      let displayName = response.getElementsByTagNameNS('DAV:','displayname')[0].textContent;
	  if(displayName == ''){displayName = '<Empty>';} // Fixme : get a label 
      let calendarColor = response.getElementsByTagNameNS('http://apple.com/ns/ical/','calendar-color')[0].textContent;
	  if(calendarColor == '') {
	  	calendarColor = getRandomColor();
	  } else {
	  	// calendar-color comes with 8 hex chars (the two last ones for transparency/opacity/alpha channel ??), so we just cut them off
	  	calendarColor = calendarColor.substring(0, 7);
	  } 
      let resourceType = response.getElementsByTagNameNS('DAV:','resourcetype')[0];
      let privileges = response.getElementsByTagNameNS('DAV:', 'current-user-privilege-set')[0];
      isCalendar = false;

	  // We filter the resourceType to check whether it contains <C:calendar>
	  let calResourceTag = resourceType.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav','calendar');
      if(calResourceTag.length == 0) continue;

      let privilegeSet = [];                    
      for  (let p of DAV_PRIVILEGES) {
        if(privileges.getElementsByTagNameNS('DAV:', p).length > 0) {
            privilegeSet.push(p);
        } 
      }
      let calObjectUri = uri.clone();
	  calObjectUri = calObjectUri.mutate().setPathQueryRef(calHref).finalize(); 
      let calObject = {  'type':'caldav', 
                         'uri':calObjectUri, 
                         'name':displayName, 
                         'privileges':privilegeSet,
                         'color':calendarColor};
      opListener.onResult([calObject]);
    }
    opListener.onFinish();
  };
  runXmlHttpRequest(uri, "PROPFIND", {Depth:1}, xmlQuery, resultHandler, calendarUri);
}

/**
 *  runXmlHttpRequest
 *  Common method to run a DAV query.
 *
 *  uri            : target uri
 *  method         : http method (GET, POST, PROPFIND, etc.)
 *  requestHeaders : additional headers to set
 *  data           : POST data
 *  opListener     : result/error handler
 */
function runXmlHttpRequest(uri, method, requestHeaders, data, opListener, calendarUri) {
  let streamListener = {} ;
  streamListener.onStreamComplete =
     function get_principal_property_set_onStreamComplete(aLoader, aContext, aStatus, aResultLength, aResult) {
       let request = aLoader.request.QueryInterface(Components.interfaces.nsIHttpChannel);
       if (request.responseStatus != 207) {
        opListener.onError(request.responseStatus);
        return;
       }
       let str = cal.provider.convertByteArray(aResult, aResultLength);
	   let multistatus = null;
       try {
            if(typeof(cal.safeNewXML) != 'undefined') {
                multistatus = str; //cal.safeNewXML(str);
            } else {
                // FIXME : temporary patch
                multistatus = str; //safeNewXML(str);
            }
            logIt("RESPONSE: "+multistatus);
       } catch (ex) { logIt("ERROR!!!! " + ex);return; }
       try {
             opListener.onResult(multistatus);
       } catch(e){alert(e);}
  };    

  logIt("REQUEST: ["+ method + "] " + uri.spec);
  logIt(data);
  
  // Run the request
  const contentType = "text/xml; charset=utf-8";
  let self = this;
  let etagChannel = cal.provider.prepHttpChannel(uri, data, contentType, function() { return self;});
  for(let h in requestHeaders) {
    etagChannel.setRequestHeader(h, requestHeaders[h], false);
  }
  etagChannel.requestMethod = method;
  // BEGIN Patch : for caldav-query provider
  let aAuthInfo = {};
  let authHeader;
  var calPrompt = cal.getCalendarManager().getCalendars({}).filter(function(calendar) { return calendar.uri.spec === calendarUri.spec;})[0];
  
  // If nothing returned, try with the first calendar available
  if(!calPrompt) {
    calPrompt = cal.getCalendarManager().getCalendars({}).filter(function(calendar) { return true;})[0];
  }
  
  if (calPrompt) {
	try {
	let calInternalObj = calPrompt.wrappedJSObject;
	if(calInternalObj) {
	   if (calInternalObj.account) {
	      aAuthInfo = calInternalObj.account.credentials;
		  authHeader = "Basic " + btoa(aAuthInfo.username + ":" + aAuthInfo.password);
	   } else {
	     logIt('no account ?');
	   }
	}
	} catch(e) {logIt(e);}
  } else {
    logIt('no calPrompt?');
  }
  if (authHeader) {
    etagChannel.setRequestHeader("Authorization", authHeader, false);
	requestHeaders['Authorization'] = authHeader;
  }
  // END Patch : for caldav-query provider
  logIt('Running request on server...');
  
  let streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"].createInstance(Components.interfaces.nsIStreamLoader);
  cal.provider.sendHttpRequest(streamLoader, etagChannel, streamListener);
}

function safeNewXML(aStr) {
    // Restore XML global property defaults as a precaution
    //XML.setSettings();

    // Strip <?xml and surrounding whitespaces (bug 336551)
    //return new XML(aStr.trim().replace(/^<\?xml[^>]*>\s*/g, ""));
	
	return aStr;
	
};
