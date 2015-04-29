var  _ = require('lodash'),
  request = require('superagent');

var Payu = function(id, key) {
  this.id = id;
  this.key = key;
};


Payu.prototype = {
  id: null,
  key: null,
  host: 'https://secure.payu.com',

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
    var total = this._calculateTotalAmount(products);

    var model = _.extend({}, options);
    model.buyer = buyer;
    model.products = products;
    model.totalAmount = total;
    model.merchantPosId = this.id;

    return model;
  },

  getIp: function(req) {
    if (this === Payu.test) {
      return '127.0.0.1';
    }
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
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

    console.log("sending ", data);
    return request
      .post(this.host + '/api/v2_1/orders')
      .type('json')
      .redirects(0)
      .auth(this.id, this.key)
      .set('Accept', 'application/json')
      .send(data);
  },

  getOrderInfo: function(orderId) {
    return request
      .get(this.host + '/api/v2_1/orders/' + orderId)
      .auth(this.id, this.key)
      .set('Accept', 'application/json');
  }

};

Payu.create = function(id, key) {
  return new Payu(id, key);
};

Payu.test = Payu.create('145227', '13a980d4f851f3d9a1cfc792fb1f5e50');


module.exports = Payu;
