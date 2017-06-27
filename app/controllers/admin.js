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
  //app.use('/admin', router);
};

function checkIfAdmin (req, res, next) {
  console.log('req.cookies', req.cookies);
  if (req.cookies.admin === 'Devmeetings1' || checkIfPhantomJs(req)) {
    next();
  } else {
    res.send(403);
  }
}

function checkIfPhantomJs (req) {
  console.log('req.headers[user-agent] =>', req.headers['user-agent'])
  return req.headers['user-agent'].indexOf('PhantomJS') >= 0;
}

module.exports.checkIfAdmin = checkIfAdmin;

router.use(checkIfAdmin);

router.get('/', function (req, res) {
  res.redirect('/admin/events');
});


router.get('/events', function (req, res, next) {
  Event.find().sort({eventStartDate: 'desc'}).exec(intercept(next, function (events) {
    res.render('admin/events', {
      title: 'Events',
      events: JSON.stringify(events)
    });
  }));
});

function countClaimsByStatus (envId, status) {
  var def = Q.defer();
  Claims.find({
    event: envId,
    status: status,
    $or: [
      {'extra.vip': false},
      {'extra.vip': {$exists: false}}
    ],
    $or: [
      {'extra.sponsor': false},
      {'extra.sponsor': {$exists: false}}
    ]
  })
      .count(function (err, count) {
    if (err) {
      def.reject();
      return;
    }

    def.resolve(count);
  });

  return def.promise;
}

function countClaimsForVIP (envId) {
  var def = Q.defer();
  Claims.find({event: envId, 'extra.vip': true}).count(function (err, count) {
    if (err) {
      def.reject();
      return;
    }

    def.resolve(count);
  });

  return def.promise;
}

function countClaimsForSponsor (envId) {
  var def = Q.defer();
  Claims.find({event: envId, 'extra.sponsor': true}).count(function (err, count) {
    if (err) {
      def.reject();
      return;
    }

    def.resolve(count);
  });

  return def.promise;
}

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
      'mail.partner': req.body.partner,
      'mail.city': req.body.mail_city,
      'mail.preparation': req.body.preparation,
      'mail.contact': req.body.contact,
      substantiveContent: req.body.substantiveContent
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
  renderDiploma(req, res, next);
});

router.get('/events/:ev/:user/diploma/render', function (req, res, next) {
  renderDiploma(req, res, next);
});

function renderDiploma (req, res, next) {
  var condidtions = {
    event: req.params.ev,
    $or: [
      {
        status: Claims.STATUS.PAYED,
        amount: {
          $gte: 100
        }
      },
      {
        'extra.sponsor': true
      },
      {
        'extra.vip': true
      }
    ]

  };

  if (req.params.user) {
    condidtions = {'_id': req.params.user};
  }

  Claims.find(condidtions).populate('event').exec(intercept(next, function (users) {
    var eventStartDate = moment(users[0].event.eventStartDate).format('LL');
    res.render('diploma/diploma', {
      eventStartDate: eventStartDate,
      users: JSON.stringify(users)
    });
  }));
}

router.post('/events/:ev/users/diploma', function (req, res, next) {
  generateDiploma(req, res);
});

router.post('/events/:ev/:user/diploma', function (req, res, next) {
  generateDiploma(req, res);
});

