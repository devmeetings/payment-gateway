'use strict';

var Mailer = require('./mailer');
var claimDates = require('./claim-dates');
var mailRenderer = require('./mail-renderer');
var config = require('../../config/config');
var intercept = require('./intercept');

module.exports = {
    sendEventConfirmationMail: sendEventConfirmationMail,
    sendEventLocationMail: sendEventLocationMail,
    sendPaymentCancelMail: sendPaymentCancelMail,
    sendPaymentConfirmationMail: sendPaymentConfirmationMail,
    sendPaymentReminderMail: sendPaymentReminderMail,
    sendRegistrationInvitationMail: sendRegistrationInvitationMail
};

function sendMail (options) {

    mailRenderer(options.path, options.lng, options.variables, function (mailText) {
        var mailOptions = {
            from: Mailer.from,
            to: options.to,
            bcc: Mailer.bcc,
            subject: options.title,
            html: mailText
        };

        if (options.noBcc) {
            delete mailOptions.bcc;
        }

        if (options.attachments) {
            mailOptions.attachments = options.attachments;
        }

        Mailer.sendMail(mailOptions, intercept(options.next, function () {
            if (options.cb) {
                options.cb();
            } else {
                options.res.redirect(options.redirectUrl);
            }
        }));
    });
}

function sendEventConfirmationMail (options) {
    var dates = claimDates(options.claim);
    var mailConfig = {
        path: 'event-confirmation',
        lng: options.lng,
        variables: {
            LINK: config.app.url + '/events/' + options.claim.event._id + '/tickets/' + options.claim._id,
            EVENT_TITLE: options.claim.event.title,
            EVENT_CITY: options.claim.event.city,
            EVENT_DATE: dates.eventDate.format('LLL'),
            END_DATE: dates.endDate.format('LLL')
        },
        title: 'Potwierdzenie rejestracji na ' + options.claim.event.title,
        to: options.claim.userData.email,
        res: options.res,
        next: options.next,
        redirectUrl: options.claim.payment.url,
        cb: options.cb
    };

    sendMail(mailConfig);
}

function sendPaymentConfirmationMail (options) {
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
}



function sendEventLocationMail () {

}

function sendPaymentCancelMail () {

}


function sendPaymentReminderMail () {

}

function sendRegistrationInvitationMail () {

}
