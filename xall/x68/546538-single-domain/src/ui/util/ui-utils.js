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
  console.log("Start");
  //console.log("container" + container);
  //console.log("stringbundle" + stringbundle);
  for (let el of container.querySelectorAll("*[translate]")) {
    //console.log("start translate" + el);
    console.log("el " + el.getAttribute("translate"));
    let label = stringbundle.get(el.getAttribute("translate"));
    //console.log("Next step");
    for (let placeholder in placeholders) {
      label = label.replace("%" + placeholder + "%", placeholders[placeholder]);
    }
    el.textContent = label;
    console.log("label " + label);
    //console.log("placeholder " + placeholder);
  }
  //console.log("No translate");
  for (let el of container.querySelectorAll("*[translate-attr]")) {
    el.getAttribute("translate-attr").split(",").forEach(attrNameValue => {
      console.log("el with attr " + el.getAttribute("translate-attr"));
      let [attrName, attrValue] = attrNameValue.split("=").map(s => s.trim());
      let label = stringbundle.get(attrValue);
      for (let placeholder in placeholders) {
        label = label.replace("%" + placeholder + "%", placeholders[placeholder]);
      }
      el.setAttribute(attrName, label);
      console.log("label attr " + label);
      //console.log("placeholder" + placeholder);
    });
  }
  //console.log("No attribute");
}
