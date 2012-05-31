var randomData = require('./randomData.js');
var _ = require('underscore');
var util = require('util');

Test.prototype.toExecutorFormat = function() {
    var test = [];
    test.push("(function (){");
    test.push("var results = [];")
    for (var i = 0; i<this.stack.length; ++i) {
        var e = this.stack[i];
        test.push(e.elem.toExecutorFormat(e.paramIds));
    }
    test.push("return results;})();")
    return test.join('\n');
}

Test.prototype.toUnitTestFormat = function(results, testIndex) {
    var test = [];
    test.push("// Method " + this.MUTname + " under test: test #" + testIndex);
    for (var i = 0; i<this.stack.length; ++i) {
        var testElement = this.stack[i];
        test.push(
            testElement.elem.toUnitTestFormat(testElement.paramIds, results));
    }
    return test.join('\n');
}

Test.prototype.toFailingTestFormat = function(msg) {
    var test = [];
    test.push("// Method " + this.MUTname + " under test");
    for (var i = 0; i<this.stack.length; ++i) {
        var testElement = this.stack[i];
        test.push(testElement.elem.toUnitTestFormat(testElement.paramIds));
    }
    test.push(msg);
    return test.join('\n');
}

function CUTdeclaration(type, params, id) {
    this.type = type;
    this.params = params;
    this.id = id;
    this.identifier = type.toLowerCase() + id;
    this.toExecutorFormat = function(paramIds) {
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        var ret = "var " + this.identifier + " = new " + this.type
                         + "(" + toParams(paramIds) + ");";
        return ret;
    }
    this.toUnitTestFormat = function(paramIds) {
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        var ret = "var " + this.identifier + " = new " + this.type
                         + "(" + toParams(paramIds) + ");";
        return ret;
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Declaration(type,params,identifier,parentType,parentMethod,index,id,reuse) {
    this.reuse = reuse;
    this.type = type;
    this.params = params;
    this.identifier = identifier;
    this.noproxy = identifier + "__noproxy";
    this.id = id;
    this.parentType = parentType;
    this.parentMethod = parentMethod;
    this.index = index;
    this.toExecutorFormat = function(paramIdentifiers) {
        // the CUT might need a different proxying, however it doesn't 
        // need proxying for catching erroneous method calls (all its 
        // methods are known from the analyser and called specifically)
        var type = this.type === "unknown" ? "Object" : this.type;
        var ret = "var " + this.noproxy + " = " +
                  "new " + type + "(" + toNoProxyParams(paramIdentifiers)+ ");" +
                  "var " + this.identifier + " = proxy"
                         + "(" + this.noproxy + ", new "
                         + type + toProxyParams(paramIdentifiers,
                                                 parentType,
                                                 parentMethod,
                                                 index) + ");";
        return ret;
    }
    this.toUnitTestFormat = function(paramIdentifiers) {
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        var type = this.type === "unknown" ? "Object" : this.type;
        var r = "var " + this.identifier + " = new " +type;
            r += "(" + toParams(paramIdentifiers) + ");";
        return r;
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Call(instanceIdentifier,method,params,type) {
    this.instanceIdentifier = instanceIdentifier;
    this.method = method;
    this.params = params;
    this.type = type;
    this.toExecutorFormat = this.toUnitTestFormat = function(paramIdentifiers) {
        var r = instanceIdentifier + "." + this.method;
            r += "(" + toParams(paramIdentifiers) + ");"
        return r;
    }
}

function MUTcall(number, instanceIdentifier, method, params, type) {
    this.instanceIdentifier = instanceIdentifier;
    this.method = method;
    this.type = type;
    this.params = params;
    this.number = number;
    this.toExecutorFormat = function(paramIdentifiers) {
        var ret = "results[" + this.number + "] = " 
                  + instanceIdentifier + ".MUT"
                  + "(" + toParams(paramIdentifiers) + ");"
        return ret;
    }
    this.toUnitTestFormat = function(paramIdentifiers, results) {
        var ret = "";
        if (results) {
            var r = results[this.number];
            // try and get the target in case we have a proxy
            result = r && r.__FLYCATCHER_TARGET__ ? r.__FLYCATCHER_TARGET__ : r;

            if (typeof result === "string") result = "\"" + r + "\"";
            var assertion = instanceIdentifier + "." + this.method + "(";
            assertion += toParams(paramIdentifiers) + ") === " + util.inspect(result, false, null);
            ret = "assert.ok(" + assertion + ")";
        }
        else {
            ret = instanceIdentifier + "." + this.method + "(" + toParams(paramIdentifiers) + ");";
        }
        return ret;            
    }
}


function isPrimitive(type) {
    return type === "num" ||
           type === "string" ||
           type === "bool";
}

function isUnknown(type) { return type === "unknown"; }

function isUserDefined(type) { return !isUnknown(type) && !isPrimitive(type); }

function toParams(paramIds) {
    var r = "";
    for (var i = 0; i<paramIds.length; ++i) {
        r += paramIds[i].id;
        if(i < paramIds.length-1) r += ",";
    }
    return r;
}

function toNoProxyParams(paramIds) {
    var r = "";
    for (var i = 0; i<paramIds.length; ++i) {
        var p = paramIds[i];
        r += p.primitive ? p.id : p.id + "__noproxy";
        if(i < paramIds.length-1) r += ",";
    }
    return r;
}

function toProxyParams(ids,parentType,parentMethod,index) {
    var ret = "(" + toParams(ids) + "),";
    ret += "\"" + parentType + "\",\"" + parentMethod + "\"," + index;
    return ret;
}

function Test(MUTname) {
    this.unknowns = false;
    this.MUTname = MUTname;
    this.stack = [];
    this.pool = {};
    this.MUTcalls = 0;
}

Test.prototype.hasUnknowns = function() {
    return this.unknowns;
}

Test.prototype.push = function(elem) {
    var isDecl = elem instanceof Declaration ||
                 elem instanceof CUTdeclaration;
    var elemType = elem.type;
    var elemId = elem.id;
    var reusingParent = elem.reuse;
    if(elemType === "unknown") {
        this.unknowns = true;
    }
    var params = elem.params;
    var paramIds = [];
    
    if (isDecl) {
        this.pool[elemType] = this.pool[elemType] || {};
        this.pool[elemType][elemId] = this.pool[elemType][elemId] || [];
    }  

    //console.log(this.pool);
    for(var p = 0; p<params.length; ++p) {
        
        var paramType = params[p].name;
        this.pool[paramType] = this.pool[paramType] || {};

        // we can only decide to reuse a param if it is not already
        // predetermined by the reuse of the parent
        var reusingParam = false;

        var id;
        // parent is from the pool, we need to use a predefined param
        if(reusingParent){
            id = this.pool[elemType][elemId][p];
        }
        else {
            // if not already reusing this parameter by default because
            // we are reusing the parent, we can decide to reuse the
            // parameter only
            var keys = Object.keys(this.pool[paramType]);
            var length = keys.length;
            reusingParam = length && Math.random() > 0.75;
            if (reusingParam) {
                id = keys[Math.floor(Math.random()*length)];
            }
            else {
                // when the parameter is of type Number, the number
                // itself becomes the identifier
                if (!isPrimitive(paramType)) id = _.uniqueId();
                else id = randomData.getPrimitive(paramType);
                // id for the current param is new so *its* parameter array
                // in the pool needs to be initialised
                this.pool[paramType][id] = [];
            }
            // we need to update the parameter array of the parent type
            // with the id of the current param (whether it reuses another
            // of *its* type or not) so that we can recreate the parent type if needed
            if(isDecl) this.pool[elemType][elemId].push(id);
        }
        
        // TODO: regroup identifier generation
        
        // we need to know whether the param id is a primitive
        // or not so as not to suffix 'noproxy' onto a primtiive
        // when creating/passing the non-proxy targets
        var paramIdNoProxyFlag = !isPrimitive(paramType) ?
                       {id : (paramType.toLowerCase() + id + "_" + p),
                        primitive : false} :
                       {id : id,
                        primitive : true};

        paramIds.push(paramIdNoProxyFlag);

        var paramId = paramIdNoProxyFlag.id;        
        if (!isPrimitive(paramType)) {
            var method;
            if (isDecl) {
                // this refers to the constructor whose name is the type
                method = elemType;
            }
            else {
                method = elem.method;
            }
            this.push(new Declaration(paramType, params[p].params,
                                      paramId, elemType, method,
                                      p, id, reusingParam || reusingParent));
        }
    }
    this.stack.push({elem:elem,paramIds:paramIds});
}

// maximum number of CUT method calls before calling the MUT
var MAX_CALLS_BEFORE_MUT = 10;

exports.generate = function(pgmInfo) {
    var CUTname = pgmInfo.CUTname;
    var MUTname = pgmInfo.MUTname;

    pgmInfo.update();

    var test = new Test(MUTname);
    var ctrParams = pgmInfo.getConstructorParams(CUTname);
    var instance = new CUTdeclaration(CUTname,
                                      pgmInfo.getRecursiveParams(
                                          _.pluck(ctrParams, "inferredType")),
                                      _.uniqueId());
    test.push(instance);
    var callSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_CALLS_BEFORE_MUT);

    var CUTmethods = pgmInfo.getMethods(CUTname);
    var MUTcallNumber = 0;
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*CUTmethods.length);
        var CUTmethod = CUTmethods[randomMethod];
        if (CUTmethod.isMUT) {
            // MUTcalls and MUTcallNumber are used to create and collect
            // results in an object inside the vm environment
            test.MUTcalls++;
            test.push(new MUTcall(MUTcallNumber++, instance.getIdentifier(), CUTmethod.name,
                pgmInfo.getRecursiveParams(_.pluck(CUTmethod.params, "inferredType")), CUTname));
        } else {
            test.push(new Call(instance.getIdentifier(), CUTmethod.name,
                pgmInfo.getRecursiveParams(_.pluck(CUTmethod.params,"inferredType")), CUTname));
        }
    }
    var MUT = _.filter(CUTmethods, function(x){return x.isMUT})[0];
    test.push(new MUTcall(MUTcallNumber++, instance.getIdentifier(), MUT.name,
        pgmInfo.getRecursiveParams(_.pluck(MUT.params, "inferredType")), CUTname));
    return test;
}