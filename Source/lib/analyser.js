var dump = require('./utils').dump;

var fs = require('fs');
var vm = require('vm');
var handler = require('./proxyhandlers').analyserHandler;

exports.getClasses = function(commander,classContext,className,mutName) {
    
    var classes = {};

    if (!classContext[className]){
        console.error("Error: specified class <" + className + "> was not found");
        console.error("(see README for information on recognised class definitions)");
        console.info(commander.helpInformation());
        process.exit(1);
    }
    for (var classDef in classContext) {
        if(typeof classContext[classDef] === "function") {
            // retrieving constructor for the class under test
            var constructor = classContext[classDef];
            var ctrParams = [];
            for (var i = 0; i<constructor.length; i++) {
                ctrParams.push([]);
            }
            var ctr = {def: constructor, params: ctrParams};

            // an instance of the class under test needs to be created in order
            // to retrieve the class' method signatures
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
                var len = ctr.def.length;
                for (var i = 0; i < len; i++) {
                    var P = {};
                    // in the first pass ignore the fact that method calls fail atm
                    // (we don't know what types of parameters are required and we are
                    // only interested with getting the overall signatures at this stage)
                    
                    // handler is imported
                    emptyParams[i] = Proxy.create(handler);
                }
                c = constructC(emptyParams);
            }
            catch (err) {
                console.log(err.toString());
                console.error("Error in class constructor/function definition <" + classDef + ">.");
                process.exit(1);
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