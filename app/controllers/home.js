var express = require('express');
var router = express.Router();
var marked = require('marked');
var intercept = require('../utils/intercept');
var Event = require('../models/event');
var Claims = require('../models/claims');
var admin = require('../controllers/admin');
// var crypto = require('crypto');

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

    ev.description = marked(ev.description);

    res.render('event', {
      title: ev.title,
      event: JSON.stringify(ev)
    });
  }));
});

router.post('/events/:id/invoice/:claim/render', function (req, res, next) {
  var invoiceTemplate, data;
  invoiceTemplate = 'invoice/invoice';
  data = req.body;

  res.render(invoiceTemplate, {
    data: data
  });
});

router.post('/events/:id/invoice/:claim', function (req, res, next) {
  Claims.findOne({
    _id: req.params.claim,
    event: req.params.id,
    status: Claims.STATUS.PAYED,
    'userData.email': req.body.email
  }).populate('event').exec(intercept(next, function (claim) {
    if (!claim) {
      res.redirect('/events/' + req.params.id + '/tickets/' + req.params.claim);
      return;
    }
    admin.getDataForExistingInvoice(claim).then(function (data) {
      admin.downloadInvoice(req, res, data);
    });
  }));
});

router.get('/events/:id/tickets/:claim', function (req, res, next) {
  // TODO [ToDr] Display some meaningful message if status is wrong
  Claims.findOne({
    _id: req.params.claim,
    event: req.params.id,
    status: {
      $in: [Claims.STATUS.INVITED, Claims.STATUS.ACTIVE, Claims.STATUS.WAITING, Claims.STATUS.CREATING_PAYMENT, Claims.STATUS.PENDING, Claims.STATUS.PAYED]
    }
  }).populate('event').exec(intercept(next, function (claim) {
    if (!claim) {
      return res.send(404);
    }

    if (claim.status === Claims.STATUS.ACTIVE || claim.status === Claims.STATUS.INVITED) {
      res.render('event-ticket_fill', {
        claim: claim,
        claim_json: JSON.stringify(claim)
      });
    } else if (claim.status === Claims.STATUS.PAYED) {
      res.render('event-ok', {
        claim: claim
      });
    } else {
      res.render('event-ticket_inprogress', {
        claim: claim,
        STATUS: Claims.STATUS
      });
    }
  }));
});

router.post('/events/:name/tickets', function (req, res, next) {
  var CLAIM_TIME = 2 * 60 * 1000;

  function createClaim (ev) {
    var now = new Date();
    var validTill = new Date(now.getTime() + CLAIM_TIME);
    Claims.create({
      event: ev._id,
      claimedTime: new Date(),
      validTill: validTill,
      status: Claims.STATUS.ACTIVE
    }, intercept(next, function (claim) {
      res.cookie('claim', ev._id + ':' + claim._id, {expires: validTill});
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

    if (req.cookies.claim) {
      var cookieParts = req.cookies.claim.split(':');
      if (cookieParts.length === 2) {
        Claims.findOne({
          _id: cookieParts[1],
          event: cookieParts[0]
        }).exec(intercept(next, function (claim) {
          if (!claim) {
            tryToClaimTicket(ev);
          } else {
            res.redirect('/events/' + cookieParts[0] + '/tickets/' + cookieParts[1]);
            return;
          }
        }));
      }
    } else {
      tryToClaimTicket(ev);
    }
  }));
});
