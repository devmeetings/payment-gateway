// Example model

var mongoose = require('mongoose');
var moment = require('moment');
var Schema = mongoose.Schema;

var EventSchema = new Schema({
  name: {
    type: String,
    unique: true,
    index: true
  },
  city: String,
  isVisible: Boolean,
  title: String,
  description: String,
  openDate: Date,
  eventStartDate: Date,
  eventEndDate: Date,
  tickets: Number,
  ticketsLeft: Number,
  mail: {
    sended: Boolean,
    location: String,
    partner: String,
    city: String,
    preparation: String,
    contact: { type: String, default: 'Piotr Zwoliński, tel. 532 264 968'}
  },
  substantiveContent: String
});

EventSchema.virtual('date')
  .get(function () {
    return this._id.getTimestamp();
  });

EventSchema.virtual('canRegisterByForm')
    .get(function () {

      var eventDate = moment(this.eventStartDate);
      var dayBeforeEvent = eventDate.clone().subtract(1, 'days').hour(0).minute(0).second(0);
      var today = moment();

      if (dayBeforeEvent.isBefore(today)) {
        return false;
      }
      else {
        return true;
      }

    });

module.exports = mongoose.model('event', EventSchema);
