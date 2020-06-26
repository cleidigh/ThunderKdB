const form6 = window.document.getElementById('form6');
form6.addEventListener('click', notifyBackgroundPage6);

function handleResponse6(message) {console.log(`Message from background6: ${message.response6}`)};

function notifyBackgroundPage6(e) {var sending6 = browser.runtime.sendMessage({execute6: "Executing from form6"});
                                                 sending6.then(handleResponse6);}