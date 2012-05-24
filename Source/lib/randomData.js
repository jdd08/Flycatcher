var _ = require('underscore');
var util = require('util');

exports.inferTypes = function(classes,params) {
    function inferType(methods) {
        methods = _.uniq(methods);
//        console.log(methods)
/*      if (methods[0] && methods.length && methods[0] === 'valueOf') {
            return {name : "Number", params : []};
        }
        else if (methods[0] && methods.length && methods[0] === 'toString') {
            return {name : "Number", params : []};
        }
*/
//        console.log("methods",methods)
        if (methods.length && _.all(methods,function(v){ return v === 'valueOf'})) {
            return {name : "Number", params : []};
        }
        else if (methods.length && _.all(methods,function(v){ return v === 'toString'})) {
            return {name : "String", params : []};
        }
        else {
//            console.log(methods);
            var currentMatches = 0;
            var name = "";
            var map = _.map(classes,function(num,key){
                return {
                    name:key,
                    params:num.ctr.params,
                    count: function(){
                        var names = _.pluck(num.methods,"name");
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
    //        console.log(type)
    //        console.log(pars.length)
    //        console.log(pars[p])
            for (var p = 0; p < pars.length; ++p) {
                paramTypes.push(inferType(pars[p]));
            }
    //        console.log({name : type.name, params : paramTypes});
            return {name : type.name, params : paramTypes};
        }
    }
    
    var randomParams = [];
    for(var i = 0; i<params.length; i++) {
        randomParams[i] = inferType(params[i]);
    }
//console.log("CLASSES:",util.inspect(classes, false, null));
//console.log("PARAMS INFERRED:",util.inspect(randomParams, false, null));
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