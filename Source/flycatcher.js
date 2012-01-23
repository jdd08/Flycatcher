load('../utils.js');

var Flycatcher = {};

Flycatcher.Analyser =
{
    getClassInfo : function(global) {
        
        var arguments = global.arguments;
        var className = arguments[0];
        if (arguments[1]) {
            load(arguments[1]);
        }
        else {
            try {
                var fileName = className;
                fileName += ".js";
                load(fileName);
            }
            catch (exception) {
                print("--- ERROR loading file:");
                print("if no file name is provided, the file <class name provided>.js must be in the current dir.")
                quit();
            }
        }

        var props = [];
        for(var m in global) {
            props.push({p: m, v: global[m]});
        }

        var classInfo = {};
        var methods = [];
        for (var j in props) {
            if(props[j].v && props[j].v.name === className){
                var constructor = props[j].v.valueOf();
                var parameters = [];
                for (var i = 0; i<constructor.length; i++) {
                    var type = Flycatcher.Analyser.inferType(constructor,i);
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
                            var type = Flycatcher.Analyser.inferType(member,i);
                            paramTypes.push(type);
                        }
                        methods.push({name: m, func: c[m], paramTypes: paramTypes});
                    }
                }
            }
        }
        classInfo.methods = methods;
        return classInfo;
    },

    inferType : function(func,param) {
        return "int";
    }
}   

Flycatcher.RandomDataGenerator =
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

Flycatcher.RandomTestGenerator = {};
Flycatcher.RandomTestGenerator.generate = function(classInfo) {
    MAX_SEQUENCE_LENGTH = 10;
    var testCase = {};
    var parameters = Flycatcher.RandomDataGenerator.generate(classInfo.ctr.params);
    testCase.ctr = {func: classInfo.ctr.func, params: parameters};
    var methodSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_SEQUENCE_LENGTH);
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*classInfo.methods.length);
        var method = classInfo.methods[randomMethod];
        methodSequence.push({name: method.name,
                             func: method.func,
                             params: Flycatcher.RandomDataGenerator.generate(method.paramTypes)});
    }
    testCase.methodSequence = methodSequence;
    return testCase;
}

Flycatcher.Executor =
{
    execute : function(testCase) {
        print("Executing test case.........");
        var testObj = new (testCase.ctr.func)(testCase.ctr.params[0],testCase.ctr.params[1],testCase.ctr.params[2],testCase.ctr.params[3]);
        var methods = testCase.methodSequence;
        var result;
        for(var m=0; m<methods.length; m++) {
            result = methods[m].func.apply(testObj,methods[m].params);
        }
        print();
        return result;
    }
}

Flycatcher.stringifyTestCases = function(testCases) {
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

Flycatcher.Analyser.classInfo = Flycatcher.Analyser.getClassInfo(this);
var validTestCases = [];
for (var i=0; i<3; i++) {
    var exploratoryTestCase = Flycatcher.RandomTestGenerator.generate(Flycatcher.Analyser.classInfo);
    var res = Flycatcher.Executor.execute(exploratoryTestCase);
    if(res !== "FLYCATCHER_TEST_CRASH"){
        validTestCases.push({t: exploratoryTestCase,r: res});
    }
};

print(Flycatcher.stringifyTestCases(validTestCases));






