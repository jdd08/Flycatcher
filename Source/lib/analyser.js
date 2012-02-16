var dump = require('./utils').dump;

var fs = require('fs');
var vm = require('vm');

exports.getClasses = function(commander,classContext,className,mutName) {
    
    Proxy.Handler = function(target) {
      this.target = target;
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
      get: function(rcvr, name) {
          var self = this.target;
        if (name === '__noSuchMethod__') {
          throw new Error("receiver does not implement __noSuchMethod__ hook");
        } else {
          return function() {
            var args = Array.prototype.slice.call(arguments);
            return self.__noSuchMethod__(name, args);
          }
        }
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
    
    var classes = {};

    for (var classDef in classContext) {
        if(typeof classContext[classDef] === "function") {
            // retrieving constructor for the class under test
            var constructor = classContext[classDef];
            /*if (!constructor) {
                console.error("Error: specified class <" + className + "> was not found");
                console.error("(see README for information on recognised class definitions)");
                console.info(commander.helpInformation());
                process.exit(1);
            }*/

            var ctrParams = [];
            for (var i = 0; i<constructor.length; i++) {
                ctrParams.push([]);
            }
            var ctr = {def: constructor, params: ctrParams};

            /*var NoSuchMethodTrap = Proxy.create({
              get: function(rcvr, name) {
                if (name === '__noSuchMethod__') {
                  throw new Error("receiver does not implement __noSuchMethod__ hook");
                } else {
                  return function() {
                    var args = Array.prototype.slice.call(arguments);
                    return this.__noSuchMethod__(name, args);
                  }
                }
              }
            });*/


            // an instance of the class under test needs to be created in order
            // to retrieve the class' method signatures
            var c = {};
            try {

                var C = ctr.def;
                
                function construct(constructor, args) {
                    function F() {
                        return constructor.apply(this, args);
                    }
                    F.prototype = constructor.prototype;
                    return new F();
                }
                /*var createC = (function() {
                    function F(args) {
                        return C.apply(this, args);
                    }
                    F.prototype = C.prototype;
                    return function(args) {
                        return new F(args);
                    }
                })();*/
                
                var emptyParams = [];
                var len = ctr.def.length;
                for (var i = 0; i < len; i++) {
                    var P = {};
                    // in the first pass ignore the fact that method calls fail atm
                    // (we don't know what types of parameters are required and we are
                    // only interested with getting the overall signatures at this stage)
                    P.__noSuchMethod__ = function(methodName,args) {};
                    emptyParams[i] = Proxy.create(new Proxy.Handler(P));
                }
                c = construct(C,emptyParams);
            }
            catch (err) {
                console.log(err)
            }

            // retrieving methods
            var methods = [];
            var mutDefined = false;
            for(var m in c) {
                var member = c[m];
                if(typeof member == "function") {
                    var methodParams = [];
                    for (var i = 0; i<member.length; i++) {
                        methodParams.push([]);
                    }
                    if (mutName !== undefined && m === mutName) {
                        mutDefined = true;
                        methods.push({name: m, def: c[m], params: methodParams, mut: true});
                    }
                    else {
                        methods.push({name: m, def: c[m], params: methodParams});
                    }
                }
            }
            if(mutName !== undefined && classDef === className) {
                if (!mutDefined) {
                    console.error("Error: specified method <" + mutName + "> was not found in class <"+ className +">");
                    console.error("(see README for information on recognised class definitions)");
                    console.info(commander.helpInformation());
                    process.exit(1);
                }
            }
            
            classes[classDef] = {name : classDef, ctr : ctr, methods : methods};
        }
    }
    return classes;
}