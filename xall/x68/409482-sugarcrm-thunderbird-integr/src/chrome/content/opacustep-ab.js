/*********************************************************************************
 * The contents of this file are subject to the Opacus Licence, available at
 * http://www.opacus.co.uk/licence or available on request.
 * By installing or using this file, You have unconditionally agreed to the
 * terms and conditions of the License, and You may not use this file except in
 * compliance with the License.  Under the terms of the license, You shall not,
 * among other things: 1) sublicense, resell, rent, lease, redistribute, assign
 * or otherwise transfer Your rights to the Software. Use of the Software
 * may be subject to applicable fees and any use of the Software without first
 * paying applicable fees is strictly prohibited.  You do not have the right to
 * remove Opacus copyrights from the source code.
 *
 * The software is provided "as is", without warranty of any kind, express or
 * implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other
 * liability, whether in an action of contract, tort or otherwise, arising from,
 * out of or in connection with the software or the use or other dealings in
 * the software.
 *
 * Portions created by Opacus are Copyright (C) 2011 Mathew Bland, Jonathan Cutting
 * Opacus Ltd.
 * All Rights Reserved.
 ********************************************************************************/                  
/*global opacustep, Components, dump*/
// New Sugar Object
function opacustepab(){
    this.syncStage = 'new';
    this.fetchModule = '';
    this.chunk      =   50;
    this.ab         =   '';
    this.abURI      =   '';
    this.name       =   '';
    this.tbirdLastSync  =   '';
    this.sugarLastSync  =   '';
    this.deleteCalls        =   0;
    this.sugarObjectCalls   =   0;
    this.sugarUpdateCalls   =   0;
    this.sugarCheckCalls    =   0;
    this.loginTimer     =   Components.classes["@mozilla.org/timer;1"]
                    .createInstance(Components.interfaces.nsITimer);
    this.abmanager      =   Components.classes["@mozilla.org/abmanager;1"]
                    .getService(Components.interfaces.nsIAbManager);
    this.prefs      =   Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch("extensions.opacustep.")
                    .QueryInterface(Components.interfaces.nsIPrefBranch);
    this.syncModules    =   this.prefs.getCharPref("opacus_syncmodules");
    this.tbirdNonModifieds  =   [];
    this.tbirdModifieds =   [];
    this.tbirdNews      =   [];
    this.conflicts      =   [];
    this.alertStrings   =   new Array(
    opacustep.strings.GetStringFromName('tbirdmods'),
    opacustep.strings.GetStringFromName('tbirdadds'),
    opacustep.strings.GetStringFromName('sugarmods'),
    opacustep.strings.GetStringFromName('sugaradds'),
    opacustep.strings.GetStringFromName('tbirddeletes'),
    opacustep.strings.GetStringFromName('sugardeletes')
    );
    this.sugarCardFields = new Array(
        'id',
        'first_name',
        'last_name',
        'email1',
        'email2',
        'phone_work',
        'phone_mobile',
        'phone_home',
        'phone_other',
        'description',
        'account_name',
        'title',
        'primary_address_street',
        'primary_address_city',
        'primary_address_state',
        'primary_address_country',
        'primary_address_postalcode'
    );

    this.abListener = {
        prefs: window.opacustep.prefs,
        db: window.opacustep.db,

        onItemAdded: function(dir,item){
            try {
                var book = dir.QueryInterface(Components.interfaces.nsIAbDirectory);
                var card = item.QueryInterface(Components.interfaces.nsIAbCard);
                var opacusId = card.getProperty('opacusId',0);
                if(opacusId !== 0){
                    var sugarModule = opacusId.split(':')[0];
                    if(book.URI == this.prefs.getCharPref("opacusAB")){
                        if(sugarModule == 'Leads'){
                            // Has been moved from Leads. Convert.
                            card.setProperty('opacusId','convert');
                            book.modifyCard(card);
                        }
                    } else if(book.URI == this.prefs.getCharPref("opacusABLeads")){
                        if(module_name == 'Leads'){
                            // Has been moved from Contacts. Treat as new.
                            card.setProperty('opacusId','moved');
                            book.modifyCard(card);
                        }
                    }
                } /*else {
                    if(book.URI == this.prefs.getCharPref("opacusAB") || book.URI == this.prefs.getCharPref("opacusABLeads")){
                        var cardsToDelete = Components.classes["@mozilla.org/array;1"]
                              .createInstance(Components.interfaces.nsIMutableArray);
                        var oldCard = book.cardForEmailAddress(card.primaryEmail);
                        dump(oldCard.primaryEmail + " " + oldCard.getProperty('LastName',0) + " P. email?\n")
                        if(oldCard != null){
                            if(card.getProperty('LastName',0).toLowerCase() == oldCard.getProperty('LastName',0).toLowerCase()
                                && card.getProperty('LastName',0) != 0
                                && card.getProperty('LastName',0) != ''){
                                dump("Deleting duplicate card");
                                //cardsToDelete.appendElement(card,false);
                            }
                        }
                        book.deleteCards(cardsToDelete);
                    }
                }*/
            }
            catch(ex){}
        },

        onItemPropertyChanged: function(dir,item){},
        
        onItemRemoved: function(dir,item){
            var module_name = false;
            try {
                if(this.prefs.getBoolPref("opacus_syncdeletions")){
                    var book = dir.QueryInterface(Components.interfaces.nsIAbDirectory);
                    var card = item.QueryInterface(Components.interfaces.nsIAbCard);
                    if(!card.isMailList){
                        if(book.URI == this.prefs.getCharPref("opacusAB")){
                            module_name = 'Contacts';
                        } else if(book.URI == this.prefs.getCharPref("opacusABLeads")){
                            module_name = 'Leads';
                        }
                        if(module_name){
                            // If there's a sugar id
                            if(card.getProperty('opacusId',0) !== 0){
                                var sql = "INSERT INTO deleted_records (id,module_name,first_name,last_name,status) "+
                                            "VALUES (:id,:module_name,:first_name,:last_name,:status)";
                                var statement = this.db.createStatement(sql);
                                var opacusId = card.getProperty('opacusId',0);
                                statement.params.id = opacusId.split(':')[1];
                                statement.params.module_name = module_name;
                                statement.params.first_name = card.getProperty('FirstName','');
                                statement.params.last_name = card.getProperty('LastName','');
                                statement.params.status = 'toDelete';
                                statement.executeAsync();
                            }
                        }
                    }
                }
            }
            catch(ex){
                try {
                    var sql = false;
                    var book = item.QueryInterface(Components.interfaces.nsIAbDirectory);
                    if(book.URI == this.prefs.getCharPref("opacusAB")){
                        // Bye bye contact ab
                        this.prefs.setCharPref("opacusAB",'none');
                        this.prefs.setCharPref("tbirdLastSync",'0');
                        this.prefs.setCharPref("sugarcrmLastSync",'1970-01-01 00:00:00');
                        sql = "DELETE FROM deleted_records WHERE module_name='Contacts'";
                    } else if(book.URI == this.prefs.getCharPref("opacusABLeads")){
                        // Bye bye lead ab
                        this.prefs.setCharPref("opacusABLeads",'none');
                        this.prefs.setCharPref("tbirdLastLeadSync",'0');
                        this.prefs.setCharPref("sugarcrmLastLeadSync",'1970-01-01 00:00:00');
                        sql = "DELETE FROM deleted_records WHERE module_name='Leads'";
                    }
                    if(this.db !== false && sql !== false){
                        var statement = this.db.createStatement(sql);
                        statement.executeAsync();
                    }
                }
                catch(exc){}
            }
        }
    };
}

