/*
  Return dom element or a list of dom Elements
  take a string params like :
  #idElement
  .classElement
  tagDomElement
*/
$ = (el) => {
  if (typeof (el) == 'string') {
    switch (el.charAt(0)) {
      case '#':
        return document.getElementById(el.substr(1, 50));
        break;
      case '.':
        return document.getElementsByClassName(el.substr(1, 50))
        break;
      default:
        return document.getElementsByTagName(el)
        break;
    }
  }
  return null;
}

/*
*
* Copy text to clipboard
*
*/
copyClipboard = (text) => {
  const html = $('html')[0],
    clipboard = document.createElement('textarea');
  html.appendChild(clipboard);
  clipboard.textContent = text;
  clipboard.select();
  document.execCommand('copy');
  html.removeChild(clipboard);
}