function generateDiploma (req, res) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

  var phantom = require('phantom');
  phantom.create(function (ph) {
    ph.createPage(function (page) {
      page.setPaperSize({
        format: 'A4',
        orientation: 'landscape'
      });

      page.cookies = [{
        'name': 'admin',
        'value': 'Devmeetings1'
      }];

      // change zoom factor based on environment,becouse on windows machine zoom factor differs from linux machine
      if (config.env === 'development') {
        page.setZoomFactor(1.3);
      } else {
        page.setZoomFactor(1);
      }

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
}


router.get('/events/:ev/users', function (req, res, next) {
  getEvent(req.params.ev).then(function (event) {
    Claims.find({
      event: req.params.ev,
      $or: [
        {status: Claims.STATUS.PAYED},
        {'extra.vip': true},
        {'extra.sponsor': true}
      ]
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

router.get('/events/claims', function (req, res, next) {
  Claims.find({
    $or: [
      {status: Claims.STATUS.PAYED},
      {'extra.vip': true},
      {'extra.sponsor': true}
    ]
  }).populate('event').sort({'invoice.invoiceNo': 'desc'}).exec(intercept(next, function (claims) {
    res.render('admin/all_claims', {
      claims: JSON.stringify(claims)
    });
  }));
});

router.get('/events/:ev/claims', function (req, res, next) {
  var event = {};

  Claims.find({
    event: req.params.ev
  }).populate('event').sort({claimedTime: 'desc'}).exec(intercept(next, function (claims) {
    if (claims.length > 0) {
      event = claims[0].event;
    }

    Q.all([
      countClaimsByStatus(req.params.ev, Claims.STATUS.PAYED),
      countClaimsByStatus(req.params.ev, Claims.STATUS.PENDING),
      countClaimsByStatus(req.params.ev, Claims.STATUS.OFFLINE_PENDING),
      countClaimsForSponsor(req.params.ev),
      countClaimsForVIP(req.params.ev)
    ]).then(function (counter) {
      res.render('admin/claims', {
        title: 'Claims for ' + req.params.ev,
        event: event,
        eventId: req.params.ev,
        allTickets:  counter[0] + counter[4] + counter[3],
        payedCount: counter[0],
        pendingCount: counter[1] + counter[2],
        sponsor: counter[3],
        vip: counter[4],
        claims: JSON.stringify(claims)
      });
    });
  }));
});


router.post('/events/:ev/payed/:claimId', function (req, res, next) {
    Claims.findOneAndUpdate({
      _id: req.params.claimId
    }, {
      $set: {
        status: Claims.STATUS.PAYED,
        paidWithoutPayu: true
      }
    }).exec(intercept(next, function () {
      res.send('ok');
    }));
  }
);

router.post('/events/:ev/vip/:claimId', function (req, res, next) {
    Claims.findOneAndUpdate({
      _id: req.params.claimId
    }, {
      $set: {
        'extra.vip': true
      }
    }).exec(intercept(next, function () {
      res.send('ok');
    }));
  }
);

router.post('/events/:ev/sponsor/:claimId', function (req, res, next) {
    Claims.findOneAndUpdate({
      _id: req.params.claimId
    }, {
      $set: {
        'extra.sponsor': true
      }
    }).exec(intercept(next, function () {
      res.send('ok');
    }));
  }
);

router.post('/events/:ev/cancel/:claimId', function (req, res, next) {
    Claims.remove({
      _id: req.params.claimId
    }).exec(intercept(next, function () {
      Event.update({
        _id: req.params.ev
      }, {
        $inc: {
          ticketsLeft: 1
        }
      }).exec();

      res.send('ok');
    }));
  }
);

router.post('/events/:ev/offline/:claimId', function (req, res, next) {
    Claims.findOneAndUpdate({
      _id: req.params.claimId
    }, {
      $set: {
        status: Claims.STATUS.OFFLINE_PENDING
      }
    }).exec(intercept(next, function () {
      res.send('ok');
    }));
  }
);

router.post('/events/:ev/add/claim/offline', function (req, res, next) {
  var CLAIM_TIME = 15 * 60 * 1000;

  var now = new Date();
  var claim = req.body;

  var invoice = {
    recipientName: claim.invoice.recipientName,
    street: claim.invoice.street,
    postalCode: claim.invoice.postalCode,
    city: claim.invoice.city,
    tin: claim.invoice.tin
  };

  var newClaim = {
    event: req.params.ev,
    claimedTime: new Date(),
    validTill: new Date(now.getTime() + CLAIM_TIME),
    status: claim.status,
    extra: {
      vip: claim.extra.vip,
      sponsor: claim.extra.sponsor
    },
    userData: {
      email: claim.user.email,
      names: claim.user.names
    }
  };

  if (claim.userNeedInvoice) {
    newClaim.invoice = invoice;
  }

  Claims.create(newClaim, intercept(next, function (claim) {
    res.send('ok');
  }));
});



router.post('/events/:ev/invitation', function (req, res, next) {

    var CLAIM_TIME = 48 * 60 * 60 * 1000;

    function createClaim (ev) {
        var now = new Date();
        var validTill = new Date(now.getTime() + CLAIM_TIME);
        Claims.create({
            event: ev._id,
            claimedTime: new Date(),
            validTill: validTill,
            status: Claims.STATUS.INVITED,
            userData: {
                email: req.body.email
            }
        }, intercept(next, function (claim) {

            res.render('mails/registration-invitation', {
                claim: claim,
                event:ev,
                appUrl: config.app.url,
                eventDate: moment(ev.eventStartDate).format('LLL'),
                endDate: moment(new Date(Date.now() + CLAIM_TIME)).format('LLL'),
            }, intercept(next, function (mailText) {
                Mailer.sendMail({
                    from: Mailer.from,
                    to: req.body.email,
                    bcc: Mailer.bcc,
                    subject: 'Możliwość rejestracji na ' + ev.title,
                    html: mailText
                }, intercept(next, function (info) {
                    res.send(200);
                }));
            }));

        }));
    }

    Event.findOne({
        _id: req.params.ev
    }, intercept(next, function (ev) {
        if (!ev) {
            return res.send(404);
        }

        createClaim(ev);
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