opacustepab.prototype.startListening = function(oab){
    oab.abmanager.addAddressBookListener(
        oab.abListener,
        Components.interfaces.nsIAbListener.all
    );
};


opacustepab.prototype.sync = function(type){
    // if one way sync, make sure sugar wins and don't delete sugar records
    if(opacustep.twoWaySync !== true){
        opacustep.sugarcrmwins = true;
    }

    opacustep.abSyncs++;
    this.fetchModule = type;
    if(type == 'Leads'){
        this.abURI = this.prefs.getCharPref("opacusABLeads");
        this.tbirdLastSync  =   this.prefs.getCharPref("tbirdLastLeadSync");
        this.sugarLastSync  =   this.prefs.getCharPref("sugarcrmLastLeadSync");
    } else {
        this.abURI      =   this.prefs.getCharPref("opacusAB");
        this.tbirdLastSync  =   this.prefs.getCharPref("tbirdLastSync");
        this.sugarLastSync  =   this.prefs.getCharPref("sugarcrmLastSync");
    }
    if(!opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
        opacustep.notifyUser('critical',opacustep.strings.GetStringFromName('notifyNoLicence'));
        return;
    }
    opacustep.setStatus(opacustep.strings.GetStringFromName('syncing'));

    // Check to see if the Opacus Address Book exists
    if(this.abURI != 'none'){
        var tryab = this.abmanager.getDirectory(this.abURI);
        if(tryab.dirName === ''){
            // No name - Address Book does not exist
            this.abURI = 'none';
        } else {
            // Name found - Address Book does exist
            this.ab = tryab;
        }
    }

    // If the Address Book does not exist
    if(this.abURI == 'none'){
        // Make a new one and set the prefs.

        // Reset Sync timestamps to ensure Address Book is filled correctly
        this.sugarLastSync = '1970-01-01 00:00:00';
        this.tbirdLastSync = '0';

        // Create new Address Book
        var abName = "Opacus SugarCRM "+opacustep.strings.GetStringFromName(type);
        this.abmanager.newAddressBook(abName,'',2);

        // Get the URI for the newly created Address Book
        var allAddressBooks = this.abmanager.directories;
        while(allAddressBooks.hasMoreElements()) {
            var ab = allAddressBooks.getNext();
            if (ab instanceof Components.interfaces.nsIAbDirectory && ab.dirName == abName) {
                //
                // Found the Address Book
                //
                
                // Record URI for our usage
                this.abURI = ab.URI;
                // Save URI into the preferences
                if(type == 'Leads'){
                    this.prefs.setCharPref("opacusABLeads", this.abURI);
                } else {
                    this.prefs.setCharPref("opacusAB", this.abURI);
                }
                // Load Address Book
                this.ab = this.abmanager.getDirectory(this.abURI);
            }
        }
    }

    //
    // BEGIN : Sort Thunderbird Contacts/Cards into Arrays for comparison
    //


    // Test to see if the Address Book is accessible and local (LDAP Address Books are not supported)
    if(this.ab instanceof Components.interfaces.nsIAbDirectory && !this.ab.isRemote){
        // Get the children of the Address Book (cards)
        var children = this.ab.childCards;
        
        // Loop through the cards
        var card;
        var counter=0;
        var sugarcrmId;
        while(children.hasMoreElements()){
            counter++;
            card = children.getNext();

            // If the card is a Contact
            if(card instanceof Components.interfaces.nsIAbCard){
                if(!card.isMailList){
                    // TODO add flag to give user opt out of sync flag.
                    // Does the card have a SugarCRM ID?
                    opacusId = card.getProperty('opacusId',0);
                    if(opacusId !== 0 && opacusId != 'convert' && opacusId != 'moved'){
                        // Has it been modified since the last sync?
                        sugarcrmId = opacusId.split(':')[1];
                        if(opacustep.twoWaySync && card.getProperty('LastModifiedDate',0) > this.tbirdLastSync){
                            // Add to Thunderbird Modified Array
                            this.tbirdModifieds.push(sugarcrmId);
                        } else {
                            // Otherwise, if not modified (or one way sync where we pretend they're not modified)
                            // Add to the Thunderbird Non Modified Array
                            this.tbirdNonModifieds.push(sugarcrmId);
                        }
                    } else {
                        // Card is new and has been created in Thunderbird
                        // Add to the Thunderbird New Array
                        if(opacustep.twoWaySync && card.getProperty('LastName',0) !== 0){
                            this.tbirdNews.push(card.getProperty("DbRowID",0));
                        }
                    }
                }
            }
        }
    }
    //
    // END : Sort Thunderbird Contacts/Cards into Arrays for comparison
    //




    // Contact SugarCRM instance to retrieve modified records for comparison
    this.worker = new opacusteprest();
    this.worker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    this.worker.login();
    this.check(this.getSugarContacts);
};

