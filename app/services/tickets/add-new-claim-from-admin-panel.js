'use strict';

var Claims = require('../../models/claims');
var intercept = require('../../utils/intercept');
var buildNewClaim = require('./build-claim-by-admin');

module.exports = function (req, res, next) {
    var newClaim = buildNewClaim(req.params.ev, req.body);

    Claims.create(newClaim, intercept(next, function () {
        res.send('ok');
    }));
};