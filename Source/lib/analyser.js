var dump = require('./utils').dump;

var fs = require('fs');
var vm = require('vm');
var handler = require('./proxyhandlers').analyserHandler;

exports.getClasses = function(cmd,classContext,cutName,mutName) {

    var classes = {};

    if (!classContext[cutName]){
        console.error("Error: specified class <" + cutName + "> was not found");
        console.error("(see README for information on recognised class definitions)");
        console.info(cmd.helpInformation());
        process.exit(1);
    }
    var mutDefined = false;
    for (var className in classContext) {
        if(typeof classContext[className] === "function") {
            // retrieving constructor for the class under test
            var constructor = classContext[className];
            var ctrParams = [];
            for (var i = 0; i<constructor.length; i++) {
                ctrParams.push([]);
            }
            var ctr = {def: constructor, params: ctrParams};
            // an instance of the class under test needs to be created in order
            // to retrieve the class's method signatures
            var c = {};
            try {
                var C = ctr.def;
                var constructC = (function() {
                    function F(args) {
                        return C.apply(this, args);
                    }
                    F.prototype = C.prototype;
                    return function(args) {
                        return new F(args);
                    }
                })();
                
                var emptyParams = [];
                var len = C.length;
                for (var i = 0; i < len; i++) {
                    // we use empty proxy parameters because we are not interested in
                    // what the constructor methods achieve atm, just the class's methods
                    emptyParams[i] = Proxy.create(handler);
                }
                c = constructC(emptyParams);
            }
            catch (err) {
                console.error("Error in class constructor/function definition <" + className + "> :");
                console.error(err.toString());
                process.exit(1);
            }
            // retrieving methods
            var methods = [];
            for(var m in c) {
                var member = c[m];
                if(typeof member == "function") {
                    var methodParams = [];
                    for (var i = 0; i<member.length; i++) {
                        methodParams.push([]);
                    }
                    var isMut = className === cutName && m === mutName;
                    if (isMut) {
                        mutDefined = true;
                    };
                    methods.push({name: m, def: c[m], params: methodParams, mut: isMut});
                }
            }
            classes[className] = {name : className, ctr : ctr, methods : methods};
        }
    }
    if(!mutDefined) {
        console.error("Error: specified method <" + mutName + "> was not found in class <"+ cutName +">");
        console.error("(see README for information on recognised class definitions)");
        console.info(cmd.helpInformation());
        process.exit(1);
    }
    return classes;
}