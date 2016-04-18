var moment = require('moment');

module.exports = function (claim) {

    var daysToPay = 2;
    var timeToPayInSeconds = daysToPay * 3600 * 24;

    var eventDate = moment(claim.event.eventStartDate);
    var endDate;

    if (claim.status === 'creatingPayment') {

        endDate = moment(new Date(Date.now() + 1000 * timeToPayInSeconds));

        //polnoc z czwartku na piatek to ostatni moment na dokonanie oplaty po tym czasie rezerwacja jest kasowana
        var lastDateToPay = eventDate.clone().subtract(1, 'days').hour(0).minute(0).second(0);
        if (lastDateToPay.isBefore(endDate)) {
            endDate = lastDateToPay;
        }
    }
    else {
        endDate = moment(claim.validTill);
    }



    return {
      endDate: endDate,
      eventDate: eventDate,
      timeToPayInSeconds: timeToPayInSeconds
    };

}
