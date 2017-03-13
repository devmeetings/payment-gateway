var schedule = require('node-schedule');
var Event = require('../../models/event');
var Country = require('../../models/country');
var Claims = require('../../models/claims');
var mailSender = require('../../services/mail/event-mail-sender');
var config = require('../../../config/config');
var downloadTranslations = require('../../utils/downloadTranslations');

function startScheduler (app) {
    console.log('Start scheduler');

    schedule.scheduleJob('*/2 * * * *', function () {
        console.log('Translations update');
        downloadTranslations(function() {
            console.log('translations updated');
        });
    });


    schedule.scheduleJob('*/1 * * * *', function () {
        console.log('Scheduler step');
        setInvalidTicketsAsExpired();
    });

    schedule.scheduleJob('*/5 * * * *', function () {
        console.log('Scheduler step waiting for 24h');
        sendReminderForWaitingStatus(app);
    });

    schedule.scheduleJob('*/3 * * * *', function () {
        console.log('Scheduler step close waiting');
        closeWaiting(app);
    });
}

function closeWaiting (app) {
    Claims.find({
        validTill: {
            $lt: new Date()
        },
        status: {
            $in: [Claims.STATUS.WAITING]
        }
    }).populate('event').exec(function (err, claims) {
        if (err) {
            return;
        }
        claims.forEach(function (claim) {

            getEventLanguageAndCurrency(claim.event, function (lng) {
                Claims.update(
                    {
                        _id: claim._id
                    }, {
                        $set: {
                            status: Claims.STATUS.EXPIRED
                        }
                    }, {
                        multi: true
                    },
                    function (err, noOfUpdatedItems) {
                        if (err) {
                            return;
                        }

                        if (noOfUpdatedItems) {

                            var options = {
                                claim: claim,
                                lng: lng,
                            };

                            mailSender.sendPaymentCancelMail(options);

                            Event.update({
                                _id: claim.event._id
                            }, {
                                $inc: {
                                    ticketsLeft: noOfUpdatedItems.nModified
                                }
                            }).exec();

                        }
                    }
                );
            });
        });
    });
}

function sendReminderForWaitingStatus (app) {
    var oneDayBackDate = new Date(new Date().setDate(new Date().getDate() - 1));
    Claims.find({
        claimedTime: {
            $lt: oneDayBackDate
        },
        $or: [
            {reminderSend: false},
            {reminderSend: {$exists: false}}
        ],

        status: {
            $in: [Claims.STATUS.WAITING]
        }
    }).populate('event').exec(function (err, claims) {

        if (err) {
            return;
        }
        claims.forEach(function (claim) {

            getEventLanguageAndCurrency(claim.event, function (lng, currency) {
                var options = {
                    claim: claim,
                    lng: lng,
                    currency: currency,
                };

                mailSender.sendPaymentReminderMail(options);

                Claims.update({
                    _id: claim._id
                }, {
                    $set: {
                        reminderSend: true
                    }
                }).exec();
            });

        });

    });
}

function setInvalidTicketsAsExpired () {
    // TODO [ToDr] reclaim tickets
    Claims.find({
        validTill: {
            $lt: new Date()
        },
        status: {
            // TODO [ToDr] Dont remove WAITING tickets automatically!
            // $in: [Claims.STATUS.ACTIVE #<{(|, Claims.STATUS.WAITING |)}>#]
            $in: [Claims.STATUS.ACTIVE, Claims.STATUS.INVITED, Claims.STATUS.CREATING_PAYMENT]
        }
    }).populate('event').exec(function (err, claims) {
        if (err) {
            return;
        }
        claims.forEach(function (claim) {
            Claims.update(
                {
                    _id: claim._id
                }, {
                    $set: {
                        status: Claims.STATUS.EXPIRED
                    }
                }, {
                    multi: true
                },
                function (err, noOfUpdatedItems) {
                    if (err) {
                        return;
                    }

                    if (noOfUpdatedItems) {
                        Event.update({
                            _id: claim.event._id
                        }, {
                            $inc: {
                                ticketsLeft: noOfUpdatedItems.nModified
                            }
                        }).exec();
                    }
                }
            );
        });
    });
}

function getEventLanguageAndCurrency (event, cb) {
    Country.findOne({
        _id: event.country
    }).exec(function (err, country) {
        if (err) {
            return;
        }

        var lng = (country && country.code) || 'pl';
        var currency = (country && country.currency) || 'pln';

        cb(lng, currency);
    });
}

module.exports.startScheduler = startScheduler;
