var _ = require('underscore');
var util = require('util');
var Randexp = require('randexp');

exports.getAny = function() {
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

exports.get = function(type) {
    var v;
    if (type === "number") {
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
    const MAX_INT = (1 << 4);
    // returns a number from 0 to 65535
    if(Math.random() > 0.2) return Math.floor(Math.random()*MAX_INT);
    // we need more 0s as they are significant for covering branches
    else return 0;
}

var getBool = function() {
    return Math.floor(Math.random()*2) === 1;
}

var getString = function() {
    // // MAX_LENGTH = 20;
    // var string = "";
    // var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    // // var charSet = "0123456789";
    // // for(var i=0; i < 10 + Math.ceil(Math.random()*MAX_LENGTH); i++) {
    // for(var i=0; i < Math.ceil(Math.random()*16); i++) {
    //     string += charSet.charAt(Math.floor(Math.random() * charSet.length));
    // }
    // // var res;
    // // Math.random() > 0.3 ? res = string : 
    // //     (Math.random() > 0.6 ? res = string : 
    // //         (Math.random() > 0.8 ? res = "123" : res = "testestestestest"));
    // // console.log(string);
    
    // sha1
    // var string = new Randexp((/[A-Za-z0-9_\u0999]{10,20}/)).gen();
    
    // chess
    var string = new Randexp((/[a-h][1-8]?/)).gen();
    // console.log(string);
    // console.log(string);
    return "\"" + string + "\"";
}