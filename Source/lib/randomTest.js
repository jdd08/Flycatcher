var randomData = require('./randomData.js');
var dump = require('./utils').dump;
var _ = require('underscore');
var beautify = require('./beautify-js/beautify.js');

Test.prototype.toExecutorFormat = function() {
    return this.stack.join('\n');
}

Test.prototype.toUnitTestFormat = function(result,mut) {
    var test = this.stack.slice(0,-1).join('\n');
    test += "\nassert(" + (this.stack.slice(-1)).toString().replace(/MUT/,mut) 
                        + " === " + result + ");";
    return beautify.js_beautify(test);
}

function CutDeclaration(className,params,id) {
    this.className = className;
    this.params = params;
    this.id = id;
    this.identifier = className.toLowerCase() + id;
    this.translate = function(ids) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        var ret = "var " + this.identifier + " = new " + this.className
                         + "(" + translateParamsCut(this.params,ids,this.className,this.className) + ");";
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
    this.translate = function(ids) {
        
        // the CUT might need a different proxying, however it doesn't need proxying
        // for catching erroneous method calls (all its methods are known from the analyser
        // and called specifically)
        
        /*var ret = "var " + this.identifier + "tmp = new " + this.className
                         + "(" + translateParams(this.params,ids,this.className) + ");\n";
        ret += "var " + this.identifier + " = Proxy.create(new Handler(\"";
        ret += this.className + "\",\"" + this.className +"\"))";*/
        //var ret = "var " + this.identifier + " =     get" + type + "(\"" + className + "\",\"" + methodName + "\"," + i + "))";
        //return ret;
//        console.log("params",this.params)
        var type = this.className === "Unknown" ? "Object" : this.className;
        var ret = "var " + this.identifier + " = proxy"
                         + "(new " +type+ translateParams(this.params,ids,parentType,parentMethod,index,className) + ");";
        return ret;
        
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function NumberDeclaration(className,params,identifier,index,parentType,parentMethod) {
    this.className = className;
    this.params = params;
    this.identifier = identifier;
    this.parentType = parentType;
    this.parentMethod = parentMethod;
    this.translate = function(ids) {

        var type = this.className === "Unknown" ? "Object" : this.className;
        var ret = "var " + this.identifier + " = " + + ";";
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
    this.translate = function(ids) {
        var ret = instanceIdentifier + "." + this.methodName
                  + "(" + translateParamsCut(this.params,ids,className,this.methodName) + ");"
        return ret;
    }
}

function Mut(instanceIdentifier,methodName,params,className) {
    this.instanceIdentifier = instanceIdentifier;
    this.methodName = methodName;
    this.className = className;
    this.params = params;
    this.translate = function(ids) {
        // semi-colon left out on purpose for the assert statement
        var ret = instanceIdentifier + ".MUT"
                  + "(" + translateParamsCut(this.params,ids,className,methodName) + ")"
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

function translateParamsCut(params,ids,className,methodName) {
    var ret = "";
    for (var i in params) {
        var p = params[i];
        var type = p.name;
        if(isPrimitive(type)) {
            ret += ids[i];
        }
        else if (type === "Unknown") {
            ret += ids[i];
        }
        else {
            ret += ids[i];
        }
        if(i < params.length-1) {
            ret += ",";
        }
    }
    return ret;
}

function translateParams(params,ids,parentType,parentMethod,index,className) {
    var ret = "(";
    for (var i in params) {
        var p = params[i];
        var type = p.name;
        if(isPrimitive(type)) {
            ret += ids[i];
        }
        else if (type === "Unknown") {
            ret += ids[i];
        }
        else {
            ret += ids[i];
        }
        if(i < params.length-1) {
            ret += ",";
        }
    }
    ret += "),\"" + parentType + "\",\"" + parentMethod + "\"," + index;
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
    if(elem instanceof Declaration && elem.className === "Unknown") {
        this.unknowns = true;
    }
    
    // TODO store a unique number in the table instead of an id
    // when the type is a Number so that it can be re-used
    if (!(elem instanceof NumberDeclaration)) {
        var params = elem.params;
        var ids = [];
        var identifiers = [];
        var decls = [];
        var first = paramTable === undefined;
        var reuse = false;
        if(first) {
            paramTable = [];
        }
        else {
            if(paramTable[key]) {
                reuse = true;
            }
            else {
                paramTable[key] = [];
            }
        }
        for(var p = 0; p<params.length; ++p) {
            var id;
            if (reuse) {
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
            var type = params[p].name;
            var identifier = type.toLowerCase() + id  + "_" + p;
            identifiers.push(identifier);
            ids.push(id);
            if(!first) {
                paramTable[key].push(id);
            }
            if (!isPrimitive(type)) {
                if (elem instanceof Call || elem instanceof Mut) {
                    this.push(new Declaration(type,params[p].params,identifier,p,elem.className,elem.methodName),paramTable,id);            
                }
                else {
                    this.push(new Declaration(type,params[p].params,identifier,p,elem.className,elem.className),paramTable,id);            
                }
            }
            else {
                if (elem instanceof Call || elem instanceof Mut) {
                    this.push(new NumberDeclaration(type,params[p].params,identifier,p,elem.className,elem.className),paramTable,id);
                }
                else {
                    this.push(new NumberDeclaration(type,params[p].params,identifier,p,elem.className,elem.className),paramTable,id);
                }
            }
        }
    }
    this.stack.push(elem.translate(identifiers));
}

Test.prototype.show = function() {
    console.log(this.stack)
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