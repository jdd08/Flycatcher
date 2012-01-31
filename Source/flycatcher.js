#!/usr/local/bin/node

var dump = require('./utils.js').dump;
var vm = require('vm');
var fs = require('fs');

Analyser =
{
    getClassInfo : function() {
        
        var classInfo = {};
        var arguments = process.argv;
        classInfo.className = arguments[2];
        var classContext = {};
        if (arguments[3]) {

            var code = fs.readFileSync(arguments[3],'utf8');
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
        
        var methods = [];
        var constructor = classContext[classInfo.className];
        var parameters = [];
        for (var i = 0; i<constructor.length; i++) {
            var type = Analyser.inferType(constructor,i);
            parameters.push(type);
        }
        classInfo.ctr = {func: constructor, params: parameters};
        // an instance of the class under test needs to be created in order
        // to retrieve the classe's method signatures
        var c = new (classInfo.ctr.func)();
        for(var m in c) {
            var member = c[m];
            if(typeof member == "function") {
                var paramTypes = [];
                for (var i = 0; i<member.length; i++) {
                    var type = Analyser.inferType(member,i);
                    paramTypes.push(type);
                }
                methods.push({name: m, func: c[m], paramTypes: paramTypes});
            }
        }
        classInfo.methods = methods;
        return classInfo;
    },

    inferType : function(func,param) {
        //dump(func);
        //dump(param);
        return "int";
    }
}   

RandomDataGenerator =
{
    generate : function(paramTypes) {
        function getRandomNumber() {
            MAX_INT = 10000;
            return Math.random()*MAX_INT;
        }
        function getRandomString() {
            MAX_LENGTH = 10;
            var string = "";
            var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for(var i=0; i < Math.ceil(Math.random()*MAX_LENGTH); i++) {
                string += charSet.charAt(Math.floor(Math.random() * charSet.length));
            }
            return string;
        }
        function getRandomBoolean() {
            return Math.floor(Math.random()*2) === 1;
        }
        function getRandomValueFromType(type) {
            var randomValue;
            switch(type) {
                case "int": {
                    randomValue = getRandomNumber();
                    break;
                }
                case "string": {
                    randomValue = getRandomString();
                    break;
                }
                case "boolean": {
                    randomValue = getRandomBoolean();
                    break;
                }
            }
            return randomValue;
        }
        var randomParams = [];
        for(var i = 0; i<paramTypes.length; i++) {
            randomParams[i] = getRandomValueFromType(paramTypes[i]);
        }
        return randomParams;
    }
}

RandomTestGenerator = {};
RandomTestGenerator.generate = function(classInfo) {
    MAX_SEQUENCE_LENGTH = 10;
    var testCase = {};
    var parameters = RandomDataGenerator.generate(classInfo.ctr.params);
    testCase.ctr = {func: classInfo.ctr.func, params: parameters};
    var methodSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_SEQUENCE_LENGTH);
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*classInfo.methods.length);
        var method = classInfo.methods[randomMethod];
        methodSequence.push({name: method.name,
                             func: method.func,
                             params: RandomDataGenerator.generate(method.paramTypes)});
    }
    testCase.methodSequence = methodSequence;
    return testCase;
}

Executor =
{
    execute : function(testCase) {
        //console.log("Executing test case.........");
        var testObj = new (testCase.ctr.func)(testCase.ctr.params[0],testCase.ctr.params[1],testCase.ctr.params[2],testCase.ctr.params[3]);
        var methods = testCase.methodSequence;
        var result;
        for(var m=0; m<methods.length; m++) {
            result = methods[m].func.apply(testObj,methods[m].params);
        }
        return result;
    }
}

stringifyTestCases = function(testCases) {
    var string = "";
    for(var i = 0; i<testCases.length; i++) {
        var constructor = testCases[i].t.ctr;
        string += "// Automatically generated test case " + i;
        string += " for class "+ constructor.func.name + '\n';
        string += "// -------------------------------------------------------------\n";
        string += "var t" + i + " = new ";
        string += constructor.func.name + "(";
        var params = constructor.params;
        for(var j = 0; j<params.length; j++) {
            string += params[j].toString();
            if(j !== params.length-1) {
                string += ", ";
            }
        }
        string += ");\n";
        
        var methods = testCases[i].t.methodSequence;
        for(var k = 0; k<methods.length; k++){
            if(k === methods.length-1) {
                string += "assert(";
            }
            var method = methods[k];
            string += method.name + "(";
            params = method.params;
            for(var l = 0; l<params.length; l++) {
                string += params[l].toString();
                if(l !== params.length-1) {
                    string += ", ";
                }
            }
            string += ")";
            if(k === methods.length-1) {
                string += " === " + testCases[i].r + ")";
            }
            string += ";\n";
        }
        string +="\n";
    }
    return string;
}

Analyser.classInfo = Analyser.getClassInfo(this);
var validTestCases = [];
for (var i=0; i<3; i++) {
    var exploratoryTestCase = RandomTestGenerator.generate(Analyser.classInfo);
    var res = Executor.execute(exploratoryTestCase);
    if(res !== "FLYCATCHER_TEST_CRASH"){
        validTestCases.push({t: exploratoryTestCase,r: res});
    }
};

var testScenarios = stringifyTestCases(validTestCases);
var fileName = "Flycatcher_"+Analyser.classInfo.className+".js";
fs.writeFileSync(fileName,testScenarios);
