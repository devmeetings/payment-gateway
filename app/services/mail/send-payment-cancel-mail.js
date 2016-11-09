'use strcit';

var sendMail = require('./send-mail-with-mail-renderer');

module.exports = function sendPaymentCancelMail(options){

    var mailConfig = {
        path: 'payment-cancel',
        lng: options.lng,
        variables: {
            EVENT_TITLE: options.claim.event.title,
            EVENT_DATE: dates.eventDate.format('LLL')
        },
        title: 'Anulowanie rezerwacji na DevMeeting ' + options.claim.event.title,
        to: options.claim.userData.email,
        noBcc: true
    };

    sendMail(mailConfig);
};