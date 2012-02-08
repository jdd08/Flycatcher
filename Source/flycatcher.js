#!/usr/local/bin/node

var dump = require('./utils.js').dump;
var dumpf = require('./utils.js').dumpf;
var vm = require('vm');
var fs = require('fs');
var bunker = require('bunker');
var assert = require('assert');

Analyser =
{
    getClassInfo : function() {
        
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
            var type = Analyser.inferType(constructor,i);
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
            var type = Analyser.inferType(member,i);
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
        return "int";
    }
}   

RandomDataGenerator =
{
    generate : function(paramTypes) {
        function getRandomNumber() {
            MAX_INT = 100;
            return Math.floor(Math.random()*MAX_INT);
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
    var mut = classInfo.mut;
    methodSequence.push({name: mut.name,
                         func: mut.func,
                         params: RandomDataGenerator.generate(mut.paramTypes)})
    testCase.methodSequence = methodSequence;
    return testCase;
}

Executor =
{
    createTest : function(testCase,CUT,instrMUT) {

         function getConstructorCall(testCase) {
             // func.name needs changing to a name property!
             var constructor = testCase.ctr;
             var call = "var o = new " + constructor.func.name + "(";
             var params = constructor.params;
             for(var j = 0; j<params.length; j++) {
                 call += params[j].toString();
                 if(j !== params.length-1) {
                     call += ", ";
                 }
             }
             call += ");\n";
             return call;
         }
         
         function getMethodCalls(testCase) {
             var string = "";
             var methods = testCase.methodSequence;
             for(var k = 0; k<methods.length; k++){

                 var method = methods[k];
                 string += "o.";
                 if(k !== methods.length-1) {
                     string += method.name + "(";
                 }
                 else {
                     string += "MUT" + "(";
                 }
                 params = method.params;
                 for(var l = 0; l<params.length; l++) {
                     
                     if(l !== params.length-1) {
                         string += ", ";
                     }
                 }
                 string += ");\n";
             }
             return string;
         }

         var test = getConstructorCall(testCase);
         test += getMethodCalls(testCase);
         return test;
    },

    execute : function(testCase) {
        var b = bunker();
        var src = fs.readFileSync('bar1.js','utf8');
        
        var CUT = 'Bar';
        var instrMUT = {};
        instrMUT.name = "undertest1";
        instr = b.instrumentMUT(testCase.methodSequence[testCase.methodSequence.length-1].name,
                                         testCase.methodSequence[testCase.methodSequence.length-1].func,
                                         CUT);
        instrMUT.func = instr.r;
        
        // ignoring the first node which contains the MUT definition
        var nodeCoverage = instr.cov.slice(1);

        //dump(nodeCoverage)
        var test = this.createTest(testCase,CUT,instrMUT);
        b.addSource(src);
        b.addSource(instrMUT.func)
        b.addSource(test);
        //b.displaySource();
        var counts = {};

        b.on('node', function (node) {
            if (!counts[node.id]) {
                counts[node.id] = { times : 0, node : node };
            }
            counts[node.id].times ++;
        });

        var bunkerContext = {};
        bunkerContext.assert = assert;
        b.run(bunkerContext);

        Object.keys(counts).forEach(function (key) {
            if(key > '0'){
                var count = counts[key];
                console.log(key + ' : ' + count.node.source() + " name: " + count.node.name + " line: " + count.node.start.line);

                // relevant nodes are indexed from 1 but the array starts from 0 for convenience
                nodeCoverage[key-1].exec = true;
            }
            //console.log(count.node.node)
        })
        dump(nodeCoverage)
        dump("Coverage achieved by this test: ")
        
        /*//console.log("Executing test case.........");
        var testObj = new (testCase.ctr.func)(testCase.ctr.params[0],testCase.ctr.params[1],testCase.ctr.params[2],testCase.ctr.params[3]);
        dump(testObj)
        var methods = testCase.methodSequence;
        var result;
        for(var m=0; m<methods.length; m++) {
            result = methods[m].func.apply(testObj,methods[m].params);
        }
        */
        return "";
    }
}

stringifyTestCases = function(testCases) {
    var string = "";
    for(var i = 0; i<testCases.length; i++) {
        string += stringifyTestCase(testCases[i]);
    }
    return string;
}

stringifyTestCase1 = function(testCase) {
    var constructor = testCase.ctr;
//    string += "// Automatically generated test case " + i;
//    string += " for class "+ constructor.func.name + '\n';
//    string += "// -------------------------------------------------------------\n";
    var obj = "t0";
    string = "var " + obj + " = new ";
    string += constructor.func.name + "(";
    var params = constructor.params;
    for(var j = 0; j<params.length; j++) {
        string += params[j].toString();
        if(j !== params.length-1) {
            string += ", ";
        }
    }
    string += ");\n";

    var methods = testCase.methodSequence;
    for(var k = 0; k<methods.length; k++){

        var method = methods[k];
        string += obj + ".";
        string += method.name + "(";
        params = method.params;
        for(var l = 0; l<params.length; l++) {
            string += params[l].toString();
            if(l !== params.length-1) {
                string += ", ";
            }
        }
        string += ");\n";
    }
    return string;   
}

stringifyTestCase = function(testCase) {
    var constructor = testCase.t.ctr;
//    string += "// Automatically generated test case " + i;
//    string += " for class "+ constructor.func.name + '\n';
//    string += "// -------------------------------------------------------------\n";
    string = "var t" + i + " = new ";
    string += constructor.func.name + "(";
    var params = constructor.params;
    for(var j = 0; j<params.length; j++) {
        string += params[j].toString();
        if(j !== params.length-1) {
            string += ", ";
        }
    }
    string += ");\n";

    var methods = testCase.t.methodSequence;
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
            string += " === " + testCase.r + ")";
        }
        string += ";\n";
    }
    string +="\n";
    return string;   
}

Analyser.classInfo = Analyser.getClassInfo();
var validTestCases = [];
for (var i=0; i<1; i++) {
    var exploratoryTestCase = RandomTestGenerator.generate(Analyser.classInfo);
    var res = Executor.execute(exploratoryTestCase);
    if(res !== "FLYCATCHER_TEST_CRASH"){
        validTestCases.push({t: exploratoryTestCase,r: res});
    }
};

var testScenarios = stringifyTestCases(validTestCases);
var fileName = "Flycatcher_"+Analyser.classInfo.className+".js";
fs.writeFileSync(fileName,testScenarios);
