'use strict';

var intercept = require('../../utils/intercept');
var Claims = require('../../models/claims');
var mailSender = require('./event-mail-sender');

module.exports = function sendLocationMail(eventId, claim, test, req, res, next, cb){

    var criteria = {
        event: eventId,
        status: Claims.STATUS.PAYED
    };

    if (claim){
        criteria._id = claim;
    }


    Claims.find(criteria).populate('event').exec(intercept(function (){}, function (claims) {

        mailSender.sendEventLocationMail({
            claims: claims,
            res: res,
            req: req,
            next: next,
            test: test,
            cb: cb
        });
    }));

};