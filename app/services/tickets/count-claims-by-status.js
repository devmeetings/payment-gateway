'use strict';

var Q = require('q');
var Claims = require('../../models/claims');

module.exports = function (envId, status) {
    var def = Q.defer();
    Claims.find({
        event: envId,
        status: status,
        $or: [
            {'extra.vip': false},
            {'extra.vip': {$exists: false}}
        ]
    }).count(function (err, count) {
        if (err) {
            def.reject();
            return;
        }

        def.resolve(count);
    });

    return def.promise;
};