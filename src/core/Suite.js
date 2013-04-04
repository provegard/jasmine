jasmine.Suite = function(attrs) {
  this.env = attrs.env;
  this.id = attrs.id;
  this.parentSuite = attrs.parentSuite;
  this.description = attrs.description;
  this.onStart = attrs.onStart || function() {};
  this.completeCallback = attrs.completeCallback || function() {};
  this.resultCallback = attrs.resultCallback || function() {};
  this.encourageGC = attrs.encourageGC || function(fn) {fn();};

  this.beforeFns = [];
  this.afterFns = [];
  this.queueRunner = attrs.queueRunner || function() {};
  this.disabled = false;

  this.children_ = []; // TODO: rename
  this.suites = []; // TODO: needed?
  this.specs = [];  // TODO: needed?

  this.result = {
    id: this.id,
    status: this.disabled ? 'disabled' : '',
    description: this.description,
    fullName: this.getFullName()
  };

  this.exclusive_ = 0;
  this.maxChildExclusive_ = 0;
};

jasmine.Suite.prototype.getFullName = function() {
  var fullName = this.description;
  for (var parentSuite = this.parentSuite; parentSuite; parentSuite = parentSuite.parentSuite) {
    if (parentSuite.parentSuite) {
      fullName = parentSuite.description + ' ' + fullName;
    }
  }
  return fullName;
};

jasmine.Suite.prototype.disable = function() {
  this.disabled = true;
};

jasmine.Suite.prototype.beforeEach = function(fn) {
  this.beforeFns.unshift(fn);
};

jasmine.Suite.prototype.afterEach = function(fn) {
  this.afterFns.unshift(fn);
};

jasmine.Suite.prototype.addSpec = function(spec) {
  this.addChild_(spec);
  this.specs.push(spec);   // TODO: needed?
};

jasmine.Suite.prototype.addSuite = function(suite) {
  suite.parentSuite = this;
  this.addChild_(suite);
  this.suites.push(suite);    // TODO: needed?
};

jasmine.Suite.prototype.addChild_ = function(child) {
  this.children_.push(child);
  
  var s = this;
  while (s) {
    // Keep track of max exclusive_ among children, and make sure that our own exclusive_
    // is never less than that of the highest child.
    s.maxChildExclusive_ = Math.max(s.maxChildExclusive_, child.exclusive_ || 0);
    s.exclusive_ = Math.max(s.exclusive_, s.maxChildExclusive_);

    child = s;
    s = s.parentSuite;
  }
};

jasmine.Suite.prototype.children = function() {
  return this.children_;
};

jasmine.Suite.prototype.execute = function(onComplete) {
  var self = this;
  if (this.disabled) {
    complete();
    return;
  }

  var allFns = [],
    children = this.children_;

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    // If there are exclusive children, execute only those, else all.
    if (this.maxChildExclusive_ === 0 || this.maxChildExclusive_ <= (child.exclusive_ || 0)) {
      allFns.push(wrapChild(child));
    }
  }

  this.onStart(this);

  this.queueRunner({
    fns: allFns,
    onComplete: complete
  });

  function complete() {
    self.resultCallback(self.result);

    if (onComplete) {
      onComplete();
    }
  }

  function wrapChild(child) {
    return function (done) {
      child.execute(done);
    };
  }
};
