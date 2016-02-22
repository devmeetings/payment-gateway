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
    enum: ['invited', 'active', 'waiting', 'payed', 'expired']
  },
  paidWithoutPayu: Boolean,
  needInvoice: Boolean,
  extra: {
    vip: Boolean,
    sponsor: Boolean
  },
  amount: Number,
  invoice: {
    invoiceNo: String,
    deliveryDate: Date,
    dateOfPayment: Date,
    dateOfInvoice: Date,
    recipientName: String,
    street: String,
    postalCode: String,
    city: String,
    tin: String,
    serviceName: String
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
      return (this.amount / 1.23).toFixed(2).replace('.', ',');
    });

ClaimSchema.virtual('amountDiff')
    .get(function () {
      return (this.amount - this.amountNet.replace(',', '.')).toFixed(2).replace('.', ',');
    });

ClaimSchema.virtual('amountFormat')
    .get(function () {
      return this.amount.toFixed(2).replace('.', ',');
    });

ClaimSchema.virtual('amountPayed')
    .get(function () {
      return this.paidWithoutPayu === true ? 0 : this.amount.toFixed(2).replace('.', ',');
    });

ClaimSchema.virtual('amountStillToPay')
    .get(function () {
      return this.paidWithoutPayu === true ? this.amount.toFixed(2).replace('.', ',') : 0;
    });

module.exports = mongoose.model('claim', ClaimSchema);

module.exports.STATUS = {
  /* Bilet wyslany jako zaproszenie - w trakcie wypelniania */
  INVITED: 'invited',
  /* Bilet zajety - w trakcie wypelniania */
  ACTIVE: 'active',
  /* Przed wyslaniem do PayU */
  CREATING_PAYMENT: 'creatingPayment',
  /* Oczekiwanie na potwierdzenie z PayU */
  WAITING: 'waiting',
  /* PayU oczekuje na potwierdzenie z banku */
  PENDING: 'pending',
  /* Platnosc zostanie wykonana bez uzycia PayU*/
  OFFLINE_PENDING: 'offlinePending',
  /* Zaplacone */
  PAYED: 'payed',
  /* Czas na wypelnienie wygasl */
  EXPIRED: 'expired'
};