opacustepab.prototype.getSugarContacts = function(abObject,offset){
    var module = abObject.fetchModule.toLowerCase();
    // Look for contacts in SugarCRM modified since the last Sugar Sync timestamp
    var query = module+".date_modified > '"+abObject.sugarLastSync+"'";

        
    if(opacustep.myContactsOnly){
        query += " AND "+module+".assigned_user_id = '" + opacustep.user_id + "'";
    }
    if(module == 'contacts' && opacustep.honourSyncToOutlook){
        query += " AND contacts.id IN (SELECT sto.contact_id FROM contacts_users sto" +
                " WHERE sto.user_id='" + opacustep.user_id + "' AND sto.deleted=0)";
    }
    if(module == 'leads'){
        if(abObject.syncStage == 'converted'){
            query += " AND converted ='1'";
        } else {
            query += " AND converted='0'";
        }
    }
    var deleted = "0";
    if(abObject.syncStage == 'deleted'){
        deleted = "1";
        query += " AND " + module + ".deleted='1'";
    }



    abObject.worker.callback = abObject.getSugarContacts_callback;
    abObject.worker.get_entry_list(abObject.fetchModule,query,'last_name',offset,abObject.sugarCardFields,[],abObject.chunk,deleted,abObject);
};

opacustepab.prototype.createSugarCard = function(cardObject){
        var sugarCard = {
            "id"        : cardObject.id,
            "first_name"    : cardObject.name_value_list.first_name.value.replace(/&#039;/g,"'").replace(/^\s\s*/,'').replace(/\s\s*$/,''),
            "last_name" : cardObject.name_value_list.last_name.value.replace(/&#039;/g,"'").replace(/^\s\s*/,'').replace(/\s\s*$/,''),
            "email1"    : cardObject.name_value_list.email1.value.replace(/&#039;/g,"'"),
            "email2"    : cardObject.name_value_list.email2.value.replace(/&#039;/g,"'"),
            "phone_work"    : cardObject.name_value_list.phone_work.value,
            "phone_mobile"  : cardObject.name_value_list.phone_mobile.value,
            "phone_home"  : cardObject.name_value_list.phone_home.value,
            "phone_other"  : cardObject.name_value_list.phone_other.value,
            "description"   : cardObject.name_value_list.description.value.replace(/&#039;/g,"'"),
            "title"     : cardObject.name_value_list.title.value.replace(/&#039;/g,"'"),
            "address"   : cardObject.name_value_list.primary_address_street.value.replace(/&#039;/g,"'"),
            "city"      : cardObject.name_value_list.primary_address_city.value.replace(/&#039;/g,"'"),
            "state"     : cardObject.name_value_list.primary_address_state.value.replace(/&#039;/g,"'"),
            "country"       : cardObject.name_value_list.primary_address_country.value.replace(/&#039;/g,"'"),
            "postcode"  : cardObject.name_value_list.primary_address_postalcode.value,
            "module_name" : cardObject.module_name,
        };
        if(typeof(cardObject.name_value_list.account_name) !== 'undefined'){
            sugarCard.account_name = cardObject.name_value_list.account_name.value.substring(0,100).replace(/&#039;/g,"'");
        }
    return sugarCard;
};

opacustepab.prototype.getSugarContacts_callback = function(data,abObject){
    //
    // Compare Contacts from SugarCRM with Thunderbird cards
    //
    var deleteCard, i;
    // Loop through Contacts retrieved from SugarCRM
    for(i in data.entry_list){
        var sugarCard = abObject.createSugarCard(data.entry_list[i]);
        if(opacustep.db !== false && opacustep.sugarPermanentRemovals.indexOf(abObject.fetchModule + ':' + data.entry_list[i].id) != -1){
            // Do nothing, we deleted this record and don't want it back
        } else if(abObject.syncStage == 'converted' || abObject.syncStage == 'deleted'){
            opacustep.tbirdCardsToDelete.push({"id":data.entry_list[i].id,"module_name":abObject.fetchModule,"first_name":sugarCard.first_name,"last_name":sugarCard.last_name});
        } else {

            // Test to see if ID exists in the Thunderbird Modified Array
            var idTest = abObject.tbirdModifieds.indexOf(sugarCard.id);
            if(idTest != -1){
                // CONFLICT
                if(opacustep.sugarcrmwins){
                    // Remove from the Tbird modifieds so we don't update Sugar
                    abObject.tbirdModifieds.splice(idTest,1);
                    // Update card in Tbird
                    abObject.updateTbirdCard(sugarCard,true);
                }
            } else {
                // Test to see if ID exists in the Thunderbird Non Modified Array
                if(abObject.tbirdNonModifieds.indexOf(sugarCard.id) != -1){
                    // If so, Thunderbird Card requires an update
                    abObject.updateTbirdCard(sugarCard,true);
                } else {
                    // ID does not exist in Thunderbird Non Modified Array
                    
                    // Lookup Thunderbird Card based on email address
                    var card = abObject.ab.cardForEmailAddress(sugarCard.email1);
                    
                    // Have we found a Card?
                    if(card !== null){
                        // If so, check name matches
                        var testLastName = card.getProperty('LastName',0);
                        if(testLastName !== 0 && testLastName.toString().replace(/^\s\s*/,'').replace(/\s\s*$/,'').toLowerCase() == sugarCard.last_name.toLowerCase()){
                            // CONFLICT
                            // Set card Sugar id
                            card.setProperty('opacusId',abObject.fetchModule + ':' + sugarCard.id);
                            abObject.ab.modifyCard(card);
                            if(opacustep.sugarcrmwins){
                                // Update card with Sugar details
                                abObject.updateTbirdCard(sugarCard,true);
                            } else {
                                // ignore Sugar card update and add to Tbird mods array
                                abObject.tbirdModifieds.push(abObject.fetchModule + ":" + sugarCard.id);
                                // Get unique ID from Thunderbird card
                                var tbirdIdTest = card.getProperty("DbRowID",0);
                                // Lookup and remove from Thunderbird New Array
                                var uuidTest = abObject.tbirdNews.indexOf(tbirdIdTest);
                                if(uuidTest != -1){
                                    abObject.tbirdNews.splice(uuidTest,1);
                                }
                            }
                        } else {
                            // Email Addresses do not match
                            // Create Thunderbird Card
                            abObject.updateTbirdCard(sugarCard,false);
                        }
                    } else {
                        // Create Thunderbird Card
                        abObject.updateTbirdCard(sugarCard,false);
                    }
                }
            }
        }
    }

    if(data.result_count == abObject.chunk){
        abObject.getSugarContacts(abObject,data.next_offset);
    } else if(abObject.sugarLastSync != '1970-01-01 00:00:00' && abObject.prefs.getBoolPref("opacus_syncdeletions") && abObject.syncStage == 'new'){
        abObject.syncStage = 'deleted';
        abObject.getSugarContacts(abObject,0);
    } else if(abObject.sugarLastSync != '1970-01-01 00:00:00' && abObject.fetchModule == 'Leads' && abObject.syncStage != 'converted'){
        abObject.syncStage = 'converted';
        abObject.getSugarContacts(abObject,0);
    } else {  
        abObject.sugarUpdateCalls = 0;
        abObject.sugarCheckCalls = 0;
        for(i=0;i<abObject.tbirdModifieds.length;i++){
            abObject.sugarUpdateCalls++;
            abObject.updateSugarContact(abObject.tbirdModifieds[i],true);
        }
        if(abObject.tbirdNews.length > 0){
            // Create new rest object to avoid stamping over possible creation callbacks
            abObject.checkWorker = new opacusteprest();
            abObject.checkWorker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
            for(i=0;i<abObject.tbirdNews.length;i++){
                // Check for existence of record in Sugar
                abObject.sugarCheckCalls++;
                abObject.checkInSugar(abObject,abObject.tbirdNews[i]);
            }
        }

        if(abObject.sugarUpdateCalls === 0 && abObject.sugarCheckCalls === 0){
            abObject.wrapUp(abObject);
        }
    }
};


opacustepab.prototype.setServerSync = function(data,abObject){
    try{
        abObject.prefs.setCharPref("sugarcrmLastLeadSync",data.gmt_time);
    }
    catch(ex){
        dump('Could not set lead sync time');
    }
    try{
        abObject.prefs.setCharPref("sugarcrmLastSync",data.gmt_time);
    }
    catch(ex){
        dump('Could not set contact sync time');
    }
    if(typeof(abObject.deleteWindow) !== 'undefined'){
        abObject.deleteWindow.close();
        opacustep.deleteAB = null;
    }
};

opacustepab.prototype.checkInSugar = function(abObject,tbirdId){
    var tbirdCard = abObject.ab.getCardFromProperty('DbRowID',tbirdId,false),
    table = abObject.fetchModule.toLowerCase(),
    email2 = tbirdCard.getProperty('SecondEmail',0),
    email_query, query;
    if(email2 === 0){
        email_query = "ea.email_address LIKE '"+tbirdCard.primaryEmail+"'";
    } else {
        email_query = "(ea.email_address LIKE '"+tbirdCard.primaryEmail+"' OR ea.email_address LIKE '" + email2+"')";
    }
    // Look for contact in SugarCRM with matching surname and email address
    query = table + ".last_name LIKE '"+tbirdCard.getProperty('LastName',0).replace("'","\\'") +"' AND "+table+".id IN "+
                "(select eabr.bean_id from email_addr_bean_rel eabr"+
                    " join email_addresses ea on eabr.email_address_id = ea.id where eabr.bean_module = '"+abObject.fetchModule+"' AND "+
                    email_query + " and ea.deleted='0' and eabr.deleted='0')";

    var returnObject = {
        "tbirdId" : tbirdId,
    };
    returnObject.caller = abObject;
    abObject.checkWorker.callback = abObject.checkInSugar_callback;
    abObject.checkWorker.get_entry_list(abObject.fetchModule,query,'last_name',0,abObject.sugarCardFields,[],1,0,returnObject);
};

opacustepab.prototype.checkInSugar_callback = function(data,returnObject){
    returnObject.caller.sugarCheckCalls--;
    if(data.entry_list.length > 0){
        var sugarCard = returnObject.caller.createSugarCard(data.entry_list[0]);
        sugarCard.tbirdId = returnObject.tbirdId;
        if(opacustep.sugarcrmwins){
            returnObject.caller.updateTbirdCard(sugarCard,'withTbirdId');
        } else {
            var ids = new Array(returnObject.tbirdId,sugarCard.id);
            returnObject.caller.updateSugarContact(ids,'withTbirdId');
        }
    } else {
        returnObject.caller.updateSugarContact(returnObject.tbirdId,false);
    }
        
    if(returnObject.caller.sugarUpdateCalls === 0 && returnObject.caller.sugarCheckCalls === 0){
        returnObject.caller.wrapUp(returnObject.caller);
    }
};


opacustepab.prototype.updateTbirdCard = function(sugarCard,update){
    var card;
    if(update === true){
        card = this.ab.getCardFromProperty("opacusId",this.fetchModule + ":" + sugarCard.id,false);
    } else if(update === false) {
        card = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
    } else if(update == 'withTbirdId'){
        card = this.ab.getCardFromProperty("DbRowID",sugarCard.tbirdId,false);
        card.setProperty('opacusId',this.fetchModule + ':' + sugarCard.id);
        update = true;
    }
    if(card !== null){
        card.setProperty("FirstName", sugarCard.first_name);
        card.setProperty("LastName", sugarCard.last_name);
        card.displayName = sugarCard.first_name + ' ' + sugarCard.last_name;
        card.primaryEmail = sugarCard.email1;
        card.setProperty('SecondEmail',sugarCard.email2);
        card.setProperty('WorkPhone',sugarCard.phone_work);
        card.setProperty('CellularNumber',sugarCard.phone_mobile);
        card.setProperty('HomePhone',sugarCard.phone_home);
        card.setProperty('PagerNumber',sugarCard.phone_other);
        card.setProperty('Notes',sugarCard.description);
        card.setProperty('Company',sugarCard.account_name);
        card.setProperty('JobTitle',sugarCard.title);
        card.setProperty('WorkAddress',sugarCard.address);
        card.setProperty('WorkCity',sugarCard.city);
        card.setProperty('WorkState',sugarCard.state);
        card.setProperty('WorkCountry',sugarCard.country);
        card.setProperty('WorkZipCode',sugarCard.postcode);

        if(update){
            this.ab.modifyCard(card);
            opacustep.cardCounter[0]++;
        } else {
            card.setProperty('opacusId',this.fetchModule + ':' + sugarCard.id);
            this.ab.addCard(card);
            opacustep.cardCounter[1]++;
        }
    }
};



opacustepab.prototype.updateSugarContact = function(id,update){
    var card;
    if(update === true){
        // Updating card in SugarCRM. Our id is a SugarCRM id
        card = this.ab.getCardFromProperty("opacusId",this.fetchModule + ':' + id,false);   
    } else if(update === false) {
        // Creating card in SugarCRM. Our id is a Tbird uuid
        card = this.ab.getCardFromProperty("DbRowID",id,false);
    } else if(update == 'withTbirdId'){
        // Id is array of both Ids
        card = this.ab.getCardFromProperty("DbRowID",id[0],false);
        card.setProperty('opacusId',this.fetchModule + ':' + id[1]);
        this.ab.modifyCard(card);
        id = id[1];
        update = true;
    }
    if(card !== null){
        var sugarObject = {
            "module"                    : this.fetchModule,
            "fields"                    : {
                "primary_address_street"    : card.getProperty("WorkAddress",'').replace(/, ?/,"\r\n"),
                "primary_address_city"      : card.getProperty("WorkCity",''),
                "primary_address_country"   : card.getProperty("WorkCountry",''),
                "primary_address_state"     : card.getProperty("WorkState",''),
                "primary_address_postalcode": card.getProperty("WorkZipCode",''),
                "title"                     : card.getProperty("JobTitle",''),
                "email1"                    : card.primaryEmail,
                "email2"                    : card.getProperty("SecondEmail",''),
                "description"               : card.getProperty("Notes",''),
                "first_name"                : card.getProperty("FirstName",''),
                "last_name"                 : card.getProperty("LastName",''),
                "phone_work"                : card.getProperty("WorkPhone",''),
                "phone_mobile"              : card.getProperty("CellularNumber",''),
                "phone_home"              : card.getProperty("HomePhone",''),
                "phone_other"              : card.getProperty("PagerNumber",'')
            }
        };
        if(this.fetchModule == 'Leads'){
            sugarObject.account_name = card.getProperty('Company','');
        }
        if(update){
            sugarObject.action = 'edit';
            sugarObject.fields.id                   = id;
            opacustep.cardCounter[2]++;
        } else {
            sugarObject.fields.assigned_user_id = opacustep.user_id;
            sugarObject.DbRowID = id;
            opacustep.cardCounter[3]++;
            sugarObject.action = 'create';
        }
        sugarObject.caller = this;
        this.worker.callback = this.updateSugarContact_callback;
        
        this.worker.createObject(sugarObject);
    } else {
        this.sugarUpdateCalls--;
        if(this.sugarUpdateCalls === 0 && this.sugarCheckCalls === 0){
            this.wrapUp(this);
        }
    }
};




opacustepab.prototype.updateSugarContact_callback = function(data,sugarObject){
    var card;
    if(sugarObject.action == 'create'){
        card = sugarObject.caller.ab.getCardFromProperty('DbRowID',sugarObject.DbRowID,false);
        card.setProperty("opacusId",sugarObject.caller.fetchModule + ':' + data.id);
        sugarObject.caller.ab.modifyCard(card);
    } else {
        card = sugarObject.caller.ab.getCardFromProperty('opacusId',sugarObject.caller.fetchModule + ':' + sugarObject.fields.id,false);
    }
    var account_name = card.getProperty("Company",0);
    if(sugarObject.caller.fetchModule == 'Contacts' && account_name !== '' && account_name !== 0){
        sugarObject.caller.findAccountRel(sugarObject.caller,data.id,account_name);
    }
    sugarObject.caller.sugarUpdateCalls--;
    if(sugarObject.caller.sugarUpdateCalls === 0 && sugarObject.caller.sugarCheckCalls === 0){
        sugarObject.caller.wrapUp(sugarObject.caller);
    }
};

opacustepab.prototype.findAccountRel = function(abObject,contact_id,account_name){
    // Use new REST object to avoid conflict with ongoing sync worker
    var acWorker = new opacusteprest();
    acWorker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    
    acWorker.callback = abObject.findAccountRel_callback;
    var query = "accounts.name LIKE '" + account_name + "%'";
    var returnObject = {
        "worker": acWorker,
        "caller": abObject,
        "contact_id" : contact_id
    };
    acWorker.get_entry_list('Accounts',query,'name',0,new Array('id','name'),[],1,0,returnObject);
};

opacustepab.prototype.findAccountRel_callback = function(data,returnObject){
    if(data.entry_list.length > 0){
        returnObject.worker.callback = returnObject.caller.setAccountRel_callback;
        returnObject.worker.createRelationship('Accounts',data.entry_list[0].id,'contacts',returnObject.contact_id,'');
        var card = returnObject.caller.ab.getCardFromProperty('opacusId','Contacts:' + returnObject.contact_id,false);
        card.setProperty("Company",data.entry_list[0].name_value_list.name.value.replace(/&#039;/g,"'"));
        returnObject.caller.ab.modifyCard(card);
    }
};

opacustepab.prototype.setAccountRel_callback = function(data,returnObject){
    //
};

opacustepab.prototype.populateDeleteWindow = function(abObject,deleteWindow,type){
    var entries;
    if(type == 'sugar'){
        deleteWindow.document.getElementById('helpText').textContent = opacustep.strings.GetStringFromName('deleteHelpText') + ' SugarCRM?';
        entries = opacustep.sugarCardsToDelete;
    } else {
        deleteWindow.document.getElementById('helpText').textContent = opacustep.strings.GetStringFromName('deleteHelpText') + ' Thunderbird?';
        entries = opacustep.tbirdCardsToDelete;
    }
    var list = deleteWindow.document.getElementById('allrecords');
    var listWidth = (list.boxObject.width - 2);
    while(list.childNodes.length > 0){
            list.removeChild(list.lastChild);
    }
    for(var i in entries){
        var first_name = entries[i].first_name.replace(/&#039;/g,"'").replace(/&quot;/g,'"');
        var last_name = entries[i].last_name.replace(/&#039;/g,"'").replace(/&quot;/g,'"');
        var row = document.createElement('richlistitem');
        var cell = document.createElement('listcell');
        var checkbox = document.createElement('checkbox');
        checkbox.setAttribute('checked',true);
        checkbox.setAttribute('id',entries[i].module_name + ':' + entries[i].id);
        checkbox.className='deleteSelected';
        checkbox.setAttribute('label','  '+opacustep.strings.GetStringFromName(entries[i].module_name) + ': ' + first_name + ' ' + last_name);
        row.setAttribute('allowevents','true');
        cell.setAttribute('flex','1');
        cell.style.overflow = 'hidden';
        cell.style.width = listWidth.toString() + 'px';
        checkbox.setAttribute('flex','1');
        cell.appendChild(checkbox);
        row.appendChild(cell);
        list.appendChild(row);
    }
};

opacustepab.prototype.getItemsToDelete = function(el){
    var idArr;
    var checkBoxes = el.getElementsByClassName('deleteSelected');
    var arr = [];    
    for (var i = 0; i < checkBoxes.length; i++){  
        if (checkBoxes[i].hasAttribute('checked')){
            idArr = checkBoxes[i].getAttribute('id').split(':');
            arr.push({"module_name":idArr[0],"id":idArr[1]});  
        }
    }
    return arr;
};



opacustepab.prototype.deleteRecords = function(abObject,entries,type){
    if(type == 'sugar'){
        var cleanUp = true;
        var delWorker = new opacusteprest();
        delWorker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
        opacustep.sugarCardsToDelete = [];
        var contactsArray = [];
        var leadsArray = [];
        delWorker.callback = abObject.deleteSugarRecords_callback;
        for(var i in entries){
            var sugarId = entries[i].id;
            if(sugarId.indexOf(':') != -1){
                sugarId = sugarId.split(':')[0];
            }
            if(entries[i].module_name == 'Contacts'){
                contactsArray.push([{"name":"id","value":sugarId},{"name":"deleted","value":"1"}]);
                opacustep.cardCounter[5]++;
            } else {
                leadsArray.push([{"name":"id","value":sugarId},{"name":"deleted","value":"1"}]);
                opacustep.cardCounter[5]++;
            }
        }
        if(contactsArray.length > 0){
            cleanUp = false;
            abObject.deleteCalls++;
            delWorker.set_entries(contactsArray,'Contacts',abObject);
        }
        if(leadsArray.length > 0){
            cleanUp = false;
            abObject.deleteCalls++;
            delWorker.set_entries(leadsArray,'Leads',abObject);
        }
        if(cleanUp){
            abObject.deleteTbirdRecords(abObject);
        }
    } else {
        opacustep.cardCounter[4] = entries.length;
        abObject.ab.deleteCards(abObject.buildCardArray(entries,abObject));
        abObject.cleanUp(abObject);
    }
};

opacustepab.prototype.deleteSugarRecords_callback = function(data,abObject){
    abObject.deleteCalls--;
    if(abObject.deleteCalls === 0){
        abObject.deleteTbirdRecords(abObject);
    }
};

opacustepab.prototype.deleteTbirdRecords = function(abObject){
    var threshold = abObject.prefs.getIntPref('delete_threshold');
    if(threshold === 0 || opacustep.tbirdCardsToDelete.length < threshold){
        abObject.ab.deleteCards(abObject.buildCardArray(opacustep.tbirdCardsToDelete,abObject));
        opacustep.cardCounter[4] = opacustep.tbirdCardsToDelete.length;
        abObject.cleanUp(abObject);
    } else {
        if(typeof(abObject.deleteWindow) === 'undefined'){
            abObject.deleteWindow = window.openDialog("chrome://opacustep/content/opacustep-contacts.xul","","chrome,height=300,width=300,dialog=no,resizable=yes,titlebar,centerscreen",abObject,'tbird');
        } else {
            abObject.deleteWindow.arguments[1] = 'tbird';
            abObject.populateDeleteWindow(abObject,abObject.deleteWindow,'tbird');
        }
        abObject.deleteWindow.focus();
    }
};

opacustepab.prototype.buildCardArray = function(idArray,abObject){
    var card, cab, lab, retArray = Components.classes["@mozilla.org/array;1"]  
        .createInstance(Components.interfaces.nsIMutableArray);
    if(abObject.fetchModule == 'Contacts'){
        cab = abObject.ab;
        try{
            lab = abObject.abmanager.getDirectory(abObject.prefs.getCharPref("opacusABLeads"));
        }
        catch(ex){}
    } else {
        try{
            cab = abObject.abmanager.getDirectory(abObject.prefs.getCharPref("opacusAB"));
        }
        catch(ex){}
        lab = abObject.ab;
    }
    for(var i in idArray){
        if(idArray[i].module_name == 'Contacts'){
            try{
                card = cab.getCardFromProperty("opacusId",'Contacts:' + idArray[i].id,false);
            }
            catch(ex){card = null;}
        } else {
            try{
                card = lab.getCardFromProperty("opacusId",'Leads:' + idArray[i].id,false);
            }
            catch(ex){card = null;}
        }
        if(card !== null){
            retArray.appendElement(card,false);
        }
    }
    return retArray;
};


opacustepab.prototype.wrapUp = function(abObject){
    opacustep.abSyncs--;
    if(opacustep.abSyncs === 0){
        // Delete sugar cards first
        var threshold = abObject.prefs.getIntPref('delete_threshold');
        if(opacustep.sugarCardsToDelete.length > 0){
            if(threshold === 0 || opacustep.sugarCardsToDelete.length < threshold){
                abObject.deleteRecords(abObject,opacustep.sugarCardsToDelete,'sugar');
            } else {
                abObject.deleteWindow = window.openDialog("chrome://opacustep/content/opacustep-contacts.xul","","chrome,height=300,width=300,dialog=no,resizable=yes,titlebar,centerscreen",abObject,'sugar');
                abObject.deleteWindow.focus();
            }
        } else {
            abObject.deleteTbirdRecords(abObject);
        }
    }
};

opacustepab.prototype.cleanUp = function(abObject){ 
    abObject.setWorker = new opacusteprest();
    abObject.setWorker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    abObject.setWorker.callback = abObject.setServerSync;
    abObject.setWorker.get_server_info(abObject);
    abObject.prefs.setCharPref("tbirdLastLeadSync",Math.round(new Date().getTime() / 1000));
    abObject.prefs.setCharPref("tbirdLastSync",Math.round(new Date().getTime() / 1000));
    if(opacustep.db !== false){
        var persistDeletes = "UPDATE deleted_records SET status='deleted' WHERE status='toDelete'";
        var stmt = opacustep.db.createStatement(persistDeletes);
        stmt.executeAsync({
            handleResult: function(aResultSet) {
            },
            handleError: function(aError) {
                opacustep.console.logStringMessage("Failed updating deleted records table");
            },  
            handleCompletion: function(aReason) {
            }
        });
    }
    var text = '', mods = false;
    for(var i=0;i<opacustep.cardCounter.length;i++){
        if(opacustep.cardCounter[i] !== 0){
            mods = true;
            text += opacustep.cardCounter[i] + " " + abObject.alertStrings[i] + "\n";
        }
    }
    if(!mods){
        text = opacustep.strings.GetStringFromName('noabmods');
    }
    opacustep.notifyUser('sync',text);
    opacustep.setStatus('hidden');
    opacustep.progress.setAttribute('mode','indetermined');
    opacustep.cardCounter = new Array(0,0,0,0,0,0);
    opacustep.syncInProgress = false;
    if(abObject.prefs.getBoolPref('filtersAfterSync')){
        goDoCommand('cmd_applyFilters');
    }
};

opacustepab.prototype.getSqlDate =function(){
    var d = new Date();
    function pad(n){
        return n<10 ? '0'+n : n;
    }
    return (d.getUTCFullYear() + 1)+'-'+
      pad(d.getUTCMonth()+1)+'-'+
      pad(d.getUTCDate())+' '+
      pad(d.getUTCHours())+':'+
      pad(d.getUTCMinutes())+':'+
      pad(d.getUTCSeconds());
};

opacustepab.prototype.check = function(returnFunc){
    function checkSession(onceMore){
        if(opacustep.session_id === '' || onceMore === true || abObject.worker.waitingForLogin === true || opacustep.syncLock) {
            abObject.loginTimer.cancel();
            if(opacustep.session_id !== ''){
                onceMore = false;
            }
            var event = { notify: function(timer) {
                counter++;
                if(counter < 100){
                    checkSession(onceMore);
                } else {
                    opacustep.notifyUser('critical',opacustep.strings.GetStringFromName('notifyNoLogin'));
                    return;
                }
            }};
            abObject.loginTimer.initWithCallback(event,100,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            return;
        }
        returnFunc(abObject,0);
    }
    var onceMore = true;
    var abObject = this;
    var counter = 0;
    checkSession(onceMore);
};
