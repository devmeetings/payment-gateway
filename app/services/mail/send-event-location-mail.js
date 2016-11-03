'use strict';

var Q = require('q');
var moment = require('moment');

var sendMailWithSpecificText = require('./send-mail-with-specific-text');
var mailRenderer = require('./mail-renderer');
var config = require('../../../config/config');
var intercept = require('../../utils/intercept');

module.exports = function sendEventLocationMail (options) {

    var eventLocationConfig = {
        path: 'event-mail-text/' + 949 //options.claim.event._id
    };

    mailRenderer(eventLocationConfig, function (mailText) {
        var eventLocationExec = /%EVENT_LOCATION%([^%]*)%EVENT_LOCATION_END%/g.exec(mailText);
        var eventLocation = eventLocationExec && eventLocationExec.length === 2 ? eventLocationExec[1]: '';

        var eventDetailsExec = /%EVENT_DETAILS%(.*)EVENT_DETAILS_END%/g.exec(mailText);
        var eventDetails = eventDetailsExec && eventDetailsExec.length === 2 ? eventDetailsExec[1]: '';
        eventDetails = eventDetails.split('').slice(0,-1).join('');

        sendFullMail(options, eventLocation, eventDetails);
    });
};

function sendFullMail(options, eventLocation, eventDetails){
    var isTestEmail = options.test;
    var event = options.claims[0].event;
    var eventDaysWeek = [
        options.req.t('eventDaysWeek.sunday'),
        options.req.t('eventDaysWeek.monday'),
        options.req.t('eventDaysWeek.tuesday'),
        options.req.t('eventDaysWeek.wednesday'),
        options.req.t('eventDaysWeek.thursday'),
        options.req.t('eventDaysWeek.friday'),
        options.req.t('eventDaysWeek.saturday'),
    ];
    var mailTitle = 'Szczegóły DevMeetingu ' + event.title;
    var verificationEmails = [];

    var mailConfig = {
        path: 'event-location',
        lng: options.lng,
        variables: {
            EVENT_LOCATION: eventLocation,
            EVENT_DETAILS: eventDetails,
            END_DATE: moment(event.eventEndDate).format('H:mm'),
            REG_DATE: moment(event.eventStartDate).subtract(15, 'm').format('H:mm'),
            START_DATE: moment(event.eventStartDate).format('DD. MMMM, [start] o H:mm'),
            EVENT_TITLE: event.title,
            EVENT_CITY: event.mail.city,
            EVENT_DAY: eventDaysWeek[moment(event.eventStartDate).day()]
        },
        noBcc: true,
        next: options.next
    };

    mailRenderer(mailConfig, function (mailText) {
        if (isTestEmail) {
            sendMailWithSpecificText(mailText, 'lukaszewczak@gmail.com', mailTitle + ' - TEST', mailConfig.next).then(function () {
                options.cb();
            });
        } else {
            verificationEmails.push(sendMailWithSpecificText(mailText, 'lukaszewczak@gmail.com', mailTitle, mailConfig.next));

            if (config.env === 'production') {
                verificationEmails.push(sendMailWithSpecificText(mailText, Mailer.bcc, mailTitle, mailConfig.next));
            }

            Q.all(
                claims.map(function (claim) {
                    return sendMailWithSpecificText(mailText, claim.userData.email, mailTitle, mailConfig.next);
                }).concat(verificationEmails)
            ).then(function () {

                if (isTestEmail) {
                    options.cb();
                }
                else {

                    Event.update({
                        _id: eventId
                    },{
                        $set: {
                            'mail.sended': true
                        }
                    }, intercept(next, function (isUpdated){
                        options.cb();
                    }));
                }
            });
        }
    });

}