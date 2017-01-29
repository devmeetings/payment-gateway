'use strict';

var Claims = require('../../models/claims');
var Event = require('../../models/event');
var intercept = require('../../utils/intercept');

module.exports = function (req, res, next) {
    Claims.remove({
        _id: req.params.claimId
    }).exec(intercept(next, function () {
        addOneTicketToEventAvailableTickets(req.params.ev);
        res.send('ok');
    }));

    function addOneTicketToEventAvailableTickets (eventId) {
        Event.update({
            _id: eventId
        }, {
            $inc: {
                ticketsLeft: 1
            }
        }).exec();
    }
};