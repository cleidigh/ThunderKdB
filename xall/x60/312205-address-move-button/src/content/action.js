function moveUp(textbox)
{
  var recipient = textbox.parentNode.parentNode;
  swapRecipient(recipient.previousSibling, recipient);
}

function moveDown(textbox)
{
  var recipient = textbox.parentNode.parentNode;
  swapRecipient(recipient, recipient.nextSibling);
}

function swapRecipient(recipientA, recipientB)
{
  try {
    var addrA = getAddress(recipientA);
    var typeA = getType(recipientA);
    var addrB = getAddress(recipientB);
    var typeB = getType(recipientB);
    if (addrA != "" && addrB != "") {
      setAddress(recipientA, addrB);
      setType(recipientA, typeB);

      setAddress(recipientB, addrA);
      setType(recipientB, typeA);
    }
  } catch (e) {
	  console.log(e);
  }
}

function getAddress(recipient)
{
  return recipient.childNodes[1].childNodes[0].value;
}

function setAddress(recipient, addr)
{
  recipient.childNodes[1].childNodes[0].value = addr;
}

function getType(recipient)
{
  return recipient.childNodes[0].childNodes[0].value;
}

function setType(recipient, type)
{
  recipient.childNodes[0].childNodes[0].value = type;
}
