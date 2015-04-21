var express = require('express'),
  router = express.Router(),
  intercept = require('../utils/intercept'),
  Event = require('../models/event'),
  Claims = require('../models/claims');

module.exports = function(app) {
  app.use('/admin', router);
};

function checkIfAdmin(req, res, next) {
  if (req.cookies.admin === 'Devmeetings1') {
    next();
  } else {
    res.send(403);
  }
}
module.exports.checkIfAdmin = checkIfAdmin;

router.use(checkIfAdmin);


router.get('/', function(req, res) {
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

router.post('/events/:ev', function(req, res, next) {
  Event.update({
    _id: req.params.ev
  }, {
    $set: {
      title: req.body.title,
      isVisible: req.body.isVisible,
      openDate: req.body.openDate,
      eventStartDate: req.body.eventStartDate,
      eventEndDate: req.body.eventEndDate,
      description: req.body.description
    }
  }, intercept(next, function(isUpdated) {
    res.redirect('/admin/events');
  }));
});

router.post('/events/:ev/tickets', function(req, res, next) {
  var value = parseInt(req.body.amount, 10);

  if (!(value > 0 && value < 100)) {
    res.send('Invalid value: ' + value);
    return;
  }

  Event.update({
    _id: req.params.ev
  }, {
    $inc: {
      ticketsLeft: value,
      tickets: value
    }
  }, intercept(next, function(isUpdated) {

    if (!isUpdated) {
      res.send(404);
      return;
    }
    res.redirect('/admin/events');

  }));

});

router.get('/events/:ev/claims', function(req, res, next) {
  Claims.find({
    event: req.params.ev
  }).exec(intercept(next, function(claims) {
    res.render('admin/claims', {
      title: 'Claims for ' + req.params.ev,
      claims: JSON.stringify(claims)
    });
  }));
});
