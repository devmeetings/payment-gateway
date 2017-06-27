var express = require('express');
var router = express.Router();

const eventbriteEvents = require('../utils/eventtbrite-events');

module.exports = function (app) {
    app.use('/', router);
};

router.get('/', function (req, res) {
    res.redirect('/pl');
});

require('../../config/config').languages.map(function (lang) {
    router.get('/' + lang, function (req, res) {

        eventbriteEvents.get(lang, (result) => {
            res.render('info/' + lang + '/index', {
                events: result.events,
                endedEvents: result.endedEvents
            });
        });
    });
});


