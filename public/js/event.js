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
          <div className="jumbotron">
            <h1>{this.props.event.title}</h1>
            <h3>This event is available!</h3>

            <h1>Tickets left: {this.props.event.ticketsLeft} / {this.props.event.tickets}</h1>

            <div class="text-center">
              <form 
                  action={"/events/" + this.props.event.name +"/ticket"} 
                  method="post">
                <button 
                  className="btn btn-lg btn-raised btn-primary block-center">

                  Claim Ticket
                </button>
              </form>
            </div>
          </div>
        );
      }

      return (
        <div className="jumbotron">
          <h1>{this.props.event.title}</h1>
          <h1>Tickets: {this.props.event.ticketsLeft}</h1>
          <h2>Opening in: {moment(this.props.event.openDate).from(this.state.currentTime)}</h2>
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
