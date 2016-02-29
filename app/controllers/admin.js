var express = require('express');
var router = express.Router();
var intercept = require('../utils/intercept');
var Event = require('../models/event');
var moment = require('moment');
var Mailer = require('../utils/mailer');
var Claims = require('../models/claims');
var Settings = require('../models/settings');
var InvoiceNo = require('../models/invoiceNo');
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
  Event.find().sort({eventStartDate: 'desc'}).exec(intercept(next, function (events) {
    res.render('admin/events', {
      title: 'Events',
      events: JSON.stringify(events)
    });
  }));
});

function countClaimsByStatus (envId, status) {
  var def = Q.defer();
  Claims.find({event: envId, status: status}).count(function (err, count) {
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
    var mailTitle = 'Szczegóły DevMeetingu ' + event.title;
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
        payedCount: counter[0],
        pendingCount: counter[1] + counter[2],
        sponsor: counter[3],
        vip: counter[4],
        claims: JSON.stringify(claims)
      });
    });
  }));
});

router.post('/claims/get/invoice/:mode/render', function (req, res, next) {
  var invoiceTemplate, data;

  console.log('----------------------  ', req.params.mode);

  if (req.params.mode === 'single') {
    invoiceTemplate = 'invoice/invoice';
    data = req.body;
  } else if (req.params.mode === 'note') {
    invoiceTemplate = 'invoice/correctionOfInvoice';
    data = req.body;
  } else {
    invoiceTemplate = 'invoice/invoices';
    data = JSON.stringify(req.body);
  }
  res.render(invoiceTemplate, {
    data: data
  });
});

function downloadInvoice (req, res, data) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

  var phantom = require('phantom');
  phantom.create(function (ph) {
    ph.createPage(function (page) {
      page.setPaperSize({
        format: 'A4',
        margin: '20px'
      });
      page.cookies = [{
        'name': 'admin',
        'value': 'Devmeetings1'
      }];

      // change zoom factor based on environment,becouse on windows machine zoom factor differs from linux machine
      if (config.env === 'development') {
        page.setZoomFactor(1.3);
      } else {
        page.setZoomFactor(0.75);
      }

      var settings = {
        operation: 'POST',
        encoding: 'utf8',
        headers: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify(data)
      };

      console.log(fullUrl);
      console.log(settings);
      page.open(fullUrl + '/render', settings, function (status) {
        console.log('Page.open = > status = ', status);
        page.evaluate(function (className) {
          return document.querySelector(className).innerText.replace(/\//g, '_');
        }, renderPage, '.invoice-no');

        function renderPage (invoiceNo) {
          var file = 'tmp/invoice_' + invoiceNo + '.pdf';
          page.render(file, function () {
            page.close();
            page = null;

            res.download(file);
          });
        }
      });
    });
  });
}

module.exports.downloadInvoice = downloadInvoice;

router.post('/claims/get/invoice/:mode', function (req, res, next) {
  downloadInvoice(req, res, req.body);
});

function getInvoiceData (claim, order, setting) {
  var def = Q.defer();
  var invoiceNo = '';
  var invoicePrefix = '';

  if (!claim) {
    def.resolve({});
    return def.promise;
  }

  if (claim.invoice.invoiceNo) {
    invoiceNo = claim.invoice.invoiceNo;

    if (setting && setting.value) {
      invoicePrefix = setting.value;

      if (invoiceNo.indexOf(invoicePrefix) < 0) {
        var parts = invoiceNo.split('/');

        if (parts.length === 3) { // no prefix
          invoiceNo = invoicePrefix + invoiceNo;
        } else {
          invoiceNo = invoiceNo.replace(parts[0], invoicePrefix.slice(0, -1));
        }

        updateClaimInvoiceNo(claim._id, invoiceNo);
      }
    }

    def.resolve({
      invoiceNo: invoiceNo,
      deliveryDate: moment(claim.invoice.deliveryDate).format('YYYY-MM-DD'),
      dateOfPayment: moment(claim.invoice.dateOfPayment).format('YYYY-MM-DD'),
      dateOfInvoice: moment(claim.invoice.dateOfInvoice).format('YYYY-MM-DD'),
      amountNet: claim.amountNet,
      amountGross: claim.amountFormat,
      amountDiff: claim.amountDiff,
      amountPayed: claim.amountPayed,
      amountStillToPay: claim.amountStillToPay
    });
    return def.promise;
  }

  if (!order.buyer || !order.buyer.invoice) {
    def.resolve({});
    return def.promise;
  }

  invoiceNo = moment(order.orderCreateDate).format('/M/YYYY');

  var year = moment(order.orderCreateDate).format('YYYY');
  var month = moment(order.orderCreateDate).format('M');
  var conditions = {year: year, month: month};
  var update = {$inc: {no: 1}};
  var options = {upsert: true, new: true};

  InvoiceNo.findOneAndUpdate(conditions, update, options, function (err, updatedInvoiceNo) {
    if (err) {
      def.reject();
      return;
    }

    invoiceNo = updatedInvoiceNo.no + invoiceNo;

    if (setting && setting.value) {
      invoiceNo = setting.value + invoiceNo;
    }

    var deliveryDate = moment(order.orderCreateDate);
    var dateOfPayment = moment(deliveryDate).add(11, 'days');
    var dateOfInvoice = moment().format('YYYY-MM-DD');

    deliveryDate = deliveryDate.format('YYYY-MM-DD');
    dateOfPayment = dateOfPayment.format('YYYY-MM-DD');

    updateClaimInvoiceData(claim._id, invoiceNo, deliveryDate, dateOfPayment, dateOfInvoice);

    def.resolve({
      invoiceNo: invoiceNo,
      deliveryDate: deliveryDate,
      dateOfPayment: dateOfPayment,
      dateOfInvoice: dateOfInvoice,
      amountNet: claim.amountNet,
      amountGross: claim.amountFormat,
      amountDiff: claim.amountDiff,
      amountPayed: claim.amountPayed,
      amountStillToPay: claim.amountStillToPay
    });
  });

  return def.promise;
}

