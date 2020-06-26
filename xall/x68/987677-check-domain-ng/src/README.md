This extension is to display the warning dialog when you send mail for multiple domains. This is a fork of "Check Domain" addon by karakawa, which can run on 60.0.8 version of Thunderbird.
Original add-on's URL is https://addons.thunderbird.net/en-US/thunderbird/addon/check-domain/?src=ss .
The orignal add-on doesn't work with Thunderbird 68.4.1. Need to change value of em.maxVersion in file install.rdf. We could not contact with developer of that add-on to verify and publish it. And than I opened the topic (https://thunderbird.topicbox.com/groups/addons/T2ac21a62f2f01ba5). Moderators tried to contact with developer, but to no avail and advised to create fork. In install.rdf file I changed some values(em.maxVersion, em:id, em:version, em:description, em:creator) and add path of new icon. In the new version (2.1), I added manifest.json file and do changes, that extension work on Thunderbird 68.5.1.   

BUILD INSTRUCTIONS
Step 1. compress source codes in xpi format.
Step 2. add add-on 

Test enviroment.
OS - Ubuntu 16.04.5
Thunderbird version - 68.5.1