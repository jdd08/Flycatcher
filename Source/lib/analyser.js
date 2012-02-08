var dump = require('./utils').dump;

var fs = require('fs');
var vm = require('vm');

function inferType(func,param) {
    return "int";
}

exports.getClassInfo = function(commander,classContext,className) {
    
    // retrieving constructor for the class under test
    var constructor = classContext[className];
    if (!constructor) {
        console.error("Error: specified class could not be found in given file");
        console.error("(see README for information on recognised class definitions)");
        console.info(commander.helpInformation());
        process.exit(1);
    }

    var ctrParams = [];
    for (var i = 0; i<constructor.length; i++) {
        var type = inferType(constructor,i);
        ctrParams.push(type);
    }
    var ctr = {def: constructor, params: ctrParams};
    
    // an instance of the class under test needs to be created in order
    // to retrieve the class' method signatures
    var c = new (ctr.def)();

    // retrieving methods
    var methods = [];
    for(var m in c) {
        var member = c[m];
        if(typeof member == "function") {
            var methodParams = [];
            for (var i = 0; i<member.length; i++) {
                var type = inferType(member,i);
                methodParams.push(type);
            }
            var methods = {};
            methods[m] = {def: c[m], params: methodParams};
        }
    }

    return { ctr : ctr, methods : methods };
}