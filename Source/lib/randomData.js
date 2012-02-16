var _ = require('underscore');
var dump = require('./utils').dump;

exports.inferTypes = function(classes,params) {

    function inferType(methods) {
        var currentMatches = 0;
        var name = "";
        var paramTypes = [];
        for(var c in classes) {
            var classMethods = classes[c].methods;
            var matches = _.intersection(_.pluck(classMethods,"name"),methods).length;
            if (matches > currentMatches) {
                currentMatches = matches;
                name = classes[c].ctr.def.name;
                ctrParams = classes[c].ctr.params;
                for (var p in ctrParams) {
                    paramTypes.push(inferType(ctrParams[p]))
                }
            }
        }
        if (currentMatches === 0) {
            

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
            });

            context.String = String;
            context.String.prototype = Object.create(NoSuchMethodTrap);
            context.String.__noSuchMethod__ = function() {return "OMGNOMETHOD string"};

            context.Number   = Number;
            context.Number.prototype = Object.create(NoSuchMethodTrap);
            context.Number.__noSuchMethod__ = function() {return "OMGNOMETHOD number"};

            context.Boolean = Boolean;
            context.Boolean.prototype = Object.create(NoSuchMethodTrap);
            context.Boolean.__noSuchMethod__ = function() {return "OMGNOMETHOD booleans"};*/            
            
            var r = Math.floor(Math.random()*3);
            if (r === 0) {
                name = "Number";
            }
            else if (r === 1) {
                name = "String";
            }
            else {
                name = "Boolean";
            }
        }
        return {name : name, params : paramTypes};
    }
    
    var randomParams = [];
    for(var i = 0; i<params.length; i++) {
        randomParams[i] = inferType(params[i]);
    }
    return randomParams;
}

exports.getNum = function() {
    MAX_INT = 700;
    return Math.floor(Math.random()*MAX_INT);   
}

exports.getBool = function() {
    return Math.floor(Math.random()*2) === 1;
}

exports.getString = function() {
    MAX_LENGTH = 10;
    var string = "";
    var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i=0; i < Math.ceil(Math.random()*MAX_LENGTH); i++) {
        string += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    return "\"" + string + "\"";
}