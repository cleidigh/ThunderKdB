# Disable Signature

This thunderbird extension allows to disable the S/MIME signature of messages.

## Why?

As of Thunderbird 68, it is not possible to remove attachments of signed messages. This is probably because it invalidates the signature. With my mailbox getting bigger and bigger, I still wanted a way to delete large attachments.

## How?

As explained in [this comment](https://bugzilla.mozilla.org/show_bug.cgi?id=288700#c32) by David von Oheimb in a 15 year old bug report, we disable the signature by changing the content type header of signed messages.

For example, this content type header

    Content-Type: multipart/signed; protocol="application/x-pkcs7-signature";

is changed to

    Content-Type: multipart/mixed; protocol="application/x-pkcs7-disabled-signature";

Afterwards, Thunderbird will no longer recognize this message as signed and attachments (including the signature itself) can be deleted or detached.

This process can be reversed by restoring the original header (at least if no attachments were removed).
