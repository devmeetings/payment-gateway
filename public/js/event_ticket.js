(function(R, D) {


  var InputField = R.createClass({

    getDefaultProps: function(){
      return {
        type: 'text'
      }
    },

    render: function() {
      return (
        <div className="form-group">
          <label htmlFor={this.props.name} className="col-md-3 control-label">
            {this.props.title}
          </label>
          <div className="col-md-9">
            <input type={this.props.type} className="form-control" 
              placeholder={this.props.placeholder} name={this.props.name} id={this.props.name} required/>
          </div>
        </div>
      );
    }
  });

  var RadioField = R.createClass({
    render: function() {
      return (
          <div className={"radio " + this.props.type }>
            <label>
              <input type="radio" value={this.props.value} name={this.props.name} defaultChecked={this.props.checked} onChange={this.props.onChange}/>
              {this.props.children}
            </label>
          </div>
      );
    }

  });

  var TicketComponent = R.createClass({

    getInitialState: function() {
      return {
        currentTime: new Date(),
        ownPayment: false
      };
    },

    tick: function() {
      this.setState({
        currentTime: new Date()
      });
    },

    changeValue: function() {
      this.setState({
        ownPayment: event.target.value === "-1"
      });
    },

    componentDidMount: function() {
      this.interval = setInterval(this.tick, 100);
    },

    componentWillUnmount: function() {
      clearInterval(this.interval);
    },

    render: function() {
      var isAvailable = moment(this.state.currentTime).isBefore(this.props.claim.validTill);
      var timeLeft = moment(this.props.claim.validTill).fromNow();

      if (!isAvailable) {
        return (
          <div>
            <div className="vertical-space-l"></div>
            <div className="alert alert-danger">
              <h4 className="noHeaderMargins">
                <div className="pull-left fa fa-thumbs-o-down fa-4x"></div>Czas, który miałeś na dokończenie rejestracji skończył się.
              </h4>
              <h5 className="text-muted">
                Możesz spróbować zarejestrować się jeszcze raz.<br/>W razie problemów, prosimy o maila: info@devmeetings.com.
              </h5>
            </div>  
            <div className="vertical-space-xxl"></div>            
          </div>
        );
      }

      var inputField;
      if (this.state.ownPayment) {
        inputField = <InputField name="payment" title="Twoja kwota" placeholder="" type="number">
        </InputField>;
      }

      var eventStartDate = moment(this.props.claim.event.eventStartDate);
      var eventEndDate = moment(this.props.claim.event.eventEndDate);

      return (
        <div>
          <div className="alert alert-warning">
            <h4 className="noHeaderMargins">Prosimy o wypełnienie formularza. Masz 15 min czasu, nie spiesz się</h4>
            <p>Aby się zarejestrować, musisz dokończyć rejestrację <strong>{timeLeft}</strong>.</p>
          </div>

          <div className="well">
            <h5 className="noHeaderMargins text-muted">Rejestrujesz się na DevMeeting</h5>
            <h3 className="noHeaderMargins">{this.props.claim.event.title}</h3>
            <h5 className="noHeaderMargins">{eventStartDate.format('LL')} ({eventStartDate.format('dddd')}), {eventStartDate.format('HH:mm') + ' - ' + eventEndDate.format('HH:mm')}</h5>
            <hr/>
            <form method="post" className="form-horizontal clearfix">
              <fieldset>
                <h4>Dane kontaktowe</h4>
                <InputField name="email" type="email" title="E-mail" placeholder="Adres e-mail" />
                <InputField name="names" title="Imię i nazwisko" placeholder="Imię i nazwisko" />
                
              </fieldset>

              <fieldset>
                <h4>Płatność (Pay What You Want)</h4>

                <div className="form-group">
                  <label className="col-md-3 control-label">
                    Deklarowana kwota
                  </label>
                  <div className="col-md-9">
                    <RadioField name="payment" value="50" type="radio-danger" onChange={this.changeValue}>
                      <span>50 zł</span>
                    </RadioField>
                    <RadioField name="payment" value="75" type="" checked onChange={this.changeValue}>
                      <span>75 zł</span>
                    </RadioField>
                    <RadioField name="payment" value="100" type="radio-success" onChange={this.changeValue}>
                      <span>100 zł (osoby, które wpłacą 100 zł lub więcej, otrzymają wysokiej jakości wydrukowany certyfikat)</span>
                    <RadioField name="payment" value="150" type="radio-success" onChange={this.changeValue}>
                      <span>150 zł</span>
                    <RadioField name="payment" value="200" type="radio-success" onChange={this.changeValue}>
                      <span>200 zł</span>                                
                    </RadioField>
                    <RadioField name="payment" value="-1" type="" onChange={this.changeValue}>
                      <span>Inna</span>
                    </RadioField>
                    {inputField}
                  </div>
                </div>
              </fieldset>

              <div className="pull-right">
                <button className="btn btn-dev btn-lg" type="submit">
                  Potwierdź rejestrację
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }
  });

  R.render(
    <TicketComponent claim={claim} />,
    document.querySelector('.ticket')
  );

}(React, React.DOM));
