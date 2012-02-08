var fs = require('fs');
var vm = require('vm');

function inferType(func,param) {
    return "int";
}

exports.getClassInfo = function() {

    var classInfo = {};
    var arguments = process.argv;
    classInfo.className = arguments[2];

    var classContext = {};
    if (arguments[4]) {

        var code = fs.readFileSync(arguments[4],'utf8');
        vm.runInNewContext(code,classContext);
    }
    else {
        try {
            var fileName = classInfo.className;
            fileName += ".js";
            var code = fs.readFileSync(fileName,'utf8');
            vm.runInNewContext(code,classContext);
        }
        catch (exception) {
            console.log("ERROR loading file:");
            console.log("If no file name is provided, the file <class name provided>.js must be in the current dir.")
            process.exit(1);
        }
    }
    
    // retrieving constructor for the class under test
    var constructor = classContext[classInfo.className];
    var parameters = [];
    for (var i = 0; i<constructor.length; i++) {
        var type = inferType(constructor,i);
        parameters.push(type);
    }
    classInfo.ctr = {func: constructor, params: parameters};
    
    // retrieving other methods for the class under test
    
    // an instance of the class under test needs to be created in order
    // to retrieve the classe's method signatures
    var c = new (classInfo.ctr.func)();
    
    // 1. retrieving method under test
    classInfo.mut = {};
    var mut = arguments[3];
    classInfo.mut.name = mut;
    classInfo.mut.func = c[mut];
    var paramTypes = [];
    for (var i = 0; i<classInfo.mut.func.length; i++) {
        var type = inferType(member,i);
        paramTypes.push(type);
    }
    classInfo.mut.paramTypes = paramTypes;

    // 2. retrieving other methods
    var methods = [];
    for(var m in c) {
        var member = c[m];
        if(typeof member == "function" && m !== mut) {
            var paramTypes = [];
            for (var i = 0; i<member.length; i++) {
                var type = inferType(member,i);
                paramTypes.push(type);
            }
            methods.push({name: m, func: c[m], paramTypes: paramTypes});
        }
    }
    classInfo.methods = methods;
    return classInfo;
}