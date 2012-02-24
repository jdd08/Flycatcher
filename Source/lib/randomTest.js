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
                         + "(" + translateParams(this.params,ids,this.className,this.className) + ");\n";
        return ret;
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Declaration(className,params,id) {
    this.className = className;
    this.params = params;
    this.id = id;
    this.identifier = className.toLowerCase() + id;
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
        console.log("params",this.params)
        var ret = "var " + this.identifier + " = new " + this.className
                         + "(" + translateParams(this.params,ids,this.className,this.className) + ");\n";
        return ret;
        
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Call(instanceIdentifier,methodName,params,className) {
    this.instanceIdentifier = instanceIdentifier;
    this.methodName = methodName;
    this.params = params;
    this.translate = function(ids) {
        var ret = instanceIdentifier + "." + this.methodName
                  + "(" + translateParams(this.params,ids,className,this.methodName) + ");"
        return ret;
    }
}

function Mut(instanceIdentifier,methodName,params,className) {
    this.instanceIdentifier = instanceIdentifier;
    this.methodName = methodName;
    this.params = params;
    this.translate = function(ids) {
        // semi-colon left out on purpose for the assert statement
        var ret = instanceIdentifier + ".MUT"
                  + "(" + translateParams(this.params,ids,className,methodName) + ")"
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

function translateParams(params,ids,className,methodName) {
    var ret = "";
    for (var i in params) {
        var p = params[i];
        var type = p.name;
        if(isPrimitive(type)) {
            ret += "123";
        }
        else if (type === "Unknown") {
            ret += p.name.toLowerCase() + ids[i];
            /*ret += "Proxy.create(new Handler(\"" 
            ret += className + "\",\"" + methodName + "\"," + i + "))";*/
        }
        else {
            ret += p.name.toLowerCase() + ids[i];
        }
        if(i < params.length-1) {
            ret += ","
        }
    }
    return ret;
}

function Test() {
    this.stack = [];
}

Test.prototype.push = function(elem) {
    var params = elem.params;
    var ids = [];
    for(var p in params) {
        var id = _.uniqueId();
        ids.push(id);
        var type = params[p].name;
//        if(isUserDefined(type)) {
            this.push(new Declaration(type,params[p].params,id));   
//       }
    }
    this.stack.push(elem.translate(ids));
}

Test.prototype.show = function() {
    console.log(this.stack)
}

exports.generate = function(classes,className,index) {
    var classInfo = classes[className];
    MAX_SEQUENCE_LENGTH = 10;
    
    var parameters = randomData.inferTypes(classes,classInfo.ctr.params);
    var t = new Test();
    var instance = new CutDeclaration(className,parameters,_.uniqueId());
    
    t.push(instance);
    //console.log()
    //t.show();
    
    var callSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_SEQUENCE_LENGTH);
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*classInfo.methods.length);
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