_ = require('lodash')

describe 'Payu service', ->
  Cut = require './payu'

  it 'should have test instance', ->
    # given
    # when
    # then
    expect(Cut.test).not.toBeNull()

  it 'should calculate total amount of all products', ->
    # given
    products = [
      { name: 'sth', unitPrice: 100, quantity: 2},
      { name: 'sth', unitPrice: 500, quantity: 1}
    ]

    # when
    total = Cut.test._calculateTotalAmount(products)

    # then
    expect(total).toEqual(200 + 500)

  it 'should create request model', ->
    # given
    options = {
      notifyUrl: 'http://localhost',
      completeUrl: '123',
      customerIp: '127.0.0.1',
      currencyCode: 'PLN',
      extOrderId: 'A123'
    }
    products = [
      { name: 'sth', unitPrice: 100, quantity: 2},
      { name: 'sth', unitPrice: 500, quantity: 1}
    ]
    buyer = {}

    # when
    result = Cut.test._createRequestModel(options, products, buyer)

    # then
    expect(_.isEqual(result, {
      merchantPosId: '145227',
      notifyUrl: options.notifyUrl,
      completeUrl: options.completeUrl,
      customerIp: options.customerIp,
      currencyCode: options.currencyCode,
      extOrderId: options.extOrderId,
      products: products,
      buyer: buyer,
      totalAmount: 700
    })).toBe true
