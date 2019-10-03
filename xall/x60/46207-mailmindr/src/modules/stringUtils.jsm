var EXPORTED_SYMBOLS = ['MailmindrStringUtils'];

if (Cu === undefined) var Cu = Components.utils;
if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

Cu.import('resource://gre/modules/PluralForm.jsm');
Cu.import('resource://mailmindr/localisation.jsm');

class MailmindrStringUtils {
    static capitalize(text) {
        if (text.trim().length < 2) {
            return text;
        }

        let t = text.trim();
        return t.slice(0, 1).toUpperCase() + t.slice(1, t.length);
    }

    /**
     * toRelativeString - create a string with a relative time string
     */
    static toRelativeString(dateTimeMS, relativeTo) {
        const now = relativeTo || Date.now();
        const relative = dateTimeMS - now;

        if (undefined === typeof dateTimeMS) {
            return "-";
        }

        const millisecondsMinute = (60 * 1000);
        const millisecondsHour = (60 * millisecondsMinute);
        const millisecondsDay = (24 * millisecondsHour);

        const base = Math.abs(relative);

        const days = Math.floor(base / millisecondsDay);
        const hours = Math.round((base - days * millisecondsDay) / millisecondsHour);
        const minutes = Math.round((base - days * millisecondsDay - hours * millisecondsHour) / millisecondsMinute);
        const seconds = Math.round((base - days * millisecondsDay - hours * millisecondsHour - minutes * millisecondsMinute) / 1000);

        if (relative > 0) {
            if ((days >= 7) && (days % 7 == 0)) {
                return MailmindrStringUtils.pluralize(days / 7, "mailmindr.utils.core.relative.weeks");
            } else if (days > 0) {
                return MailmindrStringUtils.pluralize(days, "mailmindr.utils.core.relative.days");
            } else if (hours > 0) {
                let hourString = MailmindrStringUtils.pluralize(hours, "mailmindr.utils.core.relative.hours");
                let minuteString = "";
                if (minutes > 0) {
                    minuteString = " " + MailmindrStringUtils.pluralize(minutes, "mailmindr.utils.core.relative.andminutes");
                }

                return hourString + minuteString;
            } else if (minutes > 0) {
                return MailmindrStringUtils.pluralize(minutes, "mailmindr.utils.core.relative.minutes");
            }

            if (seconds > 0) {
                return MailmindrStringUtils.pluralize(seconds, "mailmindr.utils.core.relative.seconds");
            }
        }

        if (relative < 0) {
            if ((days >= 7) && (days % 7 == 0)) {
                return MailmindrStringUtils.pluralize(days / 7, "mailmindr.utils.core.relative.past.weeks");
            } else if (days > 0) {
                return MailmindrStringUtils.pluralize(days, "mailmindr.utils.core.relative.past.days");
            } else if (hours > 0) {
                let hourString = MailmindrStringUtils.pluralize(hours, "mailmindr.utils.core.relative.past.hours");
                let minuteString = "";
                if (minutes > 0) {
                    minuteString = " " + MailmindrStringUtils.pluralize(minutes, "mailmindr.utils.core.relative.past.andminutes");
                }

                return hourString + minuteString;
            } else if (minutes > 0) {
                return MailmindrStringUtils.pluralize(minutes, "mailmindr.utils.core.relative.past.minutes");
            }

            if (seconds > 0) {
                return MailmindrStringUtils.pluralize(seconds, "mailmindr.utils.core.relative.past.seconds");
            }
        }

        return mailmindrI18n.getString("mailmindr.utils.core.relative.now");
    }


    static pluralize(num, identifier) {
        let str = PluralForm.get(num, mailmindrI18n.getString(identifier));

        return str.replace("#1", num);
    }
}
