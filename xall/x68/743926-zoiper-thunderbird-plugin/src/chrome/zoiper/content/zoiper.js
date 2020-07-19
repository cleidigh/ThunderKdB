/************************************
 ************************************
 ***                              ***
 ***  2010 (C) Zoiper.com         ***
 ***                              ***
 ************************************
 ************************************/

/*
 * This global array will contain
 * available phones for a contact.
 */
var g_arrPhones = new Array();

/*
 * Preferences- name and service
 */
var PREF_NAME = "zoiper.executablePath";
var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);

/****************************************
 ****************************************
 ***                                  ***
 ***   Select phone dialog functions  ***
 ***                                  ***
 ****************************************
 ****************************************/
/************************
 *  OnLoadSelectDialog
 ************************/
function OnLoadSelectDialog()
{
    /* get the list box element */
    var lbPhones = window.document.getElementById("phones-listbox");
    if ( !lbPhones )
    {
        return;
    }

    g_arrPhones = window.arguments[0];

    /* fill the listbox with phones available */
    while ( g_arrPhones.length )
    {
        var strPhone;
        strPhone = g_arrPhones.shift();
        lbPhones.appendItem( strPhone, strPhone );
    }

    lbPhones.addEventListener( 'dblclick', OnAcceptSelection, false );
}

/***********************
 *  OnAcceptSelection
 ***********************/
function OnAcceptSelection( evt )
{
    var lbPhones = window.document.getElementById("phones-listbox");
    if ( !lbPhones )
    {
        return;
    }

    if ( lbPhones.selectedItem == null )
    {
        evt.preventDefault();
        alert( 'No phone is selected.' );
        return;
    }

    var strRealPhone;
    strRealPhone = ExtractPhoneNumber( lbPhones.selectedItem.value );

    if ( strRealPhone != null )
        MakeCall( strRealPhone );

    if ( evt != null && evt.type == 'dblclick' )
        window.close();
}

/*******************************************
 *******************************************
 ***                                     ***
 ***   Zoiper settings dialog functions  ***
 ***                                     ***
 *******************************************
 *******************************************/
/**************************
 *  OnLoadSettingsDialog
 **************************/
function OnLoadSettingsDialog()
{
    window.document.getElementById( 'zoiper_path' ).value = prefs.getCharPref( PREF_NAME );
}

/*******************
 *  OnBrowseClick
 *******************/
function OnBrowseClick()
{
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"]
            .createInstance(nsIFilePicker);
    fp.init(window, "Locate Zoiper Communicator executable", nsIFilePicker.modeOpen);
    fp.appendFilters( nsIFilePicker.filterApps );
    fp.appendFilters( nsIFilePicker.filterAll );

    fp.open(
        function( result )
        {
            if ( result == nsIFilePicker.returnOK )
                window.document.getElementById( 'zoiper_path' ).value = fp.file.path;
        }
    );
}

/********************
 *  OnSaveSettings
 ********************/
function OnSaveSettings( evt )
{
    if ( window.document.getElementById( 'zoiper_path' ).value.length == 0 )
    {
        evt.preventDefault();
        alert( 'Zoiper Communicator executable path cannot be empty.' );
        return;
    }

    prefs.setCharPref( PREF_NAME, window.document.getElementById( 'zoiper_path' ).value );
}

/**********************************
 **********************************
 ***                            ***
 ***   Zoiper button functions  ***
 ***                            ***
 **********************************
 **********************************/
/**************************
 *  OnZoiperButtonClick
 **************************/
function OnZoiperButtonClick()
{
    var contact;
    contact = GetSelectedContact();
    if ( contact == null )
    {
        alert( 'Select one contact to make a call.' );
        return;
    }

    switch ( GetPhonesCount( contact ) )
    {
        case 0:
            return;

        case 1:
            var strRealPhone;
            strRealPhone = ExtractPhoneNumber( g_arrPhones.shift() );

            if ( strRealPhone != null )
                MakeCall( strRealPhone );
            break;

        default:
            window.openDialog("chrome://zoiper/content/selectDialog.xul",
                          "selectDialog", "chrome,modal,centerscreen", g_arrPhones );
            break;
    }
}

/********************************
 *  ConfigureZoiper
 ********************************/
function ConfigureZoiper()
{
    window.open("chrome://zoiper/content/settingsDialog.xul",
                          "settingsDialog", "chrome,modal,centerscreen" );
}

/**************
 *  MakeCall
 **************/
function MakeCall( number )
{
    /*
     * check whether our preference exists
     * if it doesn't create one with blank value
     */
    try {
        prefs.getCharPref( PREF_NAME );
    }
    catch( ex )
    {
        prefs.setCharPref( PREF_NAME, "" );
    }

    /* check whther our preference is configured */
    if ( prefs.getCharPref( PREF_NAME ).length == 0 )
    {
        alert( "No Zoiper Communicator executable path provided." );
        ConfigureZoiper();
    }

    var file = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsIFile);
    try {
        file.initWithPath( prefs.getCharPref( PREF_NAME ) );
    }
    catch (ex)
    {
        file = null;
    }

    /* Does that file exists? */
    if ( file == null || !file.exists() )
    {
        alert( "File provided as Zoiper Communicator executable path doesn't exist." );
        ConfigureZoiper();
    }

    /* Is it executable? */
    if ( !file.isExecutable() )
    {
        alert( "File provided as Zoiper Communicator executable path is not an executable." );
        ConfigureZoiper();
    }

    /* at last we can make a call */
    var process = Components.classes["@mozilla.org/process/util;1"]
                     .createInstance( Components.interfaces.nsIProcess);

    var args = [ number ];
    process.init( file );
    process.run( false, args, args.length );
}

/************************
 *  GetSelectedContact
 ************************/
function GetSelectedContact()
{
    /* do we have selected contacts ? */
    var contacts = GetSelectedAbCards();
    if (!contacts)
        return null;

    if ( contacts.length != 1 )
    {
        return null;
    }

    if (!contacts[0].isMailList)
        return contacts[0];
    else
        return 0;
}

/********************
 *  GetPhonesCount
 ********************/
function GetPhonesCount( contact )
{
    var phonesCount = 0;
    g_arrPhones = new Array();

    var workPhone      = contact.getProperty("WorkPhone", "");
    var homePhone      = contact.getProperty("HomePhone", "");
    var cellularNumber = contact.getProperty("CellularNumber", "");

    /* check for work phone */
    if ( workPhone != "" )
    {
        phonesCount++;
        g_arrPhones.push( 'Work: ' + workPhone );
    }

    /* check for home phone */
    if ( homePhone != "" )
    {
        phonesCount++;
        g_arrPhones.push( 'Home: ' + homePhone );
    }

    /* check for mobile phone */
    if ( cellularNumber != "" )
    {
        phonesCount++;
        g_arrPhones.push( 'Mobile: ' + cellularNumber );
    }

    return phonesCount;
}

/************************
 *  ExtractPhoneNumber
 ************************/
function ExtractPhoneNumber( number )
{
    /* remove 'Home: ', 'Work: ' or 'Mobile: ' strings */
    var strRealPhone;
    var strValue;
    var index;

    strValue = number;
    index = strValue.indexOf( ': ' );

    if ( index == -1 )
    {
        /* WTF ?!?! */
        alert( 'Cannot retrieve phone number.' );
        return null;
    }

    /*
     * get the substring after ': '
     * it should be the phone number
     */
    strRealPhone = strValue.substr( index + 2 );
    return strRealPhone;
}
