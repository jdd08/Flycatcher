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

Test.prototype.toUnitTestFormat = function(result,testIndex,className,methodName) {
    var test = [];
    test[0] = "// Test #" + testIndex;
    for (var i = 0; i<this.stack.length; ++i) {
        var testElement = this.stack[i];
        test[i+1] = testElement.elem.toUnitTestFormat(testElement.identifiers,result);
    }
    return test.join('\n');
}

function CutDeclaration(className,params,id) {
    this.className = className;
    this.params = params;
    this.id = id;
    this.identifier = className.toLowerCase() + id;
    this.toExecutorFormat = function(identifiers) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        var ret = "var " + this.identifier + " = new " + this.className
                         + "(" + toParams(identifiers) + ");";
        return ret;
    }
    this.toUnitTestFormat = function(identifiers) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        var ret = "var " + this.identifier + " = new " + this.className
                         + "(" + toParams(identifiers) + ");";
        return ret;
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Declaration(className,params,identifier,index,parentType,parentMethod) {
    this.className = className;
    this.params = params;
    this.identifier = identifier;
    this.parentType = parentType;
    this.parentMethod = parentMethod;
    this.toExecutorFormat = function(ids) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        var type = this.className === "Unknown" ? "Object" : this.className;
        var ret = "var " + this.identifier + " = proxy"
                         + "(new " +type+ executorParams(this.params,ids,parentType,parentMethod,index,className) + ");";
        return ret;
    }
    this.toUnitTestFormat = function(ids) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        var type = this.className === "Unknown" ? "Object" : this.className;
        var ret = "var " + this.identifier + " = new " +type;
            ret += "(" + toParams(ids) + ");";
        return ret;
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function NumberDeclaration(className,params,identifier,index,parentType,parentMethod,num) {
    this.className = className;
    this.params = params;
    this.identifier = identifier;
    this.parentType = parentType;
    this.parentMethod = parentMethod;
    this.toExecutorFormat = function(ids) {
        var type = this.className === "Unknown" ? "Object" : this.className;
        var ret = "var " + this.identifier + " = " + num + ";";
        return ret;
    }
    this.toUnitTestFormat = function(ids) {
        var type = this.className === "Unknown" ? "Object" : this.className;
        var ret = "var " + this.identifier + " = " + num + ";";
        return ret;
    }

    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Call(instanceIdentifier,methodName,params,className) {
    this.instanceIdentifier = instanceIdentifier;
    this.methodName = methodName;
    this.className = className;
    this.params = params;
    this.toExecutorFormat = function(ids) {
        var ret = instanceIdentifier + "." + this.methodName
                  + "(" + toParams(ids) + ");"
        return ret;
    }
    this.toUnitTestFormat = function(ids) {
        var ret = instanceIdentifier + "." + this.methodName
                  + "(" + toParams(ids) + ");"
        return ret;
    }
}

function Mut(instanceIdentifier,methodName,params,className) {
    this.instanceIdentifier = instanceIdentifier;
    this.methodName = methodName;
    this.className = className;
    this.params = params;
    this.toExecutorFormat = function(identifiers) {
        var ret = instanceIdentifier + ".MUT"
                  + "(" + toParams(identifiers) + ");"
        return ret;
    }
    this.toUnitTestFormat = function(identifiers,result) {        
        if (typeof result === "string") result = "\"" + result + "\"";
        var assertion = instanceIdentifier + "." + this.methodName + "(";
        assertion += toParams(identifiers) + ") === " + result;
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

function executorParams(params,ids,parentType,parentMethod,index,className) {
    var ret = "(" + toParams(ids) + "),";
    ret += "\"" + parentType + "\",\"" + parentMethod + "\"," + index;
    return ret;
}

function Test() {
    this.unknowns = false;
    this.stack = [];
}

Test.prototype.hasUnknowns = function() {
    return this.unknowns;
}

Test.prototype.push = function(elem,paramTable,key) {
    if(elem.className === "Unknown") {
        this.unknowns = true;
    }
    var params = elem.params;
    var ids = [];
    var identifiers = [];
    var numbers = [];
    var decls = [];
    var first = paramTable === undefined;
    var keyExists = false;
    if(first) {
        paramTable = [];
    }
    else {
        // the way the test stack works, whenever a statement
        // is pushed, statements for *its* parameters are immediately
        //  dealt with, so we need to keep track of whether we have
        // starte dealing with a statement or not, if we have, then
        // we can potentially use previous parameters within the
        // statement for the parameter at hand
        if(paramTable[key]) {
            keyExists = true;
        }
        else {
            paramTable[key] = [];
        }
    }
    for(var p = 0; p<params.length; ++p) {
        var type = params[p].name;
        if (!isPrimitive(type)) {
            var id;
            if (keyExists) {
                id = paramTable[key][p];
            }
            else {
                var length = ids.length;
                var reuseExisting = length && Math.random() > 0.75;
                if (reuseExisting) {
                    var r = Math.floor(Math.random()*length);
                    var id = ids[r];
                }
                else {
                    id = _.uniqueId();
                }            
            }
            var identifier = type.toLowerCase() + id  + "_" + p;
            identifiers.push(identifier);
            ids.push(id);
            if(!first) {
                paramTable[key].push(id);
            }
            if (elem instanceof Call || elem instanceof Mut) {
                this.push(new Declaration(type,params[p].params,identifier,p,elem.className,elem.methodName),paramTable,id);            
            }
            else {
                this.push(new Declaration(type,params[p].params,identifier,p,elem.className,elem.className),paramTable,id);            
            }
        }
        else {
            var num;
            if (keyExists) {
                num = paramTable[key][p];
            }
            else {
                var length = ids.length;
                var reuseExisting = length && Math.random() > 0.75;
                if (reuseExisting) {
                    var r = Math.floor(Math.random()*length);
                    var num = ids[r];
                }
                else {
                    num = randomData.getNumber();
                }
            }
            // when the parameter is of type Number, the number
            // itself becomes the identifier
            identifiers.push(num);
            if(!first) {
                paramTable[key].push(num);
            }
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

    //console.log()
    //t.show();
    
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