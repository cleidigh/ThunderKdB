if(!com.ktsystems.subswitch.PrefixesListSingleton) com.ktsystems.subswitch.PrefixesListSingleton={};
if(!com.ktsystems.subswitch.PrefixItem) com.ktsystems.subswitch.PrefixItem={};

com.ktsystems.subswitch.PrefixesListSingleton = (function() {
    var instance = null;

    function PrefixesList() {
        this.prefixesList = null;
        this.initPrefixesArray = function() {
            com.ktsystems.subswitch.Utils.dumpStr('-> initPrefixesArray');
          
            var dataString, addressesString, sequencesString;
            var items = new Array();

            try {
                dataString = com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref("rds");
                addressesString = com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref("rds_addresses")
                sequencesString = com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref("rds_sequences");

                if (dataString != "") {
                    // pre 0.9.10 upgrade
                    if (dataString.indexOf(com.ktsystems.subswitch.Utils.getRDEntrySplitSign()) < 0) {
                        dataString = com.ktsystems.subswitch.Utils.upgradeSettings(dataString);
                    }
                    var itemStrings = dataString.split(com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign());

                    var addressesStrings;
                    if (addressesString != null && addressesString != "") {
                        addressesStrings = addressesString.split(com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign());
                    }

                    var sequencesStrings;
                    if (sequencesString != null && sequencesString != "") {
                        sequencesStrings = sequencesString.split(com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign());
                    }

                    for (var i = 0; i < itemStrings.length; i ++) {
                        var itemData = itemStrings[i].split(com.ktsystems.subswitch.Utils.getRDEntrySplitSign());
                        // pre 0.9.16 upgrade
                        var item;
                        if (itemData[2] == null || itemData[2] == '' || (itemData[2] != 'true' && itemData[2] != 'false')) {
                            com.ktsystems.subswitch.Utils.dumpStr('>>>>> ' +itemData[2]+ ' ' + 1    );
                            item = new com.ktsystems.subswitch.PrefixItem(itemData.shift(), itemData.shift(), 'true');
                        } else {
                            com.ktsystems.subswitch.Utils.dumpStr('>>>>> ' +itemData[2]+ ' ' + 2);
                            item = new com.ktsystems.subswitch.PrefixItem(itemData.shift(), itemData.shift(), itemData.shift());
                        }
                        item.aliases = itemData;
                        items.push(item);

                        if (addressesStrings != null && addressesStrings[i] != null) {
                            var addressData = addressesStrings[i].split(com.ktsystems.subswitch.Utils.getRDEntrySplitSign());
                            item.addresses = addressData;
                        }

                        if (sequencesStrings != null && sequencesStrings[i] != null) {
                            var sequenceData = sequencesStrings[i];
                            item.currentSeqValue = sequenceData;
                        }
                    }
                }
                this.currentDataString = dataString;
                this.currentAddressesString = addressesString;
            } catch (e) {
                com.ktsystems.subswitch.Utils.dumpStr(e);
            }

            items.indexOfComplex = function(elt) {
                return items.indexOfInternal(elt, true);
            };

            items.indexOf = function(elt) {
                return items.indexOfInternal(elt, false);
            };

            items.indexOfInternal = function(elt, deep) {
                for (var i = 0; i < this.length; i++) {
                    if (this[i].equals(elt, deep)) {
                        return i;
                    }
                }
                return -1;
            };

            items.removeAll = function() {
                for (var i = this.length - 1; i >= 0; i--) {
                    this.pop();
                }
            };

            com.ktsystems.subswitch.Utils.dumpStr('<- initPrefixesArray; '+items);
            return items;
        };
        this.savePrefixesSequences = function () {
            com.ktsystems.subswitch.Utils.dumpStr('-> savePrefixesSequences');
            var writer = {
                sb_seq: [],
                writeItem:    function (s) {
                    this.sb_seq.push(s.currentSeqValue);
                },
                toString: function () {  return this.sb_seq.join(com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign()); }
            };

            this.prefixesList.forEach(writer.writeItem, writer);

            var configStr = com.ktsystems.subswitch.Const.subswitch_str;
            var configPrefs = com.ktsystems.subswitch.Const.subswitch_prefs;

            configStr.data = writer.toString();
            configPrefs.setStringPref("rds_sequences", configStr);

            com.ktsystems.subswitch.Utils.dumpStr('<- savePrefixesSequences; '+configStr.data);
        };

        this.savePrefixesArray = function (defaultsignature) {
            com.ktsystems.subswitch.Utils.dumpStr('-> savePrefixesArray');
            var writer = {
                sb:         [],
                sb_address: [],
                writeItem:    function (s) {
                    var entry;
                    var entry_address;
                    entry = s.description + com.ktsystems.subswitch.Utils.getRDEntrySplitSign()
                                   + s.rd + com.ktsystems.subswitch.Utils.getRDEntrySplitSign()
                                   + s.showInNewMsgPopup;
                    if (s.aliases && s.aliases.length > 0) {
                         entry += com.ktsystems.subswitch.Utils.getRDEntrySplitSign() + s.aliases.join(com.ktsystems.subswitch.Utils.getRDEntrySplitSign());
                    }
                    if (s.addresses && s.addresses.length > 0) {
                         entry_address = s.addresses.join(com.ktsystems.subswitch.Utils.getRDEntrySplitSign());
                    }
                    this.sb.push(entry);
                    this.sb_address.push(entry_address);
                },
                toString: function () {  return this.sb.join(com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign()); },
                toAddressesString: function () {  return this.sb_address.join(com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign()); }
            };

            this.prefixesList.forEach(writer.writeItem, writer);

            var configStr = com.ktsystems.subswitch.Const.subswitch_str;
            var configPrefs = com.ktsystems.subswitch.Const.subswitch_prefs;

            configStr.data = writer.toString();
            configPrefs.setStringPref("rds", configStr);

            configStr.data = writer.toAddressesString();
            configPrefs.setStringPref("rds_addresses", configStr);

            if (defaultsignature != undefined) {
                com.ktsystems.subswitch.Const.subswitch_prefs.setCharPref("defaultrd", defaultsignature);
            }
        };
        this.getPrefixesList = function () {
            var dataString = com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref("rds");
            var addressesString = com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref("rds_addresses");

            if (this.currentDataString != dataString || this.currentAddressesString != addressesString) {
                this.prefixesList.removeAll();
                var newList = this.initPrefixesArray();
                newList.forEach(function(s) { com.ktsystems.subswitch.PrefixesListSingleton.getInstance().prefixesList.push(s) });
            }

            return this.prefixesList;
        }
        this.prefixesList = this.initPrefixesArray();
    }

    return new function() {
        this.getInstance = function() {
            com.ktsystems.subswitch.Utils.dumpStr('-> this.getInstance = function();');
            if (instance == null) {
                instance = new PrefixesList();
                instance.constructor = null;
            }
            return instance;
        }
    }
})();

