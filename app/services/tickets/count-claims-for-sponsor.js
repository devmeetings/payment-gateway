'use strict';

var Q = require('q');
var Claims = require('../../models/claims');

module.exports = function (envId) {
    var def = Q.defer();
    Claims.find({
        event: envId,
        'extra.sponsor': true
    }).count(function (err, count) {
        if (err) {
            def.reject();
            return;
        }

        def.resolve(count);
    });

    return def.promise;
};