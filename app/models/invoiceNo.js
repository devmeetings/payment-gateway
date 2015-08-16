var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var InvoiceNoSchema = new Schema({
  year: Number,
  month: Number,
  no: Number
});

module.exports = mongoose.model('invoiceno', InvoiceNoSchema);
