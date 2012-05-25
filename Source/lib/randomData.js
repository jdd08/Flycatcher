var _ = require('underscore');
var util = require('util');
var operators = require('./executor.js').operators;

exports.inferTypes = function(classes,params) {
    
    function operatorToPrimitive(operator,primitive) {
        switch(operator) {
            case "++" :
            case "--" : primitive.num += 100;
                        break;

            case "+" :  primitive.num += 1;
                        primitive.string += 1;
                        break;

            case "-" :
            case "*" :
            case "/" :
            case "%" :
            case ">>>" :
            case ">>" :
            case "<<" :
            case "~" :
            case "^" :
            case "|" :
            case "&" :  primitive.num += 1;
                        break;

            case "||" :            
            case "&&" :
            case "==" :
            case "!=" :
            case "!" :  primitive.num += 1;
                        primitive.string += 1;
                        primitive.bool += 1;
                        break;
            case ">=" :
            case ">" :
            case "<=" :
            case "<":   primitive.num += 2;
                        primitive.string += 1;
                        break;
        }
    }
    
    function inferType(methods) {

        var primitive = {
            num : 0,
            string : 0,
            bool : 0
        }
        var memberFunctions = [];
        _.map(methods,function(value,key) {
            if(_.include(operators,value)) {
                operatorToPrimitive(value,primitive);
            }
            else {
                memberFunctions.push(value);
            }
        })
        
        // if we have but one member function call
        // this rules out the possibility that the type
        // is a primitive
        if (memberFunctions.length) {
            var currentMatches = 0;
            var name = "";
            var map = _.map(classes,function(value,key){
                return {
                    name:key,
                    params:value.ctr.params,
                    count: function(){
                        var names = _.pluck(value.methods,"name");
                        return _.intersection(names,methods).length;
                    }()
                }
            });
            var max = _.max(map,function(elem){
                return elem.count;
            });        
            var type = max.count > 0 ? max : {name: "Unknown", params : []};
            var pars = type.params;
            var paramTypes = [];
            for (var p = 0; p < pars.length; ++p) {
                paramTypes.push(inferType(pars[p]));
            }
            return {name : type.name, params : paramTypes};            
        }
        else {
            // TODO: return the primitive type with the largest score
        }
    }
    
    var randomParams = [];
    for(var i = 0; i<params.length; i++) {
        console.log(params);
        randomParams[i] = inferType(params[i].called);
    }
    return randomParams;
}

exports.getPrimitive = function(type) {
//    if (type === "Number") {
    if (Math.random() > 0.5) {
        return getNumber();
    }
    else {
        return getString();
    }
}

var getNumber = function() {
    // returns a number from 0 to 65535
    MAX_INT = (1 << 5);
    return Math.floor(Math.random()*MAX_INT);   
}

exports.getBool = function() {
    return Math.floor(Math.random()*2) === 1;
}

var getString = function() {
    MAX_LENGTH = 10;
    var string = "";
    var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i=0; i < Math.ceil(Math.random()*MAX_LENGTH); i++) {
        string += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    return "\"" + string + "\"";
}