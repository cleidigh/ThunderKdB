window.onload = function() {

//Localisation
  document.getElementById("dialogueTitle").textContent = browser.i18n.getMessage("dialogueTitle");
  document.getElementById("dialogueCountLabel").textContent = browser.i18n.getMessage("dialogueCountLabel");  
  document.getElementById("dialogueLimitLabel").textContent = browser.i18n.getMessage("dialogueLimitLabel");
  document.getElementById("dialogueQuestion").textContent = browser.i18n.getMessage("dialogueQuestion");
  document.getElementById("dialogueQuestionOK").value = browser.i18n.getMessage("dialogueQuestionOK");  
  document.getElementById("dialogueQuestionCancel").value = browser.i18n.getMessage("dialogueQuestionCancel");  
  document.getElementById("dialogueCheckboxLabel").textContent = browser.i18n.getMessage("dialogueCheckboxLabel"); 

  strictLimitWarning = browser.i18n.getMessage("strictLimitWarning");

// Arguments
  count = document.URL.match(/\?[0-9]*\&/)[0] ;
  limit = document.URL.match(/\&m[0-9]*\&/)[0] ;
  strict = document.URL.match(/\&s./)[0] ;

// console.log("count: " + count.substring(1,count.length-1) + " limit: " +  limit.substring(2,limit.length-1) + " strict: " +  strict.substring(2) );
  
  document.getElementById("dialogueCount").textContent = count.substring(1,count.length-1) ; 
  document.getElementById("dialogueLimit").textContent = limit.substring(2,limit.length-1) ;  

  if (strict.substring(2) == "1") {strictLimit = true } else {strictLimit = false}  
  document.getElementById("checkbox").checked = strictLimit ; 

}

document.getElementById("dialogueQuestionOK").addEventListener('click', okpressed);
document.getElementById("dialogueQuestionCancel").addEventListener('click', cancelpressed);
document.getElementById("checkbox").addEventListener('change', checkboxChanged);

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

function  checkboxChanged(){
// Cannot change if Strict Limit: reset and issue warning
  if (strictLimit) {
    document.getElementById("checkbox").checked = strictLimit ;
    document.getElementById("messageLine").textContent = strictLimitWarning
  }
}




