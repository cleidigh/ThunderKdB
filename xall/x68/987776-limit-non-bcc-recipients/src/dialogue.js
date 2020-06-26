window.onload = function() {

//Localisation
  document.getElementById("dialogueTitle").textContent = browser.i18n.getMessage("dialogueTitle");
  document.getElementById("dialogueCountLabel").textContent = browser.i18n.getMessage("dialogueCountLabel");  
  document.getElementById("dialogueLimitLabel").textContent = browser.i18n.getMessage("dialogueLimitLabel");
  document.getElementById("dialogueQuestion").textContent = browser.i18n.getMessage("dialogueQuestion");
  document.getElementById("dialogueQuestionOK").value = browser.i18n.getMessage("dialogueQuestionOK");  
  document.getElementById("dialogueQuestionCancel").value = browser.i18n.getMessage("dialogueQuestionCancel");  
  document.getElementById("dialogueCheckboxLabel").textContent = browser.i18n.getMessage("dialogueCheckboxLabel"); 
// Arguments
  
  count = document.URL.match(/\?[0-9]*\&/)[0] ;
  limit = document.URL.match(/\&[0-9]*$/)[0] ;
  
  document.getElementById("dialogueCount").textContent = count.substring(1,count.length-1) ; 
  document.getElementById("dialogueLimit").textContent = limit.substring(1) ;  
}


document.getElementById("dialogueQuestionOK").addEventListener('click', okpressed);
document.getElementById("dialogueQuestionCancel").addEventListener('click', cancelpressed);

function okpressed() {
  const bccall = document.getElementById('checkbox').checked; 
  // console.log("OK pressed"); 
  // console.log("Checkbox: " + bccall);    
  browser.runtime.sendMessage({msg:"bcc_ok_"+bccall}).catch();
}

function cancelpressed() {
  const bccall = document.getElementById('checkbox').checked; 
  // console.log("CANCEL pressed");  
  // console.log("Checkbox: " + bccall);     
  browser.runtime.sendMessage({msg:"bcc_cancel"}).catch();
}

 
