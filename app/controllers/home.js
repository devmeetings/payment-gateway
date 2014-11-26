var express = require('express'),
  router = express.Router(),
  marked = require('marked'),
  intercept = require('../utils/intercept'),
  Mailer = require('../utils/mailer'),
  Event = require('../models/event'),
  Claims = require('../models/claims');

module.exports = function(app) {
  app.use('/', router);
};


router.get('/', function(req, res, next) {

  Event.find({
    isVisible: true
  }, intercept(next, function(events) {
    res.render('index', {
      title: 'Events',
      events: events.map(function(ev) {
        ev.description = marked(ev.description || "");
        return ev;
      })
    });
  }));

});

router.get('/events/:name', function(req, res, next) {

  Event.findOne({
    name: req.params.name
  }, intercept(next, function(ev) {
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
          $in: [Claims.STATUS.ACTIVE/*, Claims.STATUS.WAITING*/]
        }
      }, {
        $set: {
          status: Claims.STATUS.EXPIRED
        }
      }, {
        multi: true
      },
      intercept(next, function(noOfUpdatedItems) {

        if (noOfUpdatedItems) {
          Event.update({
            _id: ev._id,
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

router.post('/events/:id/tickets/:claim', function(req, res, next) {

  // TODO [ToDr] validate user data

  function sendMailAndRenderResponse(claim) {
    console.log(claim);

    var daysToPay = 3;

    res.render('mails/event-confirmation', {
      claim: claim,
      endDate: new Date(Date.now() + daysToPay * 3600 * 24 * 1000)
    }, intercept(next, function(mailText) {

      Mailer.sendMail({
        from: Mailer.from,
        to: claim.userData.email,
        subject: 'Potwierdzenie rejestracji na DevMeeting Online ' + claim.event.title,
        html: mailText
      }, intercept(next, function(info) {

        res.render('event-ok', {
          claim: claim,
        });

      }));

    }));
  }

  function findClaimById(id, cb) {
    Claims.findById(id).populate('event').exec(intercept(next, cb));
  }

  Claims.update({
    _id: req.params.claim,
    event: req.params.id,
    validTill: {
      $gte: new Date()
    },
    status: Claims.STATUS.ACTIVE
  }, {
    $set: {
      status: Claims.STATUS.WAITING,
      amount: req.body.payment[0] === -1 ? req.body.payment[1] : req.body.payment[0],
      userData: {
        email: req.body.email,
        names: req.body.names
      }
    }
  }).exec(intercept(next, function(isUpdated, claim) {
    if (!isUpdated) {
      return res.send(404);
    }

    findClaimById(req.params.claim, sendMailAndRenderResponse);

  }));
});

router.get('/events/:id/tickets/:claim', function(req, res, next) {

  // TODO [ToDr] Display some meaningful message if status is wrong

  Claims.findOne({
    _id: req.params.claim,
    event: req.params.id,
    status: Claims.STATUS.ACTIVE
  }).populate('event').exec(intercept(next, function(claim) {
    if (!claim) {
      return res.send(404);
    }

    res.render('event-ticket_fill', {
      claim: claim,
      claim_json: JSON.stringify(claim)
    });

  }));

});

router.post('/events/:name/tickets', function(req, res, next) {

  var CLAIM_TIME = 15 * 60 * 1000;

  function createClaim(ev) {

    var now = new Date();
    Claims.create({
      event: ev._id,
      claimedTime: new Date(),
      validTill: new Date(now.getTime() + CLAIM_TIME),
      status: Claims.STATUS.ACTIVE
    }, intercept(next, function(claim) {

      res.redirect('/events/' + ev._id + '/tickets/' + claim._id);

    }));
  }

  function tryToClaimTicket(ev) {
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
    }, intercept(next, function(isUpdated) {
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
  }, intercept(next, function(ev) {
    if (!ev) {
      return res.send(404);
    }
    tryToClaimTicket(ev);
  }));

});
