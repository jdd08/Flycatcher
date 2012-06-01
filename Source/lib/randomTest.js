var randomData = require('./randomData.js');
var _ = require('underscore');
var util = require('util');


// maximum number of CUT method calls before calling the MUT
const MAX_CALLS_BEFORE_MUT = 10;

function Test(MUTname) {
    this.unknowns = false;
    this.MUTname = MUTname;
    this.stack = [];
    this.pool = {};
    this.MUTcalls = 0;
}

Test.prototype.push = function(statement) {
    // console.log('pushing',statement);

    var parentId = statement.identifier;
    // console.log(parentId);
    var parentType = statement.type;
    var params = statement.params;

    if (isUnknown(parentType)) {
        this.unknowns = true;
    }

    var isDeclaration = statement instanceof Declaration;

    this.pool[parentType] = this.pool[parentType] || [];
    var paramIds = [];
    for (var p=0; p < params.length; p++) {
        var paramId;
        var paramType = params[p].type;
        // console.log('ParamType',paramType);
        this.pool[paramType] = this.pool[paramType] || [];
        var paramPool = this.pool[paramType];
        var reuse = paramPool &&
                    paramPool.length &&
                    Math.random() > 0.75;
        if (reuse) {
            paramId = paramPool[Math.floor(Math.random()*paramPool.length)];
        }
        else {
            // when the parameter is of type Number, the number
            // itself becomes the identifier
            if (!isPrimitive(paramType)) {
                paramId = paramType.toLowerCase() + _.uniqueId();
                //console.log(paramId);
            }
            else {
                paramId = randomData.getPrimitive(paramType);
                // if the param type is a primitive this is the only
                // chance of adding it to the pool
                paramPool.push(paramId);
            }
            // if have not yet been able to infer a type for this parameter
             // create an Unknown which will produce a Proxy in the test
             if (isUnknown(paramType)) {
                 var parentMethod;
                 // checking what the parent statement is
                 if (isDeclaration) {
                     // this refers to the constructor whose name is the type
                     parentMethod = parentType;
                 }
                 // otherwise the statement is necessarily of type Call or MUTcall
                 // and the name will be the name of the method
                 else {
                     parentMethod = statement.methodName;
                 }
                 this.push(new Unknown(paramId, parentType, parentMethod, p));
             }
             else if (!isPrimitive(paramType)) {
                 this.push(new Declaration(paramId, paramType, params[p].params));
             }
        }
        // console.log('Pushing onto paramIds: paramId ' + paramId);
        paramIds.push(paramId);
        // console.log(paramIds);
    };
    if (isDeclaration) this.pool[parentType].push(parentId);
    this.stack.push({statement: statement,
                     paramIds: paramIds});
}

Test.prototype.hasUnknowns = function() {
    return this.unknowns;
}

Test.prototype.toExecutorFormat = function() {
    var test = [];
    test.push("(function (){");
    test.push("var results = [];")
    for (var i = 0; i<this.stack.length; ++i) {
        var e = this.stack[i];
        test.push(e.statement.toExecutorFormat(e.paramIds));
    }
    test.push("return results;})();")
    return test.join('\n');
}

Test.prototype.toUnitTestFormat = function(results, testIndex) {
    var test = [];
    test.push("// MUT <" + this.MUTname + "> #" + testIndex);
    for (var i = 0; i<this.stack.length; ++i) {
        var testElement = this.stack[i];
        test.push(
            testElement.statement.toUnitTestFormat(testElement.paramIds, results));
    }
    return test.join('\n');
}

Test.prototype.toFailingTestFormat = function(msg) {
    var test = [];
    test.push("// MUT " + this.MUTname);
    for (var i = 0; i<this.stack.length; ++i) {
        var testElement = this.stack[i];
        test.push(testElement.statement.toUnitTestFormat(testElement.paramIds));
    }
    test.push(msg);
    return test.join('\n');
}

function Unknown(identifier, parentType, parentMethod, index) {
    this.identifier = identifier;
    this.type = "unknown";
    this.parentType = parentType;
    this.parentMethod = parentMethod;
    this.params = [];
    this.index = index;
    this.toExecutorFormat = function() {
        return "var " + this.identifier + " = proxy(\"" + parentType +
                "\"," + "\"" + parentMethod + "\"," + index + ");";
    }
    // no need for unit test format as unknowns will nevear appear there
}

