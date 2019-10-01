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
  return browser.i18n.getMessage("extLocale");
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
  req.onerror = function (e) { logError(e); }
  req.open("GET", url, false); // sync
  req.overrideMimeType("text/plain");
  req.send(); // blocks
  return req.responseText;
}

/**
 * Strips long query values from a URL.
 *
 * @param aUrl {String} The URL which might have long query values
 * @return     {String} The stripped URL
 *
 * Values of over 14 characters are replaced with "stripped".
 */
function stripLongQueryValues(aURL)
{
  let url = new URL(aURL);
  let params = new URLSearchParams();
  for (let [name, value] of url.searchParams) {
    params.append(name, value.length > 14 ? "stripped" : value);
  }
  url.search = params;
  return url.href;
}

/**
 * Used to explicitly run an async function in the background.
 *
 * @param aPromise {Promise} The promise that the caller doesn't want to await
 * @param aErrorCallback {Function} A function to call if the promise rejects
 */
async function noAwait(aPromise, aErrorCallback)
{
  try {
    await aPromise;
  } catch (ex) {
    aErrorCallback(ex);
  }
}
