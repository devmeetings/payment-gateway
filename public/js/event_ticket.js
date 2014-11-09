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
              <input type="radio" value={this.props.value} name={this.props.name} defaultChecked={this.props.checked} />
              <span className="circle"></span>
              <span className="check"></span>
              {this.props.children}
            </label>
          </div>
      );
    }

  });

  var TicketComponent = R.createClass({

    getInitialState: function() {
      return {
        currentTime: new Date()
      };
    },

    tick: function() {
      this.setState({
        currentTime: new Date()
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

      return (
        <div>
          <div className="alert alert-success">
            <h1>Bilet należy do Ciebie.</h1>
            <p>Musisz zapłacić za swój bilet {timeLeft}.</p>
          </div>

          <div className="well">
            <h1>Bilet na {this.props.claim.event.title}</h1>

            <form method="post" className="form-horizontal clearfix">
              <fieldset>
                <legend>Dane kontaktowe</legend>
                <InputField name="email" type="email" title="E-mail" placeholder="Adres e-mail" />
                <InputField name="names" title="Imię i nazwisko" placeholder="Imię i nazwisko" />
                <InputField name="phone" title="Telefon" placeholder="Numer telefonu" />
                
              </fieldset>

              <fieldset>
                <legend>Dane do faktury</legend>

              </fieldset>

              <fieldset>
                <legend>Płatność</legend>

                <div className="form-group">
                  <label className="col-md-3 control-label">
                    Deklarowana kwota
                  </label>
                  <div className="col-md-9">
                    <RadioField name="payment" value="10" type="radio-danger">
                      <p>10 zł</p>
                    </RadioField>
                    <RadioField name="payment" value="25" type="radio-danger">
                      <p>25 zł</p>
                    </RadioField>
                    <RadioField name="payment" value="50" type="radio-danger">
                      <p>50 zł</p>
                    </RadioField>
                    <RadioField name="payment" value="10" type="" checked>
                      <p>75 zł</p>
                    </RadioField>
                    <RadioField name="payment" value="10" type="radio-success">
                      <p>100 zł</p>
                    </RadioField>
                  </div>
                </div>
              </fieldset>

              <div className="pull-right">
                <button className="btn btn-primary btn-lg" type="submit">
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
