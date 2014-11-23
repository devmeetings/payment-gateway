var rest = require('restler');

var Payu = function(id, key) {
  this.id = id;
  this.key = key;
};


Payu.prototype = {
  id: null,
  key: null,
  host: 'https://secure.pay.com',

  _calculateTotalAmount: function(products) {
    function add(a, b) {
      return a + b;
    }
    function calcValue(product) {
      return product.quantity * product.unitPrice;
    }
    return products.map(calcValue).reduce(add);
  },

  _createRequestModel: function(options, products, buyer) {

  },
  /**
   *
   * this.createOrderRequest({
   *  notifyUrl: 'asd',
   *  completeUrl: '',
   *  customerIp: '',
   *  description: '',
   *  currencyCode: 'PLN',
   *  extOrderId: '123'
   * }, [{
   *  name: "P1",
   *  unitPrice: 100,
   *  quantity: 1
   *}], {
   *   "email": "john.doe@example.com",
   *   "phone": "111111111",
   *   "firstName": "John",
   *   "lastName": "Doe"
   *});
   */
  createOrderRequest: function(options, products, buyer) {
    var data = this._createRequestModel(options, products, buyer);
    var total = this._calculateTotalAmount(products);

    rest.post(this.host + '/api/v2_1/orders', {
      username: this.id,
      password: this.key
    });
  }
};

Payu.create = function(id, key) {
  return new Payu(id, key);
};

Payu.test = Payu.create('145227', '13a980d4f851f3d9a1cfc792fb1f5e50');


module.exports = Payu;
