var express = require('express');
var moment = require('moment');
var router = express.Router();
var intercept = require('../utils/intercept');
var Mailer = require('../utils/mailer');
var Claims = require('../models/claims');
var Q = require('q');
var admin = require('./admin');
var config = require('../../config/config');


module.exports = function (app) {
    app.use('/admin', router);
};

router.use(admin.checkIfAdmin);


module.exports.api ={
    sendLocationMail: sendLocationMail
};

function sendLocationMail(event, claim, test, res, next, cb){

    var criteria = {
        event: event,
        status: Claims.STATUS.PAYED
    };

    if (claim){
        criteria._id = claim;
    }


    Claims.find(criteria).populate('event').exec(intercept(function (){}, function (claims) {
        var isTestEmail = test;
        var event = claims[0].event;
        var mailTitle = 'Szczegóły DevMeetingu ' + event.title;
        var eventDaysWeek = [
            'w najbliższą niedzielę',
            'w najbliższy poniedziałek',
            'w najbliższy wtorek',
            'w najbliższą środę',
            'w najbliższy czwartek',
            'w najbliższy piątek',
            'w najbliższż sobotę'
        ];
        var verificationEmails = [];

        res.render('mails/event-location', {
            eventDay: eventDaysWeek[moment(event.eventStartDate).day()],
            startDate: moment(event.eventStartDate).format('DD. MMMM, [start] o H:mm'),
            regDate: moment(event.eventStartDate).subtract(15, 'm').format('H:mm'),
            endDate: moment(event.eventEndDate).format('H:mm'),
            event: event
        }, intercept(next, function (mailText) {
            if (isTestEmail) {
                sendMailToUser(mailText, 'lukaszewczak@gmail.com', mailTitle + ' - TEST', next).then(function () {
                    cb();
                });
            } else {
                verificationEmails.push(sendMailToUser(mailText, 'lukaszewczak@gmail.com', mailTitle, next));

                if (config.env === 'production') {
                    verificationEmails.push(sendMailToUser(mailText, Mailer.bcc, mailTitle, next));
                }

                Q.all(
                    claims.map(function (claim) {
                        return sendMailToUser(mailText, claim.userData.email, mailTitle, next);
                    }).concat(verificationEmails)
                ).then(function () {

                        if (isTestEmail) {
                           cb();
                        }
                        else {

                            Event.update({
                                _id: req.params.ev
                            },{
                                $set: {
                                    'mail.sended': true
                                }
                            }, intercept(next, function (isUpdated){
                                cb();
                            }));
                        }

                    });
            }
        }));
    }));

}

function sendMailToUser (mailText, userTo, title, next) {
    var def = Q.defer();
    Mailer.sendMail({
        from: Mailer.from,
        to: userTo,
        subject: title,
        html: mailText
    }, intercept(next, function () {
        def.resolve();
    }));

    return def.promise;
}

router.post('/events/:ev/users/notify', function (req, res, next) {
    sendLocationMail(req.params.ev, null, req.body.test, res, next, function (){
        res.send(200);
    });
});
