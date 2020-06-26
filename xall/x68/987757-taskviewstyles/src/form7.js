const form7 = window.document.getElementById('form7');
form7.addEventListener('click', notifyBackgroundPage7);

function handleResponse7(message) {console.log(`Message from background7: ${message.response7}`)};

function notifyBackgroundPage7(e) {var sending7 = browser.runtime.sendMessage({execute7: "Executing from form7"});
                                                 sending7.then(handleResponse7);}