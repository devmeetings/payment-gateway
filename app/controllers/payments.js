var express = require('express'),
  config = require('../../config/config'),
  router = express.Router(),
  moment = require('moment'),
  intercept = require('../utils/intercept'),
  Mailer = require('../utils/mailer'),
  Payu = require('../../config/payu'),
  Claims = require('../models/claims');


moment.locale('pl');

module.exports = function(app) {
  app.use('/', router);
};


router.post('/tickets/:claim/notify', function(req, res, next) {

  function sendMailWithPaymentConfirmation(claim, cb) {
    res.render('mails/payment-confirmation', {
      claim: claim
    }, intercept(next, function(mailText) {

      Mailer.sendMail({
        from: Mailer.from,
        to: Mailer.bcc,
        subject: 'Potwierdzenie płatności: ' + claim.amount + ' zł',
        html: mailText
      }, intercept(next, cb));

    }));
  }

  var order = req.body.order;
  if (order.status === 'COMPLETED') {
    // Update status of claim
    Claims.update({
      _id: order.extOrderId,
      "payment.id": order.orderId
    }, {
      $set: {
        status: Claims.STATUS.PAYED
      }
    }).exec(intercept(next, function(isUpdated) {
      if (!isUpdated) {
        console.error("Didn't update completed notification", order);
        res.send(200);
        return;
      }
      // send mail with confirmation
      Claims.findById(order.extOrderId).populate('event').exec(intercept(next, function(claim) {
        sendMailWithPaymentConfirmation(claim, function() {
          res.send(200);
        });
      }));
    }));

  } else if (order.status === 'PENDING') {
    // Updating status to pending
    Claims.update({
      _id: order.extOrderId,
      "payment.id": order.orderId,
      status: Claims.STATUS.WAITING
    }, {
      $set: {
        status: Claims.STATUS.PENDING
      }
    }).exec(intercept(next, function(isUpdated) {
      res.send(200);
    }));
  } else {
    console.warn("Got ignored notification", order);
    res.send(200);
  }
});


router.post('/events/:id/tickets/:claim', function(req, res, next) {

  var paymentAmount = req.body.payment[0] === "-1" ? req.body.payment[1] : req.body.payment;
  if (parseFloat(paymentAmount) < 1) {
    return next('Wrong payment amount');
  }

  function sendMailAndRenderResponse(claim) {

    var daysToPay = 3;

    res.render('mails/event-confirmation', {
      claim: claim,
      endDate: moment(new Date(Date.now() + daysToPay * 3600 * 24 * 1000)).format('LLL'),
      eventDate: moment(claim.event.eventStartDate).format('LLL')
    }, intercept(next, function(mailText) {

      Mailer.sendMail({
        from: Mailer.from,
        to: claim.userData.email,
        bcc: Mailer.bcc,
        subject: 'Potwierdzenie rejestracji na DevMeeting ' + claim.event.title,
        html: mailText
      }, intercept(next, function(info) {

        res.redirect(claim.payment.url);

      }));

    }));
  }

  function updateClaimWithPaymentDetails(claim, orderId, redirectUri) {
    claim.status = Claims.STATUS.WAITING;
    claim.payment = {
      id: orderId,
      url: redirectUri
    };
    claim.save(intercept(next, sendMailAndRenderResponse));
  }

  function findClaimById(id, cb) {
    Claims.findById(id).populate('event').exec(intercept(next, cb));
  }

  function extractNames(name) {
    name = name || "";
    var parts = name.split(' ');

    return {
      firstName: parts[0] || "",
      lastName: parts[1] || ""
    };
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
  }).exec(intercept(next, function(isUpdated) {
    if (!isUpdated) {
      return res.send(404);
    }

    findClaimById(req.params.claim, function(claim) {

      var names = extractNames(claim.userData.names);

      // Generate payment url
      Payu.createOrderRequest({
        notifyUrl: config.app.url + '/tickets/' + claim._id + '/notify',
        continueUrl: config.app.url + '/events/' + claim.event._id + '/tickets/' + claim._id,
        customerIp: Payu.getIp(req),
        description: 'Opłata za udział w Devmeetingu ' + claim.event.title,
        currencyCode: 'PLN',
        extOrderId: claim._id.toString()
      }, [{
        name: 'Udział w Devmetingu ' + claim.event.title,
        unitPrice: claim.amount * 100,
        quantity: 1
      }], {
        email: claim.userData.email,
        firstName: names.firstName,
        lastName: names.lastName
      }).on('error', function() {
        next("Couldn't generate payment");
      }).end(function(res) {
        if (res.ok || res.status === 302) {
          var orderId = res.body.orderId;
          var url = res.body.redirectUri;

          updateClaimWithPaymentDetails(claim, orderId, url);
        } else {
          next("Error while creating payment: " + res.text);
        }
      });
    });
  }));
});
