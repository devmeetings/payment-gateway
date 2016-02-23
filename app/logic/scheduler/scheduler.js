var schedule = require('node-schedule');
var Event = require('../../models/event');
var Claims = require('../../models/claims');

function startScheduler () {
  console.log('Start scheduler');
  schedule.scheduleJob('*/1 * * * *', function () {
    setInvalidTicketsAsExpired();
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
