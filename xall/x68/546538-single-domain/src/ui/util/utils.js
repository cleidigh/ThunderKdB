/**
 * Get the language of our extension.
 * Only the locales for which our ext has translations.
 *
 * This should normally be the same as the browser UI locale getUILocale(),
 * but not when we don't have that language, e.g. the browser is in "fr".
 * In that case, this function returns the fallback, e.g. "en" instead of "fr"
 *
 * This is used by stringbundle.js.
 *
 * @returns {String} e.g. "en"
 * @see also getUILocale()
 */
function getExtLocale()
{
  return window.browser.i18n.getMessage("extLocale");
}
function getExtLanguage() {
  var extLocale = window.browser.i18n.getUILanguage();
  //extLocale = "fr"
  console.log("language first " + extLocale);
  var trialUrl = chrome.extension.getURL("locale/" + extLocale + "/settings.properties");
  try {
    let thisContent = readURLasUTF8(trialUrl);//This is a test to see if there are files for this language.
  } catch (e) {
    extLocale = "en-GB"
    console.log("Changed to English");// If the files don't exist, en-GB is the default
  }
  console.log("language " + extLocale);
  return extLocale;
}

/**
 * Takes a string (which is typically the content of a file,
 * e.g. the result returned from readURLUTF8() ), and splits
 * it into lines, and returns an array with one string per line
 *
 * Linebreaks are not contained in the result,,
 * and all of \r\n, (Windows) \r (Mac) and \n (Unix) counts as linebreak.
 *
 * @param content {String} one long string with the whole file
 * @return {Array of String} one string per line (no linebreaks)
 */
function splitLines(content)
{
  return content.split(/\n|\r\n?/);
}

/**
 * Reads UTF8 data from a URL.
 *
 * @param url {String}   what you want to read
 * @return {String}   the contents of the file, as one long string
 */
function readURLasUTF8(url)
{
  var req = new XMLHttpRequest();
  req.onerror = function (e) { console.error(e); }
  req.open("GET", url, false); // sync
  req.overrideMimeType("text/plain");
  req.send(); // blocks
  console.log("OK XML request");
  return req.responseText;
}
