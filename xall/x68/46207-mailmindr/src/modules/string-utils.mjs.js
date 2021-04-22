import { createLogger } from './logger.mjs.js';

const logger = createLogger('string-utils');

const simplePluralize = (num, identifier) => {
    const pluralizer = new Intl.PluralRules(navigator.language, {
        type: 'cardinal'
    });

    // 
    const selector = pluralizer.select(num);
    const messageSelector = `${identifier}.${selector}`;
    const pluralizedMessage = browser.i18n.getMessage(messageSelector, num);

    if (pluralizedMessage !== '') {
        return pluralizedMessage;
    }

    logger.warn(
        `[mailmindr] identifier '${messageSelector}' not found, using fallback to '${identifier}'`
    );

    const template = browser.i18n.getMessage(identifier);
    const splitter =
        browser.i18n.getMessage('module.string-utils.pluralize.separator') ||
        ';';
    const chunks = template.split(splitter);
    const index = Math.min(num, chunks.length - 1);
    const text = chunks[index];

    return text.replace('#1', num);
};

export const pluralize = (num, identifier) => {
    // 

    return simplePluralize(num, identifier);
};

/**
 * Capitalize the first letter of a text with respect to a locale
 * @param {string} text
 * @param {string} locale
 * @returns string
 */
export const capitalizeFirstLetter = (text, locale) => {
    const [firstLetter, ...rest] = text;
    if (firstLetter) {
        return `${firstLetter.toLocaleUpperCase(
            locale || navigator.language
        )}${rest.join('')}`;
    }

    return '';
};

/**
 * will create something like
 * 		"tomorrow"
 *  	"in 5 seconds"
 */
export const toRelativeStringFromTimespan = timespan => {
    const { days = null, hours = null, minutes = null, isRelative } = timespan;

    if (!isRelative) {
        return null;
    }

    const toRelativeFragment = (value, unit) =>
        new Intl.RelativeTimeFormat(navigator.language, {
            numeric: 'auto',
            style: 'long'
        }).format(value, unit);
    let result = [
        [days, 'day'],
        [hours, 'hour'],
        [minutes, 'minute']
    ]
        .map(([value, unit]) => value && toRelativeFragment(value, unit))
        .filter(Boolean);

    // 
    // 
    // 
    // 
    // 
    if (result.length > 1) {
        result.splice(-1, 0, 'and');
    }

    const textSnippetAnd = browser.i18n.getMessage(
        'module.string-utils.chunk.and'
    );
    const text = result.join(',');
    return text.replace(`,and,`, ` ${textSnippetAnd} `);
};

export const toRelativeString = (dateTimeMS, relativeTo) => {
    const now = relativeTo || Date.now();
    const relative = dateTimeMS - now;

    if (undefined === typeof dateTimeMS) {
        return '-';
    }

    const millisecondsMinute = 60 * 1000;
    const millisecondsHour = 60 * millisecondsMinute;
    const millisecondsDay = 24 * millisecondsHour;

    const base = Math.abs(relative);

    const days = Math.floor(base / millisecondsDay);
    const hours = Math.round(
        (base - days * millisecondsDay) / millisecondsHour
    );
    const minutes = Math.round(
        (base - days * millisecondsDay - hours * millisecondsHour) /
            millisecondsMinute
    );
    const seconds = Math.round(
        (base -
            days * millisecondsDay -
            hours * millisecondsHour -
            minutes * millisecondsMinute) /
            1000
    );

    if (relative > 0) {
        if (days >= 7 && days % 7 == 0) {
            return simplePluralize(
                days / 7,
                'module.string-utils.relative.ahead.weeks.pluralize'
            );
        } else if (days > 0) {
            return simplePluralize(
                days,
                'module.string-utils.relative.ahead.days.pluralize'
            );
        } else if (hours > 0) {
            let hourString = simplePluralize(
                hours,
                'module.string-utils.relative.ahead.hours.pluralize'
            );
            let minuteString = '';
            if (minutes > 0) {
                minuteString =
                    ' ' +
                    simplePluralize(
                        minutes,
                        'module.string-utils.relative.ahead.and-minutes.pluralize'
                    );
            }

            return hourString + minuteString;
        } else if (minutes > 0) {
            return simplePluralize(
                minutes,
                'module.string-utils.relative.ahead.minutes.pluralize'
            );
        }

        if (seconds > 0) {
            return simplePluralize(
                seconds,
                'module.string-utils.relative.ahead.seconds.pluralize'
            );
        }
    }

    if (relative < 0) {
        if (days >= 7 && days % 7 == 0) {
            return simplePluralize(
                days / 7,
                'module.string-utils.relative.ago.weeks.pluralize'
            );
        } else if (days > 0) {
            return simplePluralize(
                days,
                'module.string-utils.relative.ago.days.pluralize'
            );
        } else if (hours > 0) {
            let hourString = simplePluralize(
                hours,
                'module.string-utils.relative.ago.hours.pluralize'
            );
            let minuteString = '';
            if (minutes > 0) {
                minuteString =
                    ' ' +
                    simplePluralize(
                        minutes,
                        'module.string-utils.relative.ago.and-minutes.pluralize'
                    );
            }

            return hourString + minuteString;
        } else if (minutes > 0) {
            return simplePluralize(
                minutes,
                'module.string-utils.relative.ago.minutes.pluralize'
            );
        }

        if (seconds > 0) {
            return simplePluralize(
                seconds,
                'module.string-utils.relative.ago.seconds.pluralize'
            );
        }
    }

    return browser.i18n.getMessage('module.string-utils.relative.now');
};