function updateClaimInvoiceNo (id, invoiceNo) {
  Claims.update({_id: id}, {
    $set: {
      'invoice.invoiceNo': invoiceNo
    }
  }).exec();
}

function updateClaimInvoiceData (id, invoiceNo, deliveryDate, dateOfPayment, dateOfInvoice) {
  Claims.update({_id: id}, {
    $set: {
      'invoice.invoiceNo': invoiceNo,
      'invoice.deliveryDate': deliveryDate,
      'invoice.dateOfPayment': dateOfPayment,
      'invoice.dateOfInvoice': dateOfInvoice
    }
  }).exec();
}

function resetInvoiceNo (req, res, next) {
  var conditions = {
    event: req.params.ev,
    'payment.id': {
      $exists: true
    }
  };
  var update = {$set: {'invoice.invoiceNo': null}};
  var options = {multi: true};

  Claims.update(conditions, update, options).exec();

  getInvoices(req, res, next);
}

function setUpInvoicePrefix (req, res, next) {
  var invoicePrefix = req.body.invoicePrefix;

  if (invoicePrefix.slice(-1) !== '/') {
    invoicePrefix += '/';
  }

  var conditions = {key: 'INVOICE_PREFIX'};
  var update = {$set: {value: invoicePrefix}};
  var options = {upsert: true, new: true};

  Settings.findOneAndUpdate(conditions, update, options, function (err, updatedSetting) {
    if (err) {
      return;
    }

    getInvoices(req, res, next);
  });
}

router.post('/events/:ev/invoices', function (req, res, next) {
  if (req.body.hasOwnProperty('reset')) {
    resetInvoiceNo(req, res, next);
  } else if (req.body.hasOwnProperty('prefix')) {
    setUpInvoicePrefix(req, res, next);
  } else {
    getInvoices(req, res, next);
  }
});

router.get('/events/:ev/invoices', function (req, res, next) {
  createDefaultInvoicePrefixIfNotExist().then(function () {
    getInvoices(req, res, next);
  });
});

router.get('/invoices', function (req, res, next) {
  createDefaultInvoicePrefixIfNotExist().then(function () {
    getAllInvoices(req, res, next);
  });
});

function createDefaultInvoicePrefixIfNotExist () {
  var defer = Q.defer();

  Settings.findOne({key: 'INVOICE_PREFIX'}, function (err, setting) {
    if (err) {
      defer.reject();
    }

    if (!setting) {
      Settings.create({key: 'INVOICE_PREFIX', value: 'RDG/'}, function (err) {
        if (err) {
          defer.reject();
        }

        defer.resolve();
      });
    } else {
      defer.resolve();
    }
  });

  return defer.promise;
}

function getAllInvoices (req, res, next) {
  var conditions = {
    $or: [
      {
        'payment.id': {
          $exists: true
        }
      },
      {paidWithoutPayu: true},
      {needInvoice: true}
    ]
  };

  return getInvoices(req, res, next, conditions);
}

module.exports.getDataForExistingInvoice = function getDataForExistingInvoice (claim) {
  var order = {};
  var serviceName = 'Udział w DevMeetingu ' + claim.event.title;
  var buyer = {
    names: claim.userData.names,
    email: claim.userData.email,
    invoice: {
      recipientName: claim.invoice.recipientName,
      street: claim.invoice.street,
      postalCode: claim.invoice.postalCode,
      city: claim.invoice.city,
      countryCode: claim.invoice.countryCode,
      tin: claim.invoice.tin,
      serviceName: serviceName
    }
  };

  order = {
    status: 'COMPLETED',
    paymentMethod: claim.paidWithoutPayu ? 'Przelew' : 'Payu',
    paidWithoutPayu: claim.paidWithoutPayu,
    orderId: claim.payment.id,
    buyer: buyer,
    totalAmount: claim.amount * 100,
    currencyCode: 'PLN',
    orderCreateDate: claim.claimedTime
  };

  order.claim = claim;
  order.serviceName = serviceName;
  return getInvoiceData(claim).then(function (invoiceData) {
    order.invoice = {};

    Object.keys(invoiceData).forEach(function (key) {
      order.invoice[key] = invoiceData[key];
    });

    if (order.paidWithoutPayu) {
      order.payed = '0,00';
      order.stillToPay = '0,00';
    }

    return order;
  });
};

