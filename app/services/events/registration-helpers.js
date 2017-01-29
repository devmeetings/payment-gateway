'use strict';

var intercept = require('../../utils/intercept');
var Event = require('../../models/event');
var Claims = require('../../models/claims');
var config = require('../../../config/config');
var Q = require('q');

module.exports = function (req, res, next) {
    return {
        redirectToRegistrationForm: redirectToRegistrationForm,
        ifNoCookieCreateTicketForEvent: ifNoCookieCreateTicketForEvent,
        areThereTicketsForRegistration: areThereTicketsForRegistration,
        getTicketFromCookie: getTicketFromCookie,
        getEventForRegistration: getEventForRegistration
    };

    function redirectToRegistrationForm (options) {
        var def = Q.defer();
        if (isEmptyObj(options) || isEmptyObj(options.event) || isEmptyObj(options.ticket)) {
            return def.reject();
        }

        res.redirect('/events/' + options.event._id + '/tickets/' + options.ticket._id);
        def.resolve();
        return def.promise;
    }

    function ifNoCookieCreateTicketForEvent (options) {
        var event = options.event;
        var ticket = options.ticket;
        var def = Q.defer();
        if (!isEmptyObj(ticket)) {
            def.resolve(options);
        } else {

            areThereTicketsForRegistration(event).then(createClaimForEvent).then(function (ticket) {
                def.resolve({
                    event: event,
                    ticket: ticket
                });
            }).catch(function () {
                res.render('event-ticket_failed', {
                    title: event.title,
                    event: event
                });
                def.resolve();
            });
        }

        return def.promise;
    }

    function areThereTicketsForRegistration (event) {
        var def = Q.defer();

        Event.update({
            _id: event._id,
            openDate: {
                $lte: new Date().toString()
            },
            ticketsLeft: {
                $gt: 0
            }
        }, {
            $inc: {
                ticketsLeft: -1
            }
        }, intercept(next, function (isUpdated) {
            if (!isUpdated) {
                return def.reject();
            }

            return def.resolve(event);
        }));

        return def.promise;
    }

    function isEmptyObj (objToTest) {
        return Object.keys(objToTest).length === 0;
    }

    function getTicketFromCookie (event) {
        var def = Q.defer();
        var result = {
            event: event,
            ticket: {}
        };
        if (req.cookies.claim) {
            var cookieParts = req.cookies.claim.split(':');
            var eventIdFromCookie = cookieParts[0];
            var tickeIdFromCookie = cookieParts[1];
            if (cookieParts.length === 2) {
                if (event._id !== eventIdFromCookie) { // user open register form for different event
                    res.clearCookie('claim', {});
                    def.resolve(result);
                } else {
                    Claims.findOne({
                        _id: tickeIdFromCookie,
                        event: eventIdFromCookie,
                        status: Claims.STATUS.ACTIVE
                    }).exec(intercept(next, function (claim) {
                        if (claim) {
                            result.ticket = claim;
                        }
                        //res.redirect('/events/' + cookieParts[0] + '/tickets/' + cookieParts[1]);
                        def.resolve(result);
                    }));
                }
            }
        } else {
            def.resolve(result);
        }

        return def.promise;
    }

    function getEventForRegistration (name) {
        var def = Q.defer();
        Event.findOne({
            name: name
        }).populate('country').exec(function (err, event) {
            if (err) {
                def.reject()
            }

            if (!event || !event.canRegisterByForm) {
                return def.reject();
            }

            def.resolve(event);
        });

        return def.promise;
    }

    function createClaimForEvent (event) {
        var def = Q.defer();

        if (!event) {
            throw new Error('try to create claim without passing event argument!');
        }

        var now = new Date();
        var validTill = new Date(now.getTime() + config.registration_claim_time);

        req.session.country = event.country;

        Claims.create({
            event: event._id,
            vatRate: event.country ? event.country.vatRate : 23,
            claimedTime: new Date(),
            validTill: validTill,
            status: Claims.STATUS.ACTIVE
        }, intercept(next, function (claim) {
            res.cookie('claim', event._id + ':' + claim._id, {expires: validTill});
            def.resolve(claim);
            // res.redirect('/events/' + ev._id + '/tickets/' + claim._id);
        }));

        return def.promise;
    }

};
