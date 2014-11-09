var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    Event = require('../models/event'),
    Claims = require('../models/claims');

module.exports = function(app) {
    app.use('/', router);
};


function intercept(next, func) {
    return function( /*args*/ ) {
        var err = arguments[0];
        var args = Array.prototype.slice.call(arguments, 1);
        if (err) {
            next(err);
        } else {
            return func.apply(this, args);
        }
    };
};

router.get('/', function(req, res, next) {

    Event.find(intercept(next, function(events) {
        res.render('index', {
            title: 'Events',
            events: events
        });
    }));

});

router.get('/events/:name', function(req, res, next) {

    Event.findOne({
        name: req.params.name
    }, intercept(next, function(ev) {
        if (!ev) {
            return res.send(404);
        }

        // TODO [ToDr] reclaim tickets

        res.render('event', {
            title: ev.title,
            event: JSON.stringify(ev)
        });
    }));

});

router.get('/events/:id/tickets/:claim', function(req, res, next) {

    Claims.findOne({
        _id: req.params.claim,
        event: req.params.id
    }).populate('event').exec(intercept(next, function(claim) {
        if (!claim) {
            return res.send(404);
        }

        res.render('event-ticket_fill', {
            claim: claim,
            claim_json: JSON.stringify(claim)
        });

    }));

});

router.post('/events/:name/tickets', function(req, res, next) {

    var CLAIM_TIME = 15 * 60 * 1000;

    function createClaim(ev) {

        var now = new Date();
        Claims.create({
            event: ev._id,
            claimedTime: new Date(),
            validTill: new Date(now.getTime() + CLAIM_TIME),
            status: 'active'
        }, intercept(next, function(claim) {

            res.redirect('/events/' + ev._id + '/tickets/' + claim._id);

        }));
    }

    function tryToClaimTicket(ev) {
        Event.update({
            _id: ev._id,
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
        }, intercept(next, function(isUpdated) {
            console.log(arguments);

            if (!isUpdated) {
                return res.render('event-ticket_failed', {
                    title: ev.title,
                    event: ev
                });
            }

            createClaim(ev);
        }));
    }

    Event.findOne({
        name: req.params.name
    }, intercept(next, function(ev) {
        if (!ev) {
            return res.send(404);
        }
        tryToClaimTicket(ev);
    }));

});