function Declaration(identifier, type, params) {
    this.identifier = identifier;
    this.type = type;
    this.params = params;
    this.toExecutorFormat = function(paramIds) {
        return "var " + this.identifier + " = new " + this.type + "(" +
                toParams(paramIds) + ");";
    };
    this.toUnitTestFormat = function(paramIds) {
        return "var " + this.identifier + " = new " + this.type + "(" +
                toParams(paramIds) + ");";
    };
}

function Call(receiver, methodName, params, type) {
    this.receiver = receiver;
    this.methodName = methodName;
    this.params = params;
    this.type = type;
    this.toExecutorFormat = this.toUnitTestFormat = function(paramIds) {
        var r = receiver + "." + this.methodName;
            r += "(" + toParams(paramIds) + ");"
        return r;
    }
}

function MUTcall(receiver, methodName, params, type, number) {
    this.receiver = receiver;
    this.methodName = methodName;
    this.params = params;
    this.type = type;
    this.number = number;
    this.toExecutorFormat = function(paramIds) {
        var ret = "results[" + this.number + "] = " 
                  + receiver + ".MUT"
                  + "(" + toParams(paramIds) + ");"
        return ret;
    }
    this.toUnitTestFormat = function(paramIds, results) {
        var ret = "";
        if (results) {
            var r = results[this.number];
            result = "\"" + r + "\"";
//            if (typeof result === "string") result = "\"" + r + "\"";
//            else result = util.inspect(result, false, null);
            var assertion = this.receiver + "." + this.methodName + "(";
            assertion += toParams(paramIds) + ") === " + result;
            ret = "assert.ok(" + assertion + ")";
        }
        else {
            ret = receiver + "." + this.methodName + "(" + toParams(paramIds) + ");";
        }
        return ret;            
    }
}

exports.generate = function(pgmInfo) {
    var CUTname = pgmInfo.CUTname;
    var MUTname = pgmInfo.MUTname;

    pgmInfo.update();

    // console.log(util.inspect(pgmInfo, false, null));
    var test = new Test(MUTname);
    var ctrParams = pgmInfo.getRecursiveParams(
                        _.pluck(pgmInfo.getConstructorParams(CUTname), "inferredType"));
    var receiver = new Declaration(CUTname.toLowerCase() + _.uniqueId(), CUTname, ctrParams);
    // console.log('BEFORE PUSHING RECEIVER');
    // console.log(util.inspect(test, false, null));;
    test.push(receiver);
    // console.log('AFTER PUSHING RECEIVER');
    // console.log(util.inspect(test, false, null));;

    var callSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_CALLS_BEFORE_MUT);

    // console.log('BEFORE PUSHING CUT methods');
    // console.log(util.inspect(test, false, null));;
    var CUTmethods = pgmInfo.getMethods(CUTname);
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*CUTmethods.length);
        var CUTmethod = CUTmethods[randomMethod];
        if (CUTmethod.isMUT) {
            // test.MUTcalls used to collect results inside the vm environment
            test.push(new MUTcall(receiver.identifier, CUTmethod.name,
                                  pgmInfo.getRecursiveParams(_.pluck(CUTmethod.params, "inferredType")),
                                  CUTname, test.MUTcalls++));
        } else {
            test.push(new Call(receiver.identifier, CUTmethod.name,
                               pgmInfo.getRecursiveParams(_.pluck(CUTmethod.params,"inferredType")),
                               CUTname));
        }
    }
    // console.log('AFTER PUSHING CUT methods');
    // console.log(util.inspect(test, false, null));;

    // console.log('BEFORE PUSHING last MUT');
    // console.log(util.inspect(test, false, null));;
    var MUT = _.filter(CUTmethods, function(x){return x.isMUT})[0];
    test.push(new MUTcall(receiver.identifier, MUT.name,
                          pgmInfo.getRecursiveParams(_.pluck(MUT.params, "inferredType")),
                          CUTname, test.MUTcalls++));
    // console.log('AFTER PUSHING last MUT');
    // console.log(util.inspect(test, false, null));;
    return test;
}


// AUXILLIARY


function isPrimitive(type) {
    return type === "num" || type === "string" || type === "bool";
}

function isUnknown(type) { return type === "unknown"; }

function toParams(paramIds) {
    var r = "";
    for (var i = 0; i<paramIds.length; ++i) {
        r += paramIds[i];
        if(i < paramIds.length-1) r += ",";
    }
    return r;
}