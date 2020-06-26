const form11 = window.document.getElementById('form11');
form11.addEventListener('click', notifyBackgroundPage11);

function handleResponse11(message) {console.log(`Message from background11: ${message.response11}`)};

function notifyBackgroundPage11(e) {var sending11 = browser.runtime.sendMessage({execute11: "Executing from form11"});
                                                 sending11.then(handleResponse11);}