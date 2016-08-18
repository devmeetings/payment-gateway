var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CountrySchema = new Schema({
  name: {
    type: String,
    enum: ['poland', 'uk', 'spain', 'germany']
  },
  code: {
    type: String,
    enum: ['pl', 'uk', 'es', 'de']
  },
  vatRate: Number,
  currency: {
    type: String,
    enum: ['PLN', 'GBP', 'EUR']
  },
  paymentMethod: {
    type: String,
    enum: ['PayU', 'Paymill']
  }
});

module.exports = mongoose.model('country', CountrySchema);
