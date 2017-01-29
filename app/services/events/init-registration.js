'use strict';

var intercept = require('../../utils/intercept');
var Country = require('../../models/country');
var config = require('../../../config/config');

module.exports = function (req, res, next) {
    var lang = req.params.lang || 'pl';
    var helpers = require('./registration-helpers')(req, res, next);

    console.log('------------- INIT REGISTRATION ----------------');

    Country.findOne({
        code: lang.toLowerCase()
    }, intercept(next, function (country) {

        if (!country) {
            lang = 'pl';
        }
        console.log('------------- SET UP LANG ----------------', lang);
        // req.i18n.changeLanguage(lang, prepareClaim);
        req.i18n.changeLanguage(lang, setupRegistrationProcess);

    }));

    function setupRegistrationProcess (err) {
        if (err) {
            return res.send(404);
        }

        req.session.lng = lang;

        helpers.getEventForRegistration(req.params.name)
            .then(helpers.getTicketFromCookie)
            .then(helpers.ifNoCookieCreateTicketForEvent)
            .then(helpers.redirectToRegistrationForm)
            .catch(function () {
                res.send(404);
            });
    }
};
