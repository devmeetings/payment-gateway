/* globals React,moment,claim */
(function (R, D, T) {

  var InputField = R.createClass({
    getDefaultProps: function () {
      return {
        type: 'text',
        min: '1',
        disabled: false
      };
    },

    render: function () {
      return (
        <div className='form-group'>
          <label htmlFor={this.props.name} className='col-md-3 control-label'>
            {this.props.title}
          </label>

          <div className='col-md-9'>
            <input type={this.props.type}
                   className='form-control'
                   min={this.props.min}
                   placeholder={this.props.placeholder}
                   name={this.props.name}
                   id={this.props.name}
                   disabled={this.props.disabled} required/>
          </div>
        </div>
      );
    }
  });

  var RadioField = R.createClass({
    render: function () {
      return (
        <div className={'radio ' + this.props.type }>
          <label>
            <input type='radio' value={this.props.value} name={this.props.name} defaultChecked={this.props.checked}
                   onChange={this.props.onChange}/>
            {this.props.children}
          </label>
        </div>
      );
    }
  });

  var CheckField = R.createClass({
    render: function () {
      return (
        <div className='form-group'>
          <div className='col-md-offset-3 col-md-9'>
            <div className='checkbox'>
              <label>
                <input type='checkbox' name={this.props.name} onChange={this.props.onChange}/> {T.invoice.wantToReceiveInvoice}
              </label>
            </div>
          </div>
        </div>
      );
    }
  });

  var InvoiceComponent = R.createClass({

    render: function () {
      var componentClass = this.props.showInvoiceData ? '' : 'hidden';
      var disabled = !this.props.showInvoiceData;
      return (
        <fieldset className={componentClass}>
          <h4>{T.invoice.title}</h4>
          <InputField name='recipientName' title={T.invoice.recipientName}
                      placeholder={T.invoice.recipientName} disabled={disabled}/>
          <InputField name='tin' title={T.invoice.tin} placeholder={T.invoice.tin} disabled={disabled}/>
          <InputField name='street' title={T.invoice.street} placeholder={T.invoice.street} disabled={disabled}/>
          <InputField name='postalCode' title={T.invoice.postalCode} placeholder={T.invoice.postalCode} disabled={disabled}/>
          <InputField name='city' title={T.invoice.city} placeholder={T.invoice.city} disabled={disabled}/>
        </fieldset>
      );
    }
  });

  var TicketComponent = R.createClass({
    getInitialState: function () {
      return {
        currentTime: new Date(),
        ownPayment: false,
        showInvoiceData: false
      };
    },

    toggleInvoiceData: function () {
      this.setState({
        showInvoiceData: !this.state.showInvoiceData
      });
    },

    tick: function () {
      this.setState({
        currentTime: new Date()
      });
    },

    changeValue: function (event) {
      this.setState({
        ownPayment: event.target.value === '-1'
      });
    },

    componentDidMount: function () {
      this.interval = setInterval(this.tick, 100);
    },

    componentWillUnmount: function () {
      clearInterval(this.interval);
    },

    render: function () {
      var isAvailable = moment(this.state.currentTime).isBefore(this.props.claim.validTill);
      var timeLeft = moment(this.props.claim.validTill).fromNow();

      if (!isAvailable) {
        return (
          <div>
            <div className='vertical-space-l'></div>
            <div className='alert alert-danger'>
              <h4 className='noHeaderMargins'>
                <div className='pull-left fa fa-thumbs-o-down fa-4x'></div>
                {T.alert.timeout}
              </h4>
              <h5 className='text-muted'>
                {T.alert.timeoutInfoPart1}<br/>{T.alert.timeoutInfoPart2}
              </h5>
            </div>
            <div className='vertical-space-xxl'></div>
          </div>
        );
      }

      var inputField;
      if (this.state.ownPayment) {
        inputField = <InputField name='payment' title={T.yourAmount} placeholder='' type='number'/>;
      }

      var eventStartDate = moment(this.props.claim.event.eventStartDate);
      var eventEndDate = moment(this.props.claim.event.eventEndDate);

      return (
        <div>
          <div className='alert alert-warning'>
            <h4 className='noHeaderMargins'>{T.alert.header}</h4>

            <p>{T.alert.paragraph} <strong>{timeLeft}</strong>.</p>
          </div>

          <div className='well'>
            <h5 className='noHeaderMargins text-muted'>{T.title}</h5>

            <h3 className='noHeaderMargins'>{this.props.claim.event.title}</h3>
            <h5 className='noHeaderMargins'>{eventStartDate.format('LL')}
              ({eventStartDate.format('dddd')}), {eventStartDate.format('HH:mm') + ' - ' + eventEndDate.format('HH:mm')}</h5>
            <hr/>
            <form method='post' className='form-horizontal clearfix'>
              <fieldset>
                <h4>{T.contactData}</h4>
                <InputField name='email' type='email' title={T.mail} placeholder={T.mail}/>
                <InputField name='names' title={T.names} placeholder={T.names}/>
                <CheckField onChange={this.toggleInvoiceData} name='showInvoiceData'/>
              </fieldset>
              <InvoiceComponent showInvoiceData={this.state.showInvoiceData}/>

              <fieldset>
                <h4>{T.payment.title}</h4>

                <div className='form-group'>
                  <label className='col-md-3 control-label'>
                    {T.payment.declaredAmount}
                  </label>

                  <div className='col-md-9'>
                    <RadioField name='payment' value='50' type='radio-danger' onChange={this.changeValue}>
                      <span>50 {claim.currency}</span>
                    </RadioField>
                    <RadioField name='payment' value='75' type='radio-danger' onChange={this.changeValue}>
                      <span>75 {claim.currency}</span>
                    </RadioField>
                    <RadioField name='payment' value='100' type='' checked onChange={this.changeValue}>
                      <span>100 {claim.currency} {T.payment.diplomaInfo}</span>
                    </RadioField>
                    <RadioField name='payment' value='150' type='radio-success' onChange={this.changeValue}>
                      <span>150 {claim.currency}</span>
                    </RadioField>
                    <RadioField name='payment' value='200' type='radio-success' onChange={this.changeValue}>
                      <span>200 {claim.currency}</span>
                    </RadioField>
                    <RadioField name='payment' value='-1' type='' onChange={this.changeValue}>
                      <span>{T.payment.another}</span>
                    </RadioField>
                    {inputField}
                  </div>
                </div>
              </fieldset>

              <div className='pull-right'>
                <button className='btn btn-dev btn-lg' type='submit'>
                  {T.btnConfirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }
  });

  R.render(
    <TicketComponent claim={claim}/>,
    document.querySelector('.ticket')
  );
}(React, React.DOM, Translator));
