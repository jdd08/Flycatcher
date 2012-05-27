var _ = require('underscore');
var util = require('util');
var operators = require('./executor.js').operators;

exports.getRandomPrimitive = function() {
    var r = Math.random();
    if (r > 0.5) {
        return getNumber();
    }
    else if (r > 0.25) {
        return getString();        
    }
    else {
        return getBool();
    }
}

exports.getPrimitive = function(type) {
    var v;
    if (type === "num") {
        v = getNumber();
    }
    else if (type === "string") {
        v = getString();
    }
    else if (type === "bool") {
        v = getBool();
    }
    return v;
}

var getNumber = function() {
    // returns a number from 0 to 65535
    MAX_INT = (1 << 5);
    return Math.floor(Math.random()*MAX_INT);   
}

var getBool = function() {
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