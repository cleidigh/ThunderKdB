// flatpickr date picker simple example
// https://flatpickr.js.org

// localization is taken care of by loading locale scripts
// and setting a locale
// https://flatpickr.js.org/localization/

const flatpLocales = Object.keys(flatpickr.l10ns);
console.debug('flatp available locales: ' + flatpLocales);

flatpickr.localize(flatpickr.l10ns['fr']);
console.log('SetLocale : '+ 'fr');

// this attaches the widget to the input element
// Note the '#' proceeding the ID name
// you can find all the options in the documentation
// https://flatpickr.js.org/options/

let fp = flatpickr("#flatp_date_picker", {
	// mode: "range",
	maxDate: "today",
	defaultDate: [ "2020-02-14" ],
});
