var express = require('express');
var config = require('../../config/config');
var router = express.Router();
var moment = require('moment');
var intercept = require('../utils/intercept');
var Mailer = require('../utils/mailer');
var Payu = require('../../config/payu');
var Claims = require('../models/claims');
var checkIfAdmin = require('./admin').checkIfAdmin;

moment.locale('pl');

module.exports = function (app) {
  app.use('/', router);
};

router.post('/tickets/:claim/notify', function (req, res, next) {
  function sendMailWithPaymentConfirmation (claim, cb) {
    res.render('mails/payment-confirmation', {
      claim: claim
    }, intercept(next, function (mailText) {
      Mailer.sendMail({
        from: Mailer.from,
        to: Mailer.bcc,
        subject: 'Potwierdzenie płatności: ' + claim.amount + ' zł',
        html: mailText
      }, intercept(next, cb));
    }));
  }
  var order = req.body.order;
  var claimId = order.extOrderId;
  claimId = claimId.split('_')[0];

  if (order.status === 'COMPLETED') {
    // Update status of claim
    Claims.update({
      _id: claimId,
      'payment.id': order.orderId
    }, {
      $set: {
        status: Claims.STATUS.PAYED
      }
    }).exec(intercept(next, function (isUpdated) {
      if (!isUpdated) {
        console.error("Didn't update completed notification", order);
        res.send(200);
        return;
      }
      // send mail with confirmation
      Claims.findById(claimId).populate('event').exec(intercept(next, function (claim) {
        sendMailWithPaymentConfirmation(claim, function () {
          res.send(200);
        });
      }));
    }));
  } else if (order.status === 'PENDING') {
    // Updating status to pending
    Claims.update({
      _id: claimId,
      'payment.id': order.orderId,
      status: Claims.STATUS.WAITING
    }, {
      $set: {
        status: Claims.STATUS.PENDING
      }
    }).exec(intercept(next, function (isUpdated) {
      res.send(200);
    }));
  } else {
    console.warn('Got ignored notification', order);
    res.send(200);
  }
});

// Regenerate payment - user action
// TODO [ToDr] I think that some more security is necessary here
router.post('/events/:id/tickets/:claim/payment', function (req, res, next) {
  Claims.findOne({
    _id: req.params.claim,
    event: req.params.id
  }).populate('event').exec(intercept(next, function (claim) {
    console.log(claim);
    var num = Math.random() * 100;
    createPaymentForClaim(req, res, next, claim, '_' + num.toFixed(0)[0]);
  }));
});

// Regenerate payment
router.post('/admin/events/:id/tickets/:claim/payment', checkIfAdmin, function (req, res, next) {
  Claims.findOne({
    _id: req.params.claim,
    event: req.params.id
  }).populate('event').exec(intercept(next, function (claim) {
    console.log(claim);
    var num = Math.random() * 100;
    createPaymentForClaim(req, res, next, claim, '_' + num.toFixed(0)[0]);
  }));
});

function extractNames (name) {
  name = name || '';
  var parts = name.split(' ');

  return {
    firstName: parts[0] || '',
    lastName: parts[1] || ''
  };
}

function createPaymentForClaim (req, res, next, claim, postfix) {
  postfix = postfix || '';

  var daysToPay = 3;
  var timeToPayInSeconds = daysToPay * 3600 * 24;

  function sendMailAndRenderResponse (claim) {
    res.render('mails/event-confirmation', {
      claim: claim,
      appUrl: config.app.url,
      endDate: moment(new Date(Date.now() + 1000 * timeToPayInSeconds)).format('LLL'),
      eventDate: moment(claim.event.eventStartDate).format('LLL')
    }, intercept(next, function (mailText) {
      Mailer.sendMail({
        from: Mailer.from,
        to: claim.userData.email,
        bcc: Mailer.bcc,
        subject: 'Potwierdzenie rejestracji na ' + claim.event.title,
        html: mailText
      }, intercept(next, function (info) {
        res.redirect(claim.payment.url);
      }));
    }));
  }

  function updateClaimWithPaymentDetails (claim, orderId, redirectUri) {
    claim.status = Claims.STATUS.WAITING;
    claim.payment = {
      id: orderId,
      url: redirectUri
    };
    claim.save(intercept(next, sendMailAndRenderResponse));
  }

  var names = extractNames(claim.userData.names);

  // Generate payment url
  Payu.createOrderRequest({
    notifyUrl: config.app.url + '/tickets/' + claim._id + '/notify',
    continueUrl: config.app.url + '/events/' + claim.event._id + '/tickets/' + claim._id,
    customerIp: Payu.getIp(req),
    description: 'Opłata za udział w ' + claim.event.title,
    currencyCode: 'PLN',
    validityTime: timeToPayInSeconds,
    extOrderId: claim._id.toString() + postfix
  }, [{
    name: 'Udział w ' + claim.event.title,
    unitPrice: claim.amount * 100,
    quantity: 1
  }], {
    email: claim.userData.email,
    firstName: names.firstName,
    lastName: names.lastName
  }).on('error', function () {
    next("Couldn't generate payment");
  }).end(function (res) {
    if (res.ok || res.status === 302) {
      var orderId = res.body.orderId;
      var url = res.body.redirectUri;

      updateClaimWithPaymentDetails(claim, orderId, url);
    } else {
      next('Error while creating payment: ' + res.text);
    }
  });
}

function findClaimById (id, cb, next) {
  Claims.findById(id).populate('event').exec(intercept(next, cb));
}

router.post('/events/:id/tickets/:claim', function (req, res, next) {
  var paymentAmount = req.body.payment[0] === '-1' ? req.body.payment[1] : req.body.payment;
  if (parseFloat(paymentAmount) < 1) {
    return next('Wrong payment amount');
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
      status: Claims.STATUS.CREATING_PAYMENT,
      amount: paymentAmount,
      userData: {
        email: req.body.email,
        names: req.body.names
      }
    }
  }).exec(intercept(next, function (isUpdated) {
    if (!isUpdated) {
      return res.send(404);
    }

    findClaimById(req.params.claim, function (claim) {
      createPaymentForClaim(req, res, next, claim);
    }, next);
  }));
});
