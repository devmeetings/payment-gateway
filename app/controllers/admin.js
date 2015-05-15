var express = require('express'),
  router = express.Router(),
  intercept = require('../utils/intercept'),
  Event = require('../models/event'),
  Claims = require('../models/claims'),
  Q = require('q'),
  Payu = require('../../config/payu');

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
  Event.find(intercept(next, function(events) {
    res.render('admin/events', {
      title: 'Events',
      events: JSON.stringify(events)
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
      city: req.body.city,
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
      eventId: req.params.ev,
      claims: JSON.stringify(claims)
    });
  }));
});

router.get('/events/:ev/invoices', function(req, res, next) {
  Claims.find({
    event: req.params.ev,
    'payment.id': {
      $exists: true
    }
  }).exec(intercept(next, function(claims) {

    Q.all(
      claims.map(function(claim) {
        var def = Q.defer();

        Payu.getOrderInfo(claim.payment.id).on('error', function(err) {
          def.reject(err);
        }).end(function(resp) {
          if (!resp.ok) {
            def.reject(resp.body);
            return;
          }

          def.resolve(resp.body);
        });
        return def.promise;
      })

    ).then(function(responses) {
      
      return responses.map(function(resp){
        return resp.orders[0];
      }).filter(function(resp) {
        return resp.buyer && resp.buyer.invoice;
      });

    }).done(function(invoices) {

      res.render('admin/invoices', {
        title: 'Invoices for ' + req.params.ev,
        invoices: JSON.stringify(invoices)
      });

    });
  }));

});

router.get('/claims/:claimId/payment', function(req, res, next) {
  Claims.findOne({
    _id: req.params.claimId,
    'payment.id': {
      $exists: true
    }
  }).exec(intercept(next, function(claim) {

    if (!claim) {
      res.send(404);
      return;
    }

    Payu.getOrderInfo(claim.payment.id).on('error', function() {
      next('Couldn\'t fetch payment info for:' + claim.payment.id);
    }).end(function(resp) {
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
