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
          <div className="jumbotron clearfix">
            <h1>{this.props.event.title}</h1>
            <h3>Bilety na to wydarzenie są już dostępne!</h3>

            <h1>Pozostało biletów: {this.props.event.ticketsLeft} / {this.props.event.tickets}</h1>

            <div class="text-center">
              <form 
                  action={"/events/" + this.props.event.name +"/tickets"} 
                  method="post">
                <button 
                  className="btn btn-lg btn-raised btn-primary pull-right">

                  Zarezerwuj Bilet
                </button>
              </form>
            </div>
          </div>
        );
      }

      return (
        <div className="jumbotron">
          <h1>{this.props.event.title}</h1>
          <h1>Bilety: {this.props.event.ticketsLeft}</h1>
          <h2>Rejestracja otwiera się: {moment(this.props.event.openDate).from(this.state.currentTime)}</h2>
          <h3>{this.props.event.openDate}</h3>
        </div>
      );
    }
  });

  R.render(
    <EventComponent event={currentEvent} />,
    document.querySelector('.event')
  );

}(React, React.DOM));
