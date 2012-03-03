var randomData = require('./randomData.js');
var dump = require('./utils').dump;
var _ = require('underscore');
var beautify = require('./beautify-js/beautify.js');

Test.prototype.toExecutorFormat = function() {
    var test = [];
    for (var i = 0; i<this.stack.length; ++i) {
        var e = this.stack[i];
        test[i] = e.elem.toExecutorFormat(e.identifiers);
    }
    return test.join('\n');
}

Test.prototype.toUnitTestFormat = function(result,testIndex) {
    var test = [];
    test[0] = "// Test #" + testIndex;
    for (var i = 0; i<this.stack.length; ++i) {
        var testElement = this.stack[i];
        test[i+1] = testElement.elem.toUnitTestFormat(testElement.identifiers,result);
    }
    return test.join('\n');
}

function CutDeclaration(type,params,id) {
    this.type = type;
    this.params = params;
    this.id = id;
    this.identifier = type.toLowerCase() + id;
    this.toExecutorFormat = function(identifiers) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        var ret = "var " + this.identifier + " = new " + this.type
                         + "(" + toParams(identifiers) + ");";
        return ret;
    }
    this.toUnitTestFormat = function(identifiers) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        var ret = "var " + this.identifier + " = new " + this.type
                         + "(" + toParams(identifiers) + ");";
        return ret;
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Declaration(type,params,identifier,parentType,parentMethod,index) {
    this.type = type;
    this.params = params;
    this.identifier = identifier;
    this.parentType = parentType;
    this.parentMethod = parentMethod;
    this.index = index;
    this.toExecutorFormat = function(paramIdentifiers) {
        
        // the CUT might need a different proxying, however it doesn't 
        // need proxying for catching erroneous method calls (all its 
        // methods are known from the analyser and called specifically)
        var type = this.type === "Unknown" ? "Object" : this.type;
        var ret = "var " + this.identifier + " = proxy"
                         + "(new " +type+ executorParams(paramIdentifiers,
                                                         parentType,
                                                         parentMethod,
                                                         index) + ");";
        return ret;
    }
    this.toUnitTestFormat = function(paramIdentifiers) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        var type = this.type === "Unknown" ? "Object" : this.type;
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

function Mut(instanceIdentifier,method,params,type) {
    this.instanceIdentifier = instanceIdentifier;
    this.method = method;
    this.type = type;
    this.params = params;
    this.toExecutorFormat = function(paramIdentifiers) {
        var ret = instanceIdentifier + ".MUT"
                  + "(" + toParams(paramIdentifiers) + ");"
        return ret;
    }
    this.toUnitTestFormat = function(paramIdentifiers,result) {        
        if (typeof result === "string") result = "\"" + result + "\"";
        var assertion = instanceIdentifier + "." + this.method + "(";
        assertion += toParams(paramIdentifiers) + ") === " + result;
        var ret = "assert.ok(" + assertion + ",\n         \'" + assertion + "\');";
        return ret;
    }
}


function isPrimitive(type) {
    return type === "Number" ||
           type === "String" ||
           type === "Boolean";
}

function isUnknown(type) { return type === "Unknown"; }

function isUserDefined(type) { return !isUnknown(type) && !isPrimitive(type); }

function toParams(identifiers) {
    var r = "";
    for (var i = 0; i<identifiers.length; ++i) {
        r += identifiers[i];
        if(i < identifiers.length-1) r += ",";
    }
    return r;
}

function executorParams(ids,parentType,parentMethod,index) {
    var ret = "(" + toParams(ids) + "),";
    ret += "\"" + parentType + "\",\"" + parentMethod + "\"," + index;
    return ret;
}

function Test() {
    this.unknowns = false;
    this.stack = [];
    this.pool = {};
}

Test.prototype.hasUnknowns = function() {
    return this.unknowns;
}

Test.prototype.push = function(elem) {
    var elemType = elem.type;
    if(elemType === "Unknown") {
        this.unknowns = true;
    }
    var params = elem.params;
    var identifiers = [];
    var numbers = [];
    for(var p = 0; p<params.length; ++p) {
        var paramType = params[p].name;
        
        if (!this.pool[paramType]) this.pool[paramType] = [];
        var pool = this.pool[paramType];

        // when the parameter is of type Number, the number
        // itself becomes the identifier
        var id;
        var length = pool.length;
        var reuseExisting = length && Math.random() > 0.75;
        if (reuseExisting) {
            id = pool[Math.floor(Math.random()*length)];
        }
        else {
            if (!isPrimitive(paramType)) id = _.uniqueId();
            else id = randomData.getNumber();
        }
        var identifier = !isPrimitive(paramType) ? 
                         paramType.toLowerCase() + id + "_" + p: id;
        identifiers.push(identifier);
        if (!pool[id]) pool[id] = [];
        else pool[id].push
        pool[elemType]
        if (!isPrimitive(paramType)) {
            var method;
            if (elem instanceof Call || elem instanceof Mut) {
                method = elem.method;
            }
            else {
                // this refers to the constructor whose name is the type
                method = elemType;
            }
            this.push(new Declaration(paramType,
                                      params[p].params,
                                      identifier,
                                      elemType,
                                      method,
                                      p));
        }
    }
    this.stack.push({elem:elem,identifiers:identifiers});
}

Test.prototype.show = function() {
//    console.log(this.stack)
}

exports.generate = function(classes,className,index) {
    var classInfo = classes[className];
    MAX_SEQUENCE_LENGTH = 5;
    var parameters = randomData.inferTypes(classes,classInfo.ctr.params);
    var t = new Test();    
    var instance = new CutDeclaration(className,parameters,_.uniqueId());
    t.push(instance);
    
    var callSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_SEQUENCE_LENGTH);
    if (classInfo.methods.length > 1) {
        for (var j = 0; j<randomSequenceLength;j++) {
            var randomMethod = Math.floor(Math.random()*classInfo.methods.length);

            // TODO: if index is 0 initially FAILS IF CLASS UNDER TEST HAS NO METHODS
            while ((index && randomMethod === index) || classInfo.methods[randomMethod].mut) {
                randomMethod = Math.floor(Math.random()*classInfo.methods.length);
            }
            var method = classInfo.methods[randomMethod];
            var call = new Call(instance.getIdentifier(),
                                method.name,
                                randomData.inferTypes(classes,method.params),
                                className);
            t.push(call);
        }
    }

    var mutParams = {};
    var mutName = "";
    if (index) {
        mutName = classInfo.methods[index].name;
        mutParams = classInfo.methods[index].params;
    }
    else {
        var mut_ = classInfo.methods.filter(function(x){return x.mut})[0];
        mutName = mut_.name;
        mutParams = mut_.params;
    }
    var mut = new Mut(instance.getIdentifier(),
                      mutName,
                      randomData.inferTypes(classes,mutParams),
                      className);
    t.push(mut);
    return t;
}