module.exports.createInvoiceForClaim = createInvoiceForClaim;

function createInvoiceForClaim (req, res, next, claimId) {
  var condidtions = {
    _id: claimId,
    status: Claims.STATUS.PAYED
  };

  getInvoices(req, res, next, condidtions);
}

function getInvoices (req, res, next, newConditions) {
  var conditions;
  var defaultConditions = {
    event: req.params.ev,
    status: Claims.STATUS.PAYED,
    $or: [
      {
        'payment.id': {
          $exists: true
        }
      },
      {needInvoice: true}
    ]
  };

  conditions = newConditions || defaultConditions;

  Claims.find(conditions).populate('event').exec(intercept(next, function (claims) {
    Q.all(
      claims.map(function (claim) {
        var def = Q.defer();

        Payu.getOrderInfo(claim.payment.id).on('error', function (err) {
          def.reject(err);
        }).end(function (resp) {
          if (!resp.ok) {
            def.resolve({});

            return;
          }

          var order = resp.body.orders[0];
          var serviceName = 'Udział w DevMeetingu ' + claim.event.title;
          var buyer = {
            names: claim.userData.names,
            email: claim.userData.email,
            invoice: {
              recipientName: claim.invoice.recipientName,
              street: claim.invoice.street,
              postalCode: claim.invoice.postalCode,
              city: claim.invoice.city,
              countryCode: claim.invoice.countryCode,
              tin: claim.invoice.tin,
              serviceName: serviceName
            }
          };
          // if user need invoice but didn't put invoice data on order
          if (claim.needInvoice && (!order.buyer || !order.buyer.invoice)) {
            order.buyer = buyer;
          }

          if (order.buyer && order.buyer.invoice) {
            var conditions = {
              _id: claim._id
            };
            var update = {
              $set: {
                'invoice.recipientName': order.buyer.invoice.recipientName,
                'invoice.street': order.buyer.invoice.street,
                'invoice.postalCode': order.buyer.invoice.postalCode,
                'invoice.city': order.buyer.invoice.city,
                'invoice.tin': order.buyer.invoice.tin
              }
            };
            Claims.update(conditions, update).exec();
          }

          // if user pay withou payu
          if (claim.paidWithoutPayu && order.status !== 'COMPLETED') {
            // create new order
            order = {
              status: order.status,
              paymentMethod: 'Przelew',
              paidWithoutPayu: true,
              orderId: claim.payment.id,
              buyer: buyer,
              totalAmount: claim.amount * 100,
              currencyCode: 'PLN',
              orderCreateDate: claim.claimedTime
            };
          } else {
            order.paymentMethod = 'Payu';
          }

          order.claim = claim;
          order.serviceName = serviceName;
          def.resolve(order);
        });

        return def.promise;
      })
    ).then(function (orders) {
        return Q.all(
          orders.map(function (order) {
            var def = Q.defer();

            Settings.findOne({key: 'INVOICE_PREFIX'}, function (err, setting) {
              if (err) {
                def.resolve({});
                return;
              }
              getInvoiceData(order.claim, order, setting).then(function (invoiceData) {
                order.invoice = invoiceData;

                Object.keys(invoiceData).forEach(function (key) {
                  order.invoice[key] = invoiceData[key];
                });

                if (order.paidWithoutPayu) {
                  order.payed = '0,00';
                  order.stillToPay = '0,00';
                }

                def.resolve(order);
              });
            });

            return def.promise;
          })
        );
      }).then(function (responses) {
        return responses.filter(function (resp) {
          return resp.buyer && resp.buyer.invoice;
        });
      }).done(function (invoices) {
        res.render('admin/invoices', {
          title: 'Invoices for ' + req.params.ev,
          invoices: JSON.stringify(invoices)
        });
      });
  }));
}

router.post('/claims/invoice', function (req, res, next) {
  var conditions = {
    'payment.id': req.body.payment
  };
  var update = {
    $set: {
      'invoice.invoiceNo': req.body.invoiceNo,
      'invoice.deliveryDate': new Date(req.body.deliveryDate),
      'invoice.dateOfPayment': new Date(req.body.dateOfPayment),
      'invoice.dateOfInvoice': new Date(req.body.dateOfInvoice),
      'invoice.recipientName': req.body.recipientName,
      'invoice.street': req.body.street,
      'invoice.postalCode': req.body.postalCode,
      'invoice.city': req.body.city,
      'invoice.tin': req.body.tin
    }
  };
  Claims.update(conditions, update).exec();
  res.send('ok');
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

router.post('/events/:ev/invoice/:claimId', function (req, res, next) {
    Claims.findOneAndUpdate({
      _id: req.params.claimId
    }, {
      $set: {
        needInvoice: true
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
