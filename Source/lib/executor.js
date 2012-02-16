/*********** DISCLAIMER **************

    The code in this file is inspired
    by/makes use of the unlicensed,
    open source code available at the
    time of edition, at:

 https://github.com/substack/node-bunker

***************************************/

var dump = require('./utils.js').dump;

var burrito = require('burrito');
var vm = require('vm');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;

module.exports = function () {
    var b = new Executor();
    return b;
};

function Executor () {
    this.source = "";
    this.mut = "";
    this.test = "";
    this.nodes = [];
    this.coverage = [];
    this.nodeNum = 0;
    this.currentCov = 0;

    // only used when the mut is not specified
    this.mutIndex = 0;

    this.names = {
        call : burrito.generateName(6),
        expr : burrito.generateName(6),
        stat : burrito.generateName(6)
    };
    
    this.on('node', function (node) {
        // -1 is because we ignore the first node (the MUT definition)
        
        this.coverage[node.id-1] = true;
        //console.log(node.id + ": " + node.source())
    });

    this.on('cov', function (currentCoverage,good) {
        this.currentCov = Math.round((currentCoverage/this.nodeNum*100)*
                          Math.pow(10,2)/Math.pow(10,2));
        if (good) process.stdout.write(".");
    });
}

Executor.prototype = new EventEmitter;

Executor.prototype.getMutCoverage = function() {
    return this.currentCov;
}

Executor.prototype.addSource = function(src) {
    this.source = src;
    return this;
};

Executor.prototype.setTest = function(test) {
    this.test = test;
    return this;
};

