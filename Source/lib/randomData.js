var _ = require('underscore');
var dump = require('./utils').dump;

exports.inferTypes = function(classes,params) {

    function inferType(methods) {
        methods = _.uniq(methods);
//        console.log("methods ", methods)
        var currentMatches = 0;
        var name = "";
        var paramTypes = [];
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
        var params = type.params;
        var paramTypes = [];
        for (var p = 0; p < params.length; ++p) {
            paramTypes.push(inferType(params[p]));
        }
//        console.log(type);
        console.log({name : type.name, params : paramTypes});
        return {name : type.name, params : paramTypes};
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