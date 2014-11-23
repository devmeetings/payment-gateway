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
