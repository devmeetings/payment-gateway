var Event = (function(R, D) {

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
    },

    componentWillUnmount: function() {
      clearInterval(this.interval);
    },

    render: function() {
      var isAvailable = moment(this.state.currentTime).isAfter(this.props.event.openDate);

      if (isAvailable) {
        return (
          <div className="well clearfix">
            <h1>{this.props.event.title}</h1>
            <h3>Bilety na to wydarzenie są już dostępne!</h3>

            <h1>Pozostało biletów: {this.props.event.ticketsLeft} / {this.props.event.tickets}</h1>

            <div className="text-center">
              <form 
                  action={"/events/" + this.props.event.name +"/tickets"} 
                  method="post">
                <br />
                <button 
                  className="btn btn-lg btn-primary center-block">

                  Zarezerwuj Bilet
                </button>
              </form>
            </div>
          </div>
        );
      }

      return (
        <div className="well">
          <h1>{this.props.event.title}</h1>
          <h1>Bilety: {this.props.event.ticketsLeft}</h1>
          <h2>Rejestracja otwiera się: {moment(this.props.event.openDate).from(this.state.currentTime)}</h2>
          <p className="text-muted">{this.props.event.openDate}</p>
        </div>
      );
    }
  });

  R.render(
    <EventComponent event={currentEvent} />,
    document.querySelector('.event')
  );

}(React, React.DOM));