com.ktsystems.subswitch.PrefixItem = function(aLabel, aPrefix) {
    this.label = aLabel;
    this.prefix = aPrefix;
    this.inNewMsgPopup = false;
    this.aliasesList = [];
    this.addressesList = [];
    this.currentSeqValue = 1;
    this.lastPrefixValue = aPrefix;
}

com.ktsystems.subswitch.PrefixItem = function(aLabel, aPrefix, aShowInNewMsgPopup) {
    this.label = aLabel;
    this.prefix = aPrefix;
    this.inNewMsgPopup = aShowInNewMsgPopup == 'true' ? true : false;
    this.aliasesList = [];
    this.addressesList = [];
    this.currentSeqValue = 1;
    this.lastPrefixValue = aPrefix;
}

com.ktsystems.subswitch.PrefixItem.prototype = {
    isValid : function() {
        com.ktsystems.subswitch.Utils.dumpStr("isValid "+this.prefix+" "+this.label);
        return (this.prefix != "" && this.label != "");
    },

    get description()       { return this.label;  },
    get rd()                { return this.prefix; },
    get showInNewMsgPopup() { return this.inNewMsgPopup; },
    get aliases()           { return this.aliasesList; },
    get addresses()         { return this.addressesList; },

    set description(aLabel) { this.label  = aLabel;  },
    set rd(aPrefix)         { this.prefix = aPrefix; },
    set aliases(aAliases)   { this.aliasesList = aAliases; },
    set addresses(aAddresses)   { this.addressesList = aAddresses; },
    set showInNewMsgPopup(aShowInNewMsgPopup) { this.inNewMsgPopup = aShowInNewMsgPopup; },

    incSeqValue : function()     {
        if (com.ktsystems.subswitch.Utils.isTemplateWithSequence(this.rd)) {
            this.currentSeqValue++;
            if (this.currentSeqValue > com.ktsystems.subswitch.Const.SEQ_MAX_VALUE) {
                this.currentSeqValue = 0;
            }
        }
    },

    toString : function()   { return ('[' + this.description + com.ktsystems.subswitch.Utils.getRDEntrySplitSign() + this.rd + ']'); },

    get lastFormattedPrefixValue() { return this.lastPrefixValue; },

    get formattedPrefixValue(){
        var d1 = new Date();
        var numberRE = new RegExp(com.ktsystems.subswitch.Const.pattern_number);
        var tmpPrefix = this.rd;

        com.ktsystems.subswitch.Utils.dumpStr('-> getFormattedPrefixValue; numberRE:'+numberRE+ '; tmpPrefix=' + tmpPrefix);

        if (tmpPrefix.match(numberRE)) {
            var numnerMatchArr = numberRE.exec(tmpPrefix);
            var currnumber = this.currentSeqValue;

            if (numnerMatchArr.length == 2) {
                var numberFormat = numnerMatchArr[1];

                var currNumberForm = com.ktsystems.subswitch.Utils.padNumber(currnumber, numberFormat.toString().length);

                tmpPrefix = tmpPrefix.replace(numnerMatchArr[0], currNumberForm);
            }
        }

        var dateRE       = new RegExp(com.ktsystems.subswitch.Const.pattern_date);

        var dtMatchArr = tmpPrefix.match(dateRE);
        var dateValue = new Date();

        if (dtMatchArr != null) {
           for (var i=0; i<dtMatchArr.length; i++) {
               var dateFormatRE = new RegExp(/{(date|time|datetime):([\w\\\/\-: ]+)}/gi);
               var dateFormat = dateFormatRE.exec(dtMatchArr[i])[2];

               tmpPrefix = tmpPrefix.replace(dtMatchArr[i], com.ktsystems.subswitch.Utils.dateFormat(dateValue, dateFormat));
           }
        }

        this.lastPrefixValue = tmpPrefix;

        return tmpPrefix;
    },

    get patternPrefixString() {
        com.ktsystems.subswitch.Utils.dumpStr('patternPrefixString - START');
        var numberRE = new RegExp(com.ktsystems.subswitch.Const.pattern_number);
        var numberReplacement = "\\d+"
        var dateRE   = new RegExp(com.ktsystems.subswitch.Const.pattern_date);
        var dateReplacement = ".+"
        var tmpPrefix = this.rd;

        com.ktsystems.subswitch.Utils.dumpStr('patternPrefixString; numberRE:'+numberRE+ '; dateRE=' + dateRE+ '; tmpPrefix=' + tmpPrefix);

        if (tmpPrefix.match(numberRE)) {
            var numnerMatchArr = numberRE.exec(tmpPrefix);

            if (numnerMatchArr.length == 2) {
                tmpPrefix = tmpPrefix.replace(numnerMatchArr[0], numberReplacement);
            }
        }
/*
        var dtMatchArr = tmpPrefix.match(dateRE);

        if (dtMatchArr != null) {
            for (var i=0; i<dtMatchArr.length; i++) {
                var dateFormatRE = new RegExp(/{(date|time|datetime):([\w\\\/\-: ]+)}/gi);
                var dateFormat = dateFormatRE.exec(dtMatchArr[i])[2];

                tmpPrefix = tmpPrefix.replace(dtMatchArr[i], com.ktsystems.subswitch.Utils.dateFormat(dateValue, dateFormat));
            }
        }
*/
        com.ktsystems.subswitch.Utils.dumpStr('patternPrefixString - END');
        return tmpPrefix;
    },

    equals : function (otherItem, deep) {
        com.ktsystems.subswitch.Utils.dumpStr('-> equals; this:'+this+'; other:'+otherItem);
        if (this.compare(this.rd, otherItem.rd))
            return true;

        for (var i = 0; i < this.aliases.length; i++) {
            if (this.compare(this.aliases[i], otherItem.rd)) {
                return true;
            }
            for (var j = 0; j < otherItem.aliases.length; j++) {
                if (this.compare(this.rd, otherItem.aliases[j])) {
                    return true;
                }
                if (this.compare(this.aliases[i], otherItem.aliases[j])) {
                    return true;
                }
            }
        }

        if (deep) {
            let cleanThis = this.removeIgnoredSigns(this.rd);
            let rex = new RegExp(otherItem.removeIgnoredSigns(otherItem.patternPrefixString), "gi")

            com.ktsystems.subswitch.Utils.dumpStr('-> equals; cleanThis:'+cleanThis+'; rex:'+rex);
            if (cleanThis.match(rex)) {
                com.ktsystems.subswitch.Utils.dumpStr('-> equals; matched');
                return true
            }

            let cleanThat = otherItem.removeIgnoredSigns(otherItem.rd);
            let rexThis = new RegExp(this.removeIgnoredSigns(this.patternPrefixString), "gi")

            com.ktsystems.subswitch.Utils.dumpStr('-> equals; cleanThat:'+cleanThat+'; rex:'+rexThis);
            if (cleanThat.match(rexThis)) {
                com.ktsystems.subswitch.Utils.dumpStr('-> equals; matched');
                return true
            }
        }
        return false;
    },

    compare : function(sb1, sb2) {
        //com.ktsystems.subswitch.Utils.dumpStr('compare 1 ->' + sb1 + ' ' + sb2);
        var sbi1 = this.removeIgnoredSigns(sb1);
        var sbi2 = this.removeIgnoredSigns(sb2);
        sbi1 = (sbi1 ? sbi1.toLowerCase().trim() : null);
        sbi2 = (sbi2 ? sbi2.toLowerCase().trim() : null);

        return (sbi1 == sbi2);
    },

    removeIgnoredSigns : function(sb) {
        if (sb) {
            let ignoreSigns = com.ktsystems.subswitch.Const.subswitch_prefs.getCharPref("discoveryIgnoreSigns");
            for (var i = 0; i < ignoreSigns.length; i++) {
                sb = sb.split(ignoreSigns.charAt(i)).join('');
            }
            sb = sb.split(' ').join('');
        }
        return sb;
    }
}
