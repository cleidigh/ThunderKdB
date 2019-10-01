/**
 * Utility function that gets all elements that have a
 * translate="" atttribute, uses it as stringbundle key,
 * gets the corresponding string from the |stringbundle|,
 * and sets the element content textnode to that string.
 *
 * @param container {DOMElement}   Iterators over this element
 * @param stringbundle {StringBundle}
 * @param placeholders {Map of key {String} -> label {String}} %key% will be replaced with label
 */
function translateElements(container, stringbundle, placeholders)
{
  for (let el of container.querySelectorAll("*[translate]")) {
    let id = el.getAttribute("translate");
    let label;
    try {
      label = stringbundle.get(id);
      for (let placeholder in placeholders) {
        label = label.replace("%" + placeholder + "%", placeholders[placeholder]);
      }
    } catch (ex) {
      logError(ex);
      label = id;
    }
    el.textContent = label;
  }

  for (let el of container.querySelectorAll("*[translate-attr]")) {
    el.getAttribute("translate-attr").split(",").forEach(attrNameValue => {
      let [attrName, id] = attrNameValue.split("=").map(s => s.trim());
      let label;
      try {
        label = stringbundle.get(id);
        for (let placeholder in placeholders) {
          label = label.replace("%" + placeholder + "%", placeholders[placeholder]);
        }
      } catch (ex) {
        logError(ex);
        label = id;
      }
      el.setAttribute(attrName, label);
    });
  }
}
