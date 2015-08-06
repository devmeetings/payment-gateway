var express = require('express');
var router = express.Router();
var marked = require('marked');
var intercept = require('../utils/intercept');
var Event = require('../models/event');
var Claims = require('../models/claims');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res) {
  res.redirect('/pl');
});

require('../../config/config').languages.map(function (lang) {
  router.get('/' + lang, function (req, res) {
    res.render('info/' + lang + '/index');
  });
});

router.get('/events', function (req, res, next) {
  Event.find({
    isVisible: true
  }, intercept(next, function (events) {
    res.render('events', {
      title: 'Events',
      events: events.map(function (ev) {
        ev.description = marked(ev.description || '');
        return ev;
      })
    });
  }));

});

router.get('/events/:name', function (req, res, next) {
  Event.findOne({
    name: req.params.name
  }, intercept(next, function (ev) {
    if (!ev) {
      return res.send(404);
    }

    // TODO [ToDr] reclaim tickets
    Claims.update({
      event: ev._id,
      validTill: {
        $lt: new Date()
      },
      status: {
        // TODO [ToDr] Dont remove WAITING tickets automatically!
        // $in: [Claims.STATUS.ACTIVE #<{(|, Claims.STATUS.WAITING |)}>#]
        $in: [Claims.STATUS.ACTIVE]
      }
    }, {
      $set: {
        status: Claims.STATUS.EXPIRED
      }
    }, {
      multi: true
    },
      intercept(next, function (noOfUpdatedItems) {
        if (noOfUpdatedItems) {
          Event.update({
            _id: ev._id
          }, {
            $inc: {
              ticketsLeft: noOfUpdatedItems
            }
          }).exec();

          ev.ticketsLeft += noOfUpdatedItems;
        }

        ev.description = marked(ev.description);

        res.render('event', {
          title: ev.title,
          event: JSON.stringify(ev)
        });

      }));
  }));

});

router.get('/events/:id/tickets/:claim', function (req, res, next) {
  // TODO [ToDr] Display some meaningful message if status is wrong
  Claims.findOne({
    _id: req.params.claim,
    event: req.params.id,
    status: {
      $in: [Claims.STATUS.ACTIVE, Claims.STATUS.WAITING, Claims.STATUS.PENDING, Claims.STATUS.PAYED]
    }
  }).populate('event').exec(intercept(next, function (claim) {
    if (!claim) {
      return res.send(404);
    }

    if (claim.status === Claims.STATUS.ACTIVE) {
      res.render('event-ticket_fill', {
        claim: claim,
        claim_json: JSON.stringify(claim)
      });
    } else if (claim.status === Claims.STATUS.WAITING) {
      res.redirect(claim.payment.url);
    } else {
      res.render('event-ok', {
        claim: claim
      });
    }
  }));

});

router.post('/events/:name/tickets', function (req, res, next) {
  var CLAIM_TIME = 15 * 60 * 1000;

  function createClaim (ev) {
    var now = new Date();
    Claims.create({
      event: ev._id,
      claimedTime: new Date(),
      validTill: new Date(now.getTime() + CLAIM_TIME),
      status: Claims.STATUS.ACTIVE
    }, intercept(next, function (claim) {
      res.redirect('/events/' + ev._id + '/tickets/' + claim._id);

    }));
  }

  function tryToClaimTicket (ev) {
    Event.update({
      _id: ev._id,
      openDate: {
        $lte: new Date().toString()
      },
      ticketsLeft: {
        $gt: 0
      }
    }, {
      $inc: {
        ticketsLeft: -1
      }
    }, intercept(next, function (isUpdated) {
      console.log(arguments);

      if (!isUpdated) {
        return res.render('event-ticket_failed', {
          title: ev.title,
          event: ev
        });
      }

      createClaim(ev);
    }));
  }

  Event.findOne({
    name: req.params.name
  }, intercept(next, function (ev) {
    if (!ev) {
      return res.send(404);
    }
    tryToClaimTicket(ev);
  }));
});
