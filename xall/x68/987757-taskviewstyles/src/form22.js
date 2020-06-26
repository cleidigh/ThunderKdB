const form22 = window.document.getElementById('form22');
form22.addEventListener('click', notifyBackgroundPage22);

function handleResponse22(message) {console.log(`Message from background22: ${message.response22}`)};

function notifyBackgroundPage22(e) {var sending22 = browser.runtime.sendMessage({execute22: "Executing from form22"});
                                                 sending22.then(handleResponse22);}