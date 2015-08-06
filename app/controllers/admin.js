var express = require('express');
var router = express.Router();
var intercept = require('../utils/intercept');
var Event = require('../models/event');
var moment = require('moment');
var Mailer = require('../utils/mailer');
var Claims = require('../models/claims');
var Q = require('q');
var Payu = require('../../config/payu');
var config = require('../../config/config');

module.exports = function (app) {
  app.use('/admin', router);
};

function checkIfAdmin (req, res, next) {

  if (req.cookies.admin === 'Devmeetings1' || checkIfPhantomJs(req)) {
    next();
  } else {
    res.send(403);
  }
}

function checkIfPhantomJs (req) {
  return req.headers['user-agent'].indexOf('PhantomJS') >= 0;
}

module.exports.checkIfAdmin = checkIfAdmin;

router.use(checkIfAdmin);

router.get('/', function (req, res) {
  res.redirect('/admin/events');
});

router.get('/events', function (req, res, next) {
  Event.find(intercept(next, function (events) {
    res.render('admin/events', {
      title: 'Events',
      events: JSON.stringify(events)
    });
  }));
});

function getEvent (eventId) {
  var def = Q.defer();

  Event.findOne({
    _id: eventId
  }).exec(function (err, event) {
    if (err) {
      def.reject();
    } else {
      def.resolve(event);
    }
  });

  return def.promise;
}

router.post('/events/:ev', function (req, res, next) {
  Event.update({
    _id: req.params.ev
  }, {
    $set: {
      title: req.body.title,
      isVisible: req.body.isVisible,
      city: req.body.city,
      openDate: req.body.openDate,
      eventStartDate: req.body.eventStartDate,
      eventEndDate: req.body.eventEndDate,
      description: req.body.description,
      'mail.location': req.body.location,
      'mail.partner': req.body.partner
    }
  }, intercept(next, function (isUpdated) {
    res.redirect('/admin/events');
  }));
});

router.post('/events/:ev/tickets', function (req, res, next) {
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
  }, intercept(next, function (isUpdated) {
    if (!isUpdated) {
      res.send(404);
      return;
    }
    res.redirect('/admin/events');

  }));

});

router.get('/events/:ev/users/diploma/render', function (req, res, next) {
 // if (!checkIfPhantomJs(req)){
 //   res.redirect('/admin/events');
 //   return;
 // }

  Claims.find({
    event: req.params.ev,
    status: Claims.STATUS.PAYED,
    amount: {
      $gte: 100
    }
  }).populate('event').exec(intercept(next, function (users) {
    res.render('diploma/diploma', {
      users: JSON.stringify(users)
    });
  }));

});

router.post('/events/:ev/users/diploma', function (req, res, next) {

  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

  var phantom = require('phantom');
  phantom.create(function (ph) {
      ph.createPage(function (page) {
        page.cookies = [{
          'name': 'admin',
          'value': 'Devmeetings1'
        }];
        page.open(fullUrl + '/render', function (status) {
          var file = 'diploma.pdf';
          page.render(file, function () {
            page.close();
            page = null;

            res.download('diploma.pdf');
          });
        });
      });
    });

});

router.post('/events/:ev/users/notify', function (req, res, next) {

  function sendMailToUser (mailText, userTo, title) {
    var def = Q.defer();
    Mailer.sendMail({
        from: Mailer.from,
        to: userTo,
        subject: title,
        html: mailText
      }, intercept(next, function () {
        def.resolve();
      }));

    return def.promise;
  }

  Claims.find({
      event: req.params.ev,
      status: Claims.STATUS.PAYED
    }).populate('event').exec(intercept(next, function (claims) {

      var isTestEmail = req.body.test;
      var event = claims[0].event;
      var mailTitle = 'Szczegóły DevMeetingu "ECMAScript 6" w Warszawie';
      var eventDaysWeek = [
        'w najbliższą niedzielę',
        'w najbliższy poniedziałek',
        'w najbliższy wtorek',
        'w najbliższą środę',
        'w najbliższy czwartek',
        'w najbliższy piątek',
        'w najbliższą sobotę'
      ];
      var verificationEmails = [];

      res.render('mails/event-location', {
        eventDay: eventDaysWeek[moment(event.eventStartDate).day()],
        startDate: moment(event.eventStartDate).format('DD. MMMM, [start] o H:mm'),
        regDate: moment(event.eventStartDate).subtract(15, 'm').format('H:mm'),
        endDate: moment(event.eventEndDate).format('H:mm'),
        event: event
      }, intercept(next, function (mailText) {
        if (isTestEmail) {
          sendMailToUser(mailText, 'lukaszewczak@gmail.com', mailTitle + ' - TEST').then(function () {
            res.send(200);
          });
        } else {
          verificationEmails.push(sendMailToUser(mailText, 'lukaszewczak@gmail.com', mailTitle));

          if (config.env === 'production') {
            verificationEmails.push(sendMailToUser(mailText, Mailer.bcc, mailTitle));
          }

          Q.all(
              claims.map(function (claim) {
                return sendMailToUser(mailText, claim.userData.email, mailTitle);
              }).concat(verificationEmails)
          ).then(function () {
                res.send(200);
              });
        }
      }));
    }));
});

router.get('/events/:ev/users', function (req, res, next) {
  getEvent(req.params.ev).then(function (event) {
    Claims.find({
      event: req.params.ev,
      status: Claims.STATUS.PAYED
    }).exec(intercept(next, function (users) {
      res.render('admin/users', {
        event: event,
        title: 'Users for ' + req.params.ev,
        eventId: req.params.ev,
        users: JSON.stringify(users)
      });
    }));
  });

});

router.get('/events/:ev/claims', function (req, res, next) {
  Claims.find({
    event: req.params.ev
  }).exec(intercept(next, function (claims) {
    res.render('admin/claims', {
      title: 'Claims for ' + req.params.ev,
      eventId: req.params.ev,
      claims: JSON.stringify(claims)
    });
  }));
});

router.get('/events/:ev/invoices', function (req, res, next) {
  Claims.find({
    event: req.params.ev,
    'payment.id': {
      $exists: true
    }
  }).exec(intercept(next, function (claims) {
    Q.all(
      claims.map(function (claim) {
        var def = Q.defer();

        Payu.getOrderInfo(claim.payment.id).on('error', function (err) {
          def.reject(err);
        }).end(function (resp) {
          if (!resp.ok) {
            def.reject(resp.body);
            return;
          }

          def.resolve(resp.body);
        });
        return def.promise;
      })

    ).then(function (responses) {
      return responses.map(function (resp) {
        return resp.orders[0];
      }).filter(function (resp) {
        return resp.buyer && resp.buyer.invoice;
      });

    }).done(function (invoices) {
      res.render('admin/invoices', {
        title: 'Invoices for ' + req.params.ev,
        invoices: JSON.stringify(invoices)
      });

    });
  }));

});

router.get('/claims/:claimId/payment', function (req, res, next) {
  Claims.findOne({
    _id: req.params.claimId,
    'payment.id': {
      $exists: true
    }
  }).exec(intercept(next, function (claim) {
    if (!claim) {
      res.send(404);
      return;
    }

    Payu.getOrderInfo(claim.payment.id).on('error', function () {
      next("Couldn't fetch payment info for:" + claim.payment.id);
    }).end(function (resp) {
      if (!resp.ok) {
        console.error(resp);
        next('OrderInfo unexpected status: ' + resp.status);
        return;
      }

      res.render('admin/payment', {
        title: 'Payment for ' + req.params.claimId,
        claim: claim,
        payment: JSON.stringify(resp.body, null, 2)
      });

    });
  }));

});
