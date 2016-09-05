var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CountrySchema = new Schema({
  name: String,
  vatRate: Number,
  currency: String,
  code: String,
  paymentMethod: {
    type: String,
    enum: ['PayU', 'Paymill', 'PayPal']
  }
});

module.exports = mongoose.model('country', CountrySchema);
