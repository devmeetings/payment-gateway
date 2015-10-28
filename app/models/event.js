// Example model

var mongoose = require('mongoose');
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
    location: String,
    partner: String
  },
  substantiveContent: String
});

EventSchema.virtual('date')
  .get(function () {
    return this._id.getTimestamp();
  });

module.exports = mongoose.model('event', EventSchema);
