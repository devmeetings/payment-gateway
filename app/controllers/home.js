var express = require('express');
var router = express.Router();
var marked = require('marked');
var intercept = require('../utils/intercept');
var Event = require('../models/event');
var Claims = require('../models/claims');
var invoiceApi = require('../controllers/invoice').api;
var ticketTranslations = require('../utils/ticket_translations');
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

   // ev.description = marked(ev.description);

    res.render('event', {
      title: ev.title,
      canRegisterByForm: ev.canRegisterByForm,
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
    invoiceApi.getDataForExistingInvoice(claim).then(function (data) {
      invoiceApi.downloadInvoice(req, res, data);
    });
  }));
});

router.get('/events/:id/tickets/:claim', function (req, res, next) {
   res.redirect('/events/' + req.params.id + '/tickets/' + req.params.claim + '/pl');
});

router.get('/events/:id/tickets/:claim/:lang', function (req, res, next) {
  // TODO [ToDr] Display some meaningful message if status is wrong
  req.i18n.changeLanguage(req.params.lang, setUpClaim);

  function setUpClaim(err){
    if (err) {
      return  res.redirect('/events/' + req.params.id + '/tickets/' + req.params.claim + '/pl');
    }
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
        var claimForClient = {
          validTill: claim.validTill,
          event: {
            eventStartDate: claim.event.eventStartDate,
            eventEndDate: claim.event.eventEndDate,
            title: claim.event.title
          }
        };

        res.render('event-ticket_fill', {
          lang: req.params.lang,
          claim: claim,
          translation : JSON.stringify(ticketTranslations(req.t)),
          claim_json: JSON.stringify(claimForClient)
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
  }
});

router.post('/events/:name/tickets/:lang?', function (req, res, next) {
  var CLAIM_TIME = 2 * 60 * 1000;
  var lang = req.params.lang || 'pl';

  function createClaim (ev) {
    var now = new Date();
    var validTill = new Date(now.getTime() + CLAIM_TIME);
      Event.findOne({
          _id: ev._id
      }).populate('country').exec(intercept(next, function (event) {
          if (!event) {
              return res.send(404);
          }
          Claims.create({
              event: ev._id,
              vatRate: event.country ? event.country.vatRate : 23,
              claimedTime: new Date(),
              validTill: validTill,
              status: Claims.STATUS.ACTIVE
          }, intercept(next, function (claim) {
              res.cookie('claim', ev._id + ':' + claim._id, {expires: validTill});
              res.redirect('/events/' + ev._id + '/tickets/' + claim._id + '/' + lang);
          }));
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
    if (!ev.canRegisterByForm) {
      return res.send(404);
    }

    if (req.cookies.claim) {
      var cookieParts = req.cookies.claim.split(':');
      if (cookieParts.length === 2) {
        Claims.findOne({
          _id: cookieParts[1],
          event: cookieParts[0],
          status: Claims.STATUS.ACTIVE
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
