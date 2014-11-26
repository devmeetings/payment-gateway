var express = require('express'),
    router = express.Router(),
    intercept = require('../utils/intercept'),
    Event = require('../models/event'),
    Claims = require('../models/claims');

module.exports = function(app) {
  app.use('/admin', router);
};

router.use(function(req, res, next) {
  if (req.cookies.admin === 'Devmeetings1') {
    next();
  } else {
    res.send(403);
  }
});


router.get('/', function(req, res){
  res.redirect('/admin/events');
});

router.get('/events', function(req, res, next) {
  console.log("Events?");

  Event.find(intercept(next, function(events) {
    res.render('admin/events', {
      title: 'Events',
      events: events
    });
  }));
});

router.get('/events/:ev/claims', function(req, res, next){
  Claims.find({
    event: req.params.ev
  }).populate('event').exec(intercept(next, function(claims) {
    res.render('admin/claims', {
      title: 'Claims for ' + req.params.ev,
      claims: claims
    });
  }));
});
