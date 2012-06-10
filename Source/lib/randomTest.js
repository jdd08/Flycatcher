var randomData = require('./randomData.js');
var _ = require('underscore');
var util = require('util');
var beautify = require('beautify').js_beautify;
var colors = require('colors');

function Test(MUTname) {
    this.unknowns = false;
    this.MUTname = MUTname;
    this.stack = [];
    this.pool = {};
    this.MUTcalls = 0;
}

Test.prototype.push = function(statement) {
    var parentId = statement.identifier;
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
                paramId = randomData.get(paramType);
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
                  + receiver + "." + this.methodName
                  + "(" + toParams(paramIds) + ");"
        return ret;
    }
    this.toUnitTestFormat = function(paramIds, results) {

                var ret = "";
                if (results) {
                    var result = results[this.number];
        //            result = "\"" + r + "\"";
//        console.log(typeof result);
//                if (typeof result === "string") result = "\"" + result + "\"";
        //            else result = util.inspect(result, false, null);
                    var assertOp = typeof result === "object" ? "deepEqual" : "equal"
                    var assertion = this.receiver + "." + this.methodName + "(";
                    assertion += toParams(paramIds) + "), " + beautify(util.inspect(result, false, null));
                    ret = "assert." + assertOp + "(" + assertion + ")";
                }
                else {
                    ret = receiver + "." + this.methodName + "(" + toParams(paramIds) + ");";
                }
        return ret;
    }
}

exports.generate = function(pgmInfo) {
    var CUTname = pgmInfo.CUTname;
    var MUTname = pgmInfo.MUT.name;

    pgmInfo.makeInferences();

    var test = new Test(MUTname);
    var ctrParams = pgmInfo.getConstructorParams(CUTname);
    
    // FIXME: updating usage counters this way only updates it for the ctr
    // params but not for the params of the other ctr that this ctr provokes
    // the call of through pushes on the stack
    updateUsageCounters(ctrParams);
    var receiver = new Declaration(CUTname.toLowerCase() + _.uniqueId(), CUTname,
        pgmInfo.getRecursiveParams(_.pluck(ctrParams, "inferredType")));
    test.push(receiver);

    var callSequence = [];
    // -1 because MUT is added at the end
    randomSequenceLength = Math.ceil(Math.random()*pgmInfo.sequenceSize-1);
    var CUTmethods = pgmInfo.getMethods(CUTname);
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*CUTmethods.length);
        var CUTmethod = CUTmethods[randomMethod];

        updateUsageCounters(CUTmethod.params);
        if (CUTmethod === pgmInfo.MUT) {
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
    var MUT = pgmInfo.MUT;
    updateUsageCounters(MUT.params);
    test.push(new MUTcall(receiver.identifier, MUT.name,
                          pgmInfo.getRecursiveParams(_.pluck(MUT.params, "inferredType")),
                          CUTname, test.MUTcalls++));
    return test;
}

function updateUsageCounters(params) {
    _.forEach(params, function(param) {
        param.usageCounter++;
    });
}

// AUXILLIARY


function isPrimitive(type) {
    return type === "number" || type === "string" || type === "bool";
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