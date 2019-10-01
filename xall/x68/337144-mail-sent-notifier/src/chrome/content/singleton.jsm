// ----------------------------------------------------------------------------
// File   : singleton.js
// Descr. : JavaScript Component Modul: Exported symbols can be used in d�fferent
//          scopes, details, see following link:
//          https://developer.mozilla.org/en/JavaScript_code_modules/Using
//          Integrate in code, when needed, using the following call:
//          Components.utils.import("chrome://mail_sent_notifier/content/singleton.jsm");
// Version: v.0.1
// Infos  : 04.01.2012, fjo, fontajos@phpeppershop.com
// ----------------------------------------------------------------------------
var EXPORTED_SYMBOLS = ['test_foo', 'test_bar'];

function test_foo() {
  return 'test_foo';
}

var test_bar = {
  name: 'test_bar',
  size: 3,
};

var test_dummy = 'dummy';

// End of file ----------------------------------------------------------------
