var EXPORTED_SYMBOLS = ['getFolder'];

/**
 * getFolder - gets a nsIMsgFolder object from a given folder URI
 * @returns a nsIMsgFolder object
 */
function getFolder(folderURI) {
    let rdf = Components.classes['@mozilla.org/rdf/rdf-service;1']
        .getService(Components.interfaces.nsIRDFService);
    let fldr = rdf.GetResource(folderURI)
        .QueryInterface(Components.interfaces.nsIMsgFolder);

    return fldr;
}