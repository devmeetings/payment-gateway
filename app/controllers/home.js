var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    Event = require('../models/event');

module.exports = function(app) {
    app.use('/', router);
};


function intercept(next, func) {
    return function(/*args*/) {
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

router.get('/events/:name', function(req, res, next){

    Event.findOne({
        name: req.params.name
    }, intercept(next, function(ev) {
        if (!ev) {
            res.send(404);
        } else {
            res.render('event', {
                title: ev.title,
                event: JSON.stringify(ev)
            });
        }
    }));
});