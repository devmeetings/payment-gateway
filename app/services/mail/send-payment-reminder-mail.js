'use strcit';

var sendMail = require('./send-mail-with-mail-renderer');
var claimDates = require('../../utils/claim-dates');
var config = require('../../../config/config');

module.exports = function sendPaymentReminderMail(options){

    var dates = claimDates(options.claim);
    var mailConfig = {
        path: 'payment-reminder',
        lng: options.lng,
        variables: {
            AMOUNT: options.claim.amount,
            CURRENCY: options.currency || 'zł',
            LINK: config.app.url + '/events/' + options.claim.event._id + '/tickets/' + options.claim._id,
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
