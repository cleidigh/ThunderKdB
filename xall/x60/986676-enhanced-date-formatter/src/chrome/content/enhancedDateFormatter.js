/**
 * Enhanced Date Formatter namespace.
 */
if (typeof EnhancedDateFormatter == "undefined") {
  var EnhancedDateFormatter = {};
};

EnhancedDateFormatter.getDateFormatForDate = function (date) {
    var dateFormat = EnhancedDateFormatter.preferences.getValue('defaultDateFormat', '');       
        
    // JS dates are stored as milliseconds since midnight on
    // January 1, 1970, UTC, and there are 86400000 in a day, so
    // to get the number of days, just divide by 86400000 and
    // floor the result

    // Additionally, in order to correct for the timezone (so we're
    // not getting day numbers in UTC), we need to subtract off the
    // timezone offset (which is given in minutes, so we need to
    // multiply by 60000 to get milliseconds)
    var todayDate = new Date();
    var todayDay = Math.floor((todayDate.valueOf()-todayDate.getTimezoneOffset()*60000)/86400000);
    var dateDay = Math.floor((date.valueOf()-date.getTimezoneOffset()*60000)/86400000);
    
    if (EnhancedDateFormatter.preferences.getValue('useCustomFormatForLastWeek', false) &&
        dateDay > (todayDay-6)) {
        dateFormat = EnhancedDateFormatter.preferences.getValue('lastWeekDateFormat', '');            
    }
    if (EnhancedDateFormatter.preferences.getValue('useCustomFormatForYesterday', false) &&
        dateDay == (todayDay-1)) {
        dateFormat = EnhancedDateFormatter.preferences.getValue('yesterdayDateFormat', '');
    }
    if (EnhancedDateFormatter.preferences.getValue('useCustomFormatForToday', false) &&
        dateDay == todayDay) {
        dateFormat = EnhancedDateFormatter.preferences.getValue('todayDateFormat', '');
    }
        
    return dateFormat;
};


EnhancedDateFormatter.strftime = function(sFormat, date) {
        
        if (!(date instanceof Date)) date = new Date();
        var nDay = date.getDay(),
            nDate = date.getDate(),
            nMonth = date.getMonth(),
            nYear = date.getFullYear(),
            nHour = date.getHours(),
            aDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            aMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            aDayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334],
            isLeapYear = function() {
                return (nYear%4===0 && nYear%100!==0) || nYear%400===0;
            },
            getThursday = function() {
                var target = new Date(date);
                target.setDate(nDate - ((nDay+6)%7) + 3);
                return target;
            },
            zeroPad = function(nNum, nPad) {
                return ((Math.pow(10, nPad) + nNum) + '').slice(1);
            };
        return sFormat.replace(/%[a-z]/gi, function(sMatch) {
            return (({
                '%a': aDays[nDay].slice(0,3),
                '%A': aDays[nDay],
                '%b': aMonths[nMonth].slice(0,3),
                '%B': aMonths[nMonth],
                '%c': date.toUTCString(),
                '%C': Math.floor(nYear/100),
                '%d': zeroPad(nDate, 2),
                '%e': nDate,
                '%F': date.toISOString().slice(0,10),
                '%G': getThursday().getFullYear(),
                '%g': (getThursday().getFullYear() + '').slice(2),
                '%H': zeroPad(nHour, 2),
                '%I': zeroPad((nHour+11)%12 + 1, 2),
                '%j': zeroPad(aDayCount[nMonth] + nDate + ((nMonth>1 && isLeapYear()) ? 1 : 0), 3),
                '%k': nHour,
                '%l': (nHour+11)%12 + 1,
                '%m': zeroPad(nMonth + 1, 2),
                '%n': nMonth + 1,
                '%M': zeroPad(date.getMinutes(), 2),
                '%p': (nHour<12) ? 'AM' : 'PM',
                '%P': (nHour<12) ? 'am' : 'pm',
                '%s': Math.round(date.getTime()/1000),
                '%S': zeroPad(date.getSeconds(), 2),
                '%u': nDay || 7,
                '%V': (function() {
                    var target = getThursday(),
                        n1stThu = target.valueOf();
                    target.setMonth(0, 1);
                    var nJan1 = target.getDay();
                    if (nJan1!==4) target.setMonth(0, 1 + ((4-nJan1)+7)%7);
                    return zeroPad(1 + Math.ceil((n1stThu-target)/604800000), 2);
                })(),
                '%w': nDay,
                '%x': date.toLocaleDateString(),
                '%X': date.toLocaleTimeString(),
                '%y': (nYear + '').slice(2),
                '%Y': nYear,
                '%z': date.toTimeString().replace(/.+GMT([+-]\d+).+/, '$1'),
                '%Z': date.toTimeString().replace(/.+\((.+?)\)$/, '$1')
            }[sMatch] || '') + '') || sMatch;
        });
};


EnhancedDateFormatter.PreferencesManager = function() {
    var startPoint="extensions.enhancedDateFormatter.";

    var pref=Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefService).
        getBranch(startPoint);

    var observers={};

    // whether a preference exists
    this.exists=function(prefName) {
        return pref.getPrefType(prefName) != 0;
    }

    // returns the named preference, or defaultValue if it does not exist
    this.getValue=function(prefName, defaultValue) {
        var prefType=pref.getPrefType(prefName);

        // underlying preferences object throws an exception if pref doesn't exist
        if (prefType==pref.PREF_INVALID) {
            return defaultValue;
        }

        switch (prefType) {
            case pref.PREF_STRING: return pref.getCharPref(prefName);
            case pref.PREF_BOOL: return pref.getBoolPref(prefName);
            case pref.PREF_INT: return pref.getIntPref(prefName);
        }
    }

    // sets the named preference to the specified value. values must be strings,
    // booleans, or integers.
    this.setValue=function(prefName, value) {
        var prefType=typeof(value);

        switch (prefType) {
            case "string":
            case "boolean":
                break;
            case "number":
                if (value % 1 != 0) {
                    throw new Error("Cannot set preference to non integral number");
                }
                break;
            default:
                throw new Error("Cannot set preference with datatype: " + prefType);
        }

        // underlying preferences object throws an exception if new pref has a
        // different type than old one. i think we should not do this, so delete
        // old pref first if this is the case.
        if (this.exists(prefName) && prefType != typeof(this.getValue(prefName))) {
            this.remove(prefName);
        }

        // set new value using correct method
        switch (prefType) {
            case "string": pref.setCharPref(prefName, value); break;
            case "boolean": pref.setBoolPref(prefName, value); break;
            case "number": pref.setIntPref(prefName, Math.floor(value)); break;
        }
    }

    // deletes the named preference or subtree
    this.remove=function(prefName) {
        pref.deleteBranch(prefName);
    }

    // call a function whenever the named preference subtree changes
    this.watch=function(prefName, watcher) {
        // construct an observer
        var observer={
            observe:function(subject, topic, prefName) {
                watcher(prefName);
            }
        };

        // store the observer in case we need to remove it later
        observers[watcher]=observer;

        pref.QueryInterface(Components.interfaces.nsIPrefBranchInternal).
            addObserver(prefName, observer, false);
    }

    // stop watching
    this.unwatch=function(prefName, watcher) {
        if (observers[watcher]) {
            pref.QueryInterface(Components.interfaces.nsIPrefBranchInternal)
                .removeObserver(prefName, observers[watcher]);
        }
    }
}

EnhancedDateFormatter.preferences = new EnhancedDateFormatter.PreferencesManager();
