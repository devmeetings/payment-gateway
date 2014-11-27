var Event = (function(R, D) {

  var WaitingComponent = R.createClass({
    render: function() {
      var niceDate = moment(this.props.event.openDate).format("LLLL");
      return (
        <div>
          <div className="row">
            <div className="col-md-2">
              <h1 className="noHeaderMargins text-center"><span className="fa fa-ticket"></span></h1>
            </div>
            <div className="col-md-10">
              <h4 className="noHeaderMargins">Rejestracja będzie otwarta {moment(this.props.event.openDate).from(this.props.currentTime)}</h4>
              <h5 className="noHeaderMargins text-muted">{niceDate}</h5>
            </div>                    
          </div>                 
        </div>
      );
    }

  });

  var RegisterComponent = R.createClass({

    render: function() {
      var progressVal = this.props.event.ticketsLeft / this.props.event.tickets * 100;
      var progress = {
        width: progressVal + "%"
      };

      var progressLeft = {
        width: (100-progressVal) + "%"
      };
      
      var messageText;
      if (progressVal === 0) {
        messageText = 'Brak wolnych miejsc.';
      } else {
        messageText = 'Pozostało '+this.props.event.ticketsLeft+ ' z '+ this.props.event.tickets + ' miejsc.';
      }

      return (
        <div>
          <div className="row">
            <div className="col-md-2">
              <h1 className="noHeaderMargins"><span className="fa fa-ticket"></span></h1>
            </div>
            <div className="col-md-10">
              <h4 className="noHeaderMargins">Rejestracja trwa!</h4>
              Aby wziąć udział w DevMeetingu<br/>musisz się zarejestrować.
              <h5>{messageText}</h5>
          <form 
                  action={"/events/" + this.props.event.name +"/tickets"} 
                  method="post">
            <div className="progress">
              <div style={progressLeft} className="progress-bar progress-bar-warning"></div>            
              <div style={progress} className="progress-bar progress-bar-info"></div>
            </div>
            <button className={"btn btn-lg btn-dev " + ((progressVal === 0) ? "btn-disabled disabled" : "")} disabled={progressVal === 0}>Zarejestruj się!</button>
          </form>
            </div>

          </div>         
          
        </div>
      );
    }
  });

  var EventComponent = R.createClass({

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
      [].map.call(this.getDOMNode().querySelectorAll('pre > code'), function(node) {
        hljs.highlightBlock(node);
      });
    },

    componentWillUnmount: function() {
      clearInterval(this.interval);
    },

    render: function() {
      var isAvailable = moment(this.state.currentTime).isAfter(this.props.event.openDate);
      var eventStartDate = moment(this.props.event.eventStartDate);
      var eventEndDate = moment(this.props.event.eventEndDate);


      var progress = {
        width: this.props.event.ticketsLeft / this.props.event.tickets * 100 + "%"
      };

      var eventActions;
      if (isAvailable) {
        eventActions = <RegisterComponent event={this.props.event}></RegisterComponent>;
      } else {
        eventActions = <WaitingComponent event={this.props.event} currentTime={this.state.currentTime}></WaitingComponent>;
      }

      return (
        <div>
          <div className="container">
            <div className="row">
              <div className="col-md-8 col-sm-8">
                <h4>{this.props.event.title}</h4>
                <div dangerouslySetInnerHTML={{__html: this.props.event.description}}></div>
                <div className="vertical-space-m"></div>
              </div>
              <div className="col-md-4 col-sm-4">
                <div className="well">
                  <div className="row">
                    <div className="col-md-2 text-center">
                      <h1 className="noHeaderMargins"><span className="fa fa-calendar-o"></span></h1>
                    </div>
                    <div className="col-md-10">
                      <h4 className="noHeaderMargins">{eventStartDate.format('LL')}</h4>
                      <h5 className="noHeaderMargins text-muted">{eventStartDate.format('dddd')}, {eventStartDate.format('HH:mm') + ' - ' + eventEndDate.format('HH:mm')}</h5>
                    </div>                    
                  </div>
                  <hr className="no-border"/>
                  <div className="row">
                    <div className="col-md-2 text-center">
                      <h1 className="noHeaderMargins"><span className="fa fa-map-marker"></span></h1>
                    </div>
                    <div className="col-md-10">
                      <h4 className="noHeaderMargins">DevMeeting Online</h4>
                      <h5 className="noHeaderMargins text-muted">Sprawdź co będzie potrzebne</h5>
                    </div>                    
                  </div>                  
                  <hr/>
                  {eventActions}
                </div>
              </div>
            </div>
          </div>
          <div className="container-light-gray">
            <div className="container vertical-padding-s">
              <div className="row">
                <div className="col-md-8 col-sm-8">
                  <h3>Informacje praktyczne</h3>
                  <div className="vertical-space-s"></div>
                  <p>
                    DevMeeting odbywa się w formie spotkania online, bez konieczności wychodzenia z domu. Ponieważ podstawą spotkania jest komunikacja i współpraca pomiędzy uczestnikami, warto zadbać o przygotowanie komputera do porządnej komunikacji głosowej.</p>

                  <p>
                    <h5 className="noHeaderMargins">Komunikacja przez Teamspeak<br/></h5>Podczas warszatów będziemy komunikować się przez TeamSpeak - narzędzie używane m. in. przez graczy Battlefield czy Minecraft. Prosimy o instalację klienta dostępnego pod: http://www.teamspeak.com. Dane dostępowe do naszego serwera udostępnimy zarejestrowanym uczestnikom.
                  </p>
                  <p>
                    <h5 className="noHeaderMargins">Słuchawki<br/></h5>Przygotuj proszę wygodne słuchawki, ponieważ głośniki mogą powodować echo utrudniać komunikację.
                  </p>
                  <p>
                    <h5 className="noHeaderMargins">Przeglądarka Google Chrome<br/></h5>Nasza plaftorma do prowadzenia szkoleń wspiera aktualnie Google Chrome, dlatego prosimy o instalację tej przeglądarki.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="container-dark-gray">
            <div className="container vertical-padding-m">    
              <div className="row">
                <div className="col-md-4 col-sm-4 col-md-offset-4">
                  {eventActions}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  });

  R.render(
    <EventComponent event={currentEvent} />,
    document.querySelector('.event')
  );

}(React, React.DOM));
