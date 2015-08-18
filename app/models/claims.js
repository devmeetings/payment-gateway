// Example model

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ClaimSchema = new Schema({
  event: {
    type: Schema.Types.ObjectId,
    ref: 'event',
    index: true
  },
  claimedTime: Date,
  validTill: Date,
  status: {
    type: String,
    enum: ['active', 'waiting', 'payed', 'expired']
  },

  amount: Number,
  invoice: {
    invoiceNo: String,
    deliveryDate: Date,
    dateOfPayment: Date,
    dateOfInvoice: Date
  },
  payment: {
    id: String,
    url: String
  },
  userData: {
    email: String,
    names: String
  }
});

ClaimSchema.virtual('date')
  .get(function () {
    return this._id.getTimestamp();
  });

ClaimSchema.virtual('amountNet')
    .get(function () {
      return (this.amount / 1.23).toFixed(2);
    });

ClaimSchema.virtual('amountDiff')
    .get(function () {
      return (this.amount - this.amountNet).toFixed(2);
    });

module.exports = mongoose.model('claim', ClaimSchema);

module.exports.STATUS = {
  /* Bilet zajety - w trakcie wypelniania */
  ACTIVE: 'active',
  /* Przed wyslaniem do PayU */
  CREATING_PAYMENT: 'creatingPayment',
  /* Oczekiwanie na potwierdzenie z PayU */
  WAITING: 'waiting',
  /* PayU oczekuje na potwierdzenie z banku */
  PENDING: 'pending',
  /* Zaplacone */
  PAYED: 'payed',
  /* Czas na wypelnienie wygasl */
  EXPIRED: 'expired'
};
