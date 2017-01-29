'use strict';

var Claims = require('../../models/claims');
var intercept = require('../../utils/intercept');

module.exports = function (req, res, next) {
    Claims.findOneAndUpdate({
        _id: req.params.claimId
    }, {
        $set: {
            status: Claims.STATUS.OFFLINE_PENDING
        }
    }).exec(intercept(next, function () {
        res.send('ok');
    }));
};