'use strict';

var sendMail = require('./send-mail-with-mail-renderer');
var claimDates = require('../../utils/claim-dates');

module.exports = function sendPaymentConfirmationMail (options) {
    var dates = claimDates(options.claim);
    var attachments = [];
    if (options.file) {
        attachments.push({
            path: options.file
        });
    }

    var mailConfig = {
        path: 'payment-confirmation',
        lng: options.lng,
        variables: {
            AMOUNT: options.claim.amount,
            CURRENCY: options.currency || 'zł',
            USERNAME: options.claim.userData.names,
            USER_EMAIL: options.claim.userData.email,
            EVENT_TITLE: options.claim.event.title,
            EVENT_DATE: dates.eventDate.format('LLL'),
            PAYMENT_TYPE: options.claim.payment.paypalToken ? 'PayPalId' :  'PayuId',
            PAYMENT_ID: options.claim.payment.id,
        },
        title: 'Potwierdzenie płatności: ' + options.claim.amount + ' '  + (options.currency || 'zł'),
        to: options.claim.userData.email,//Mailer.bcc,
        noBcc: true,
        attachments: attachments,
        next: options.next,
        cb: sendPaymentConfirmationMailToUser
    };

    sendMail(mailConfig);


    function sendPaymentConfirmationMailToUser() {

        var mailConfig = {
            path: 'payment-confirmation-to-user',
            lng: options.lng,
            variables: {
                AMOUNT: options.claim.amount,
                CURRENCY: options.currency || 'zł',
                USERNAME: options.claim.userData.names,
                USER_EMAIL: options.claim.userData.email,
                EVENT_TITLE: options.claim.event.title,
                EVENT_CITY: options.claim.event.mail.city,
                IF_INVOICE: options.invoiceNo ? true : false,
                EVENT_DAY: dates.eventDate.format('LLL'),
                INVOICE_NO: options.invoiceNo
            },
            title: 'Potwierdzenie płatności: ' + options.claim.amount + ' ' + (options.currency || 'zł'),
            to: options.claim.userData.email,
            noBcc: true,
            attachments: attachments,
            next: options.next,
            cb: options.cb
        };

        sendMail(mailConfig);
    }
};

