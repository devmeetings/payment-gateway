function intercept (next, func) {
  return function () /* args */ {
    var err = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    if (err) {
      next(err);
    } else {
      return func.apply(this, args);
    }
  };
}

module.exports = intercept;
