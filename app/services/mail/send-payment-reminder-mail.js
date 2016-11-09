'use strcit';

var sendMail = require('./send-mail-with-mail-renderer');

module.exports = function sendPaymentReminderMail(options){

    var mailConfig = {
        path: 'payment-reminder',
        lng: options.lng,
        variables: {
            EVENT_TITLE: options.claim.event.title,
            EVENT_DATE: dates.eventDate.format('LLL'),
            END_DATE: dates.endDate.format('LLL'),
        },
        title: 'Przypomnienie o rezerwacji',
        to: options.claim.userData.email,
        noBcc: true
    };

    sendMail(mailConfig);
};