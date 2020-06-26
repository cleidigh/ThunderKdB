const form17 = window.document.getElementById('form17');
form17.addEventListener('click', notifyBackgroundPage17);

function handleResponse17(message) {console.log(`Message from background17: ${message.response17}`)};

function notifyBackgroundPage17(e) {var sending17 = browser.runtime.sendMessage({execute17: "Executing from form17"});
                                                 sending17.then(handleResponse17);}