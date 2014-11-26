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
          <div className="alert alert-danger">
            <h1>Twój bilet utracił ważność.</h1>
          </div>
        );
      }

      var inputField;
      if (this.state.ownPayment) {
        inputField = (<InputField name="payment" title="Twoja kwota" placeholder="" type="number">
        </InputField>);
      }

      return (
        <div>
          <div className="alert alert-success">
            <h1 className="text-center">Bilet jest zarezerwowany.</h1>
            <p>Musisz dokończyć rejestrację {timeLeft}.</p>
          </div>

          <div className="well">
            <h1>Bilet na {this.props.claim.event.title}</h1>

            <form method="post" className="form-horizontal clearfix">
              <fieldset>
                <legend>Dane kontaktowe</legend>
                <InputField name="email" type="email" title="E-mail" placeholder="Adres e-mail" />
                <InputField name="names" title="Imię i nazwisko" placeholder="Imię i nazwisko" />
                
              </fieldset>

              <fieldset>
                <legend>Płatność</legend>

                <div className="form-group">
                  <label className="col-md-3 control-label">
                    Deklarowana kwota
                  </label>
                  <div className="col-md-9">
                    <RadioField name="payment" value="10" type="radio-danger" onChange={this.changeValue}>
                      <span>10 zł</span>
                    </RadioField>
                    <RadioField name="payment" value="25" type="radio-danger" onChange={this.changeValue}>
                      <span>25 zł</span>
                    </RadioField>
                    <RadioField name="payment" value="50" type="radio-danger" onChange={this.changeValue}>
                      <span>50 zł</span>
                    </RadioField>
                    <RadioField name="payment" value="75" type="" checked onChange={this.changeValue}>
                      <span>75 zł</span>
                    </RadioField>
                    <RadioField name="payment" value="100" type="radio-success" onChange={this.changeValue}>
                      <span>100 zł</span>
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
                  Przejdź do płatności
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