Executor.prototype.setMUT = function(classInfo,index) {
    var nodes = this.nodes;
    var names = this.names;
    var n = 0;
    var mutDef = "";
    if (index) {
        mutDef = classInfo.methods[index].def;
    }
    else {
        mutDef = classInfo.methods.filter(function(x){return x.mut})[0].def;
    }
    var def = classInfo.name + ".prototype.MUT = " + mutDef;
    var mut = burrito(def, function (node) {
        var i = nodes.length;
        if (node.name === 'call') {
            nodes.push(node);
            n++;
            node.wrap(names.call + '(' + i + ')(%s)');
        }
        else if (node.name === 'stat' || node.name === 'throw'
        || node.name === 'var') {
            nodes.push(node);
            n++;
            node.wrap('{' + names.stat + '(' + i + ');%s}');
        }
        else if (node.name === 'binary') {
            nodes.push(node);
            n++;
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        else if (node.name === 'unary-postfix' || node.name === 'unary-prefix') {
            nodes.push(node);
            n++;
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        // if the node does not correspond to any of the node types above
        // (like the very last one) no need to set its id as this node is
        // effectively ignored (it is not pushed onto the nodes array)
        if (i !== nodes.length) {
            node.id = i;
        }
    });

    this.mut = mut;
    // initialising coverage tracker
    // n-- is for ignoring the first node which was for the MUT definition
    n--;
    for(var c = 0; c<n; c++) {
        this.coverage[c] = false;
    }
    this.nodeNum = n;
}

function initProxy(classes) {
    Proxy.Handler = function(target,className) {
      this.target = target;
      this.className = className;
      this.classes = classes;
    };

    Proxy.Handler.prototype = {

      // == fundamental traps ==

      // Object.getOwnPropertyDescriptor(proxy, name) -> pd | undefined
      getOwnPropertyDescriptor: function(name) {
        var desc = Object.getOwnPropertyDescriptor(this.target, name);
        if (desc !== undefined) { desc.configurable = true; }
        return desc;
      },

      // Object.getPropertyDescriptor(proxy, name) -> pd | undefined
      getPropertyDescriptor: function(name) {
        var desc = Object.getPropertyDescriptor(this.target, name);
        if (desc !== undefined) { desc.configurable = true; }
        return desc;
      },

      // Object.getOwnPropertyNames(proxy) -> [ string ]
      getOwnPropertyNames: function() {
        return Object.getOwnPropertyNames(this.target);
      },

      // Object.getPropertyNames(proxy) -> [ string ]
      getPropertyNames: function() {
        return Object.getPropertyNames(this.target);
      },

      // Object.defineProperty(proxy, name, pd) -> undefined
      defineProperty: function(name, desc) {
        return Object.defineProperty(this.target, name, desc);
      },

      // delete proxy[name] -> boolean
      delete: function(name) { return delete this.target[name]; },

      // Object.{freeze|seal|preventExtensions}(proxy) -> proxy
      fix: function() {
        // As long as target is not frozen, the proxy won't allow itself to be fixed
        if (!Object.isFrozen(this.target)) {
          return undefined;
        }
        var props = {};
        Object.getOwnPropertyNames(this.target).forEach(function(name) {
          props[name] = Object.getOwnPropertyDescriptor(this.target, name);
        }.bind(this));
        return props;
      },

      // == derived traps ==

      // name in proxy -> boolean
      has: function(name) { return name in this.target; },

      // ({}).hasOwnProperty.call(proxy, name) -> boolean
      hasOwn: function(name) { return ({}).hasOwnProperty.call(this.target, name); },

      // proxy[name] -> any
      get: function(receiver, name) {
          console.log()
          console.log()
          console.log(_.indexOf(_.keys(this.target),'bottomLeft'));
          console.log(this.target)
          console.log(this.className)
          console.log(name)
          dump(this.classes,"f")

          
          // TODO: change the params array into a map for easier indexing
          // of the parameters to update their method lists?
          
          this.classes[this.className]
          return this.target[name];
      },

      // proxy[name] = value
      set: function(receiver, name, value) {
       if (canPut(this.target, name)) { // canPut as defined in ES5 8.12.4 [[CanPut]]
         this.target[name] = value;
         return true;
       }
       return false; // causes proxy to throw in strict mode, ignore otherwise
      },

      // for (var name in proxy) { ... }
      enumerate: function() {
        var result = [];
        for (var name in this.target) { result.push(name); };
        return result;
      },

      /*
      // if iterators would be supported:
      // for (var name in proxy) { ... }
      iterate: function() {
        var props = this.enumerate();
        var i = 0;
        return {
          next: function() {
            if (i === props.length) throw StopIteration;
            return props[i++];
          }
        };
      },*/

      // Object.keys(proxy) -> [ string ]
      keys: function() { return Object.keys(this.target); }
    };
    return Proxy;
}

Executor.prototype.setupContext = function(classes) {
    var context = {};
    context.Proxy = initProxy(classes);
    
    // adding the instrumentation methods to the runtime context
    var self = this;
    var stack = [];
    
    context[self.names.call] = function (i) {
        var node = self.nodes[i];
        stack.unshift(node);
        self.emit('node', node, stack);
        
        return function (expr) {
            stack.shift();
            return expr;
        };
    };

    context[self.names.expr] = function (i) {
        var node = self.nodes[i];
        self.emit('node', node, stack);
        
        return function (expr) {
            return expr;
        };
    };
    
    context[self.names.stat] = function (i) {
        var node = self.nodes[i];
        self.emit('node', node, stack);
    };
    
    this.context = context;
};
    
Executor.prototype.display = function() {
    console.log('-------------- SOURCE -----------------');
    console.log(this.source);
    console.log('---------------------------------------');
    console.log('-------------- MUT --------------------');
    console.log(this.mut);
    console.log('---------------------------------------');
    console.log('-------------- TEST -------------------');
    console.log(this.test);
    console.log('---------------------------------------');    
}

Executor.prototype.covered = function () {
    return (this.coverage.filter(function(x){return x;})).length;
}

Executor.prototype.run = function () {
    var src = this.source + '\n' + this.mut + '\n' + this.test;
    if (!this.mut) {
        console.warn("Warning: Executor.mut is an empty string")
    }
    if (!this.test) {
        console.warn("Warning: Executor.test is an empty string")
    }
    var before = this.covered();
    var res = {};
    try {
        vm.runInNewContext(src,this.context);
    }
    catch (err){
        console.log("caught "+err);
    }
    var after = this.covered();
    var good = after > before;
    this.emit('cov',after,good);
    return {good : good, result : res, cov : this.currentCov};
};
