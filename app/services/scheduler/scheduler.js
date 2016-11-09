var schedule = require('node-schedule');
var Event = require('../../models/event');
var Claims = require('../../models/claims');
var mailSender = require('../../services/mail/event-mail-sender');
var claimDates = require('../../utils/claim-dates');
var config = require('../../../config/config');

function startScheduler (app) {
  console.log('Start scheduler');
  schedule.scheduleJob('*/1 * * * *', function () {
    console.log('Scheduler step');
    setInvalidTicketsAsExpired();
  });

  schedule.scheduleJob('*/5 * * * *', function () {
    console.log('Scheduler step waiting for 24h');
    sendReminderForWaitingStatus(app);
  });

  schedule.scheduleJob('*/3 * * * *', function () {
    console.log('Scheduler step close waiting');
    closeWaiting(app);
  });
}

function closeWaiting (app) {
  Claims.find({
    validTill: {
      $lt: new Date()
    },
    status: {
      $in: [Claims.STATUS.WAITING]
    }
  }).populate('event').exec(function (err, claims) {
    if (err) {
      return;
    }
    claims.forEach(function (claim) {
      Claims.update(
          {
            _id: claim._id
          }, {
            $set: {
              status: Claims.STATUS.EXPIRED
            }
          }, {
            multi: true
          },
          function (err, noOfUpdatedItems) {
            if (err) {
              return;
            }

            if (noOfUpdatedItems) {

              var options = {
                claim:claim,
                res: res,
                next: next,
                lng: req.session.lng,
              };

              mailSender.sendPaymentCancelMail(options);

              Event.update({
                _id: claim.event._id
              }, {
                $inc: {
                  ticketsLeft: noOfUpdatedItems.nModified
                }
              }).exec();

            }
          }
      );
    });
  });
}


function sendReminderForWaitingStatus(app) {
  var oneDayBackDate = new Date(new Date().setDate(new Date().getDate() - 1 ));
  Claims.find({
    claimedTime: {
      $lt: oneDayBackDate
    },
    $or: [
      {reminderSend: false},
      {reminderSend: {$exists: false}}
    ],

    status: {
      $in: [Claims.STATUS.WAITING]
    }
  }).populate('event').exec(function (err, claims) {

    if (err) {
      return;
    }
    claims.forEach(function (claim) {

      var options = {
        claim:claim,
        res: res,
        next: next,
        lng: req.session.lng,
      };

      mailSender.sendPaymentReminderMail(options);

      //var dates = claimDates(claim);

      // app.render('mails/payment-reminder', {
      //   claim: claim,
      //   appUrl: config.app.url,
      //   endDate: dates.endDate.format('LLL'),
      //   eventDate: dates.eventDate.format('LLL')
      // }, function (err, mailText){
      //   Mailer.sendMail({
      //     from: Mailer.from,
      //     to: claim.userData.email,
      //     subject: 'Przypomnienie o rezerwacji',
      //     html: mailText
      //   });
      // });



      Claims.update({
        _id: claim._id
      }, {
        $set: {
          reminderSend: true
        }
      }).exec();
    });



  });
}

function setInvalidTicketsAsExpired () {
  // TODO [ToDr] reclaim tickets
  Claims.find({
    validTill: {
      $lt: new Date()
    },
    status: {
      // TODO [ToDr] Dont remove WAITING tickets automatically!
      // $in: [Claims.STATUS.ACTIVE #<{(|, Claims.STATUS.WAITING |)}>#]
      $in: [Claims.STATUS.ACTIVE, Claims.STATUS.INVITED]
    }
  }).populate('event').exec(function (err, claims) {
    if (err) {
      return;
    }
    claims.forEach(function (claim) {
      Claims.update(
        {
          _id: claim._id
        }, {
          $set: {
            status: Claims.STATUS.EXPIRED
          }
        }, {
          multi: true
        },
        function (err, noOfUpdatedItems) {
          if (err) {
            return;
          }

          if (noOfUpdatedItems) {
            Event.update({
              _id: claim.event._id
            }, {
              $inc: {
                ticketsLeft: noOfUpdatedItems.nModified
              }
            }).exec();
          }
        }
      );
    });
  });
}

module.exports.startScheduler = startScheduler;
