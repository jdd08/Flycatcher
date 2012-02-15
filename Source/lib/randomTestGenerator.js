var randomDataGenerator = require('./randomDataGenerator.js');
var dump = require('./utils').dump;
var _ = require('underscore');

Test.prototype.toExecutorFormat = function() {
    return this.stack.join('\n');
}

Test.prototype.toUnitTestFormat = function(result) {
    var test = this.stack.slice(0,-1).join('\n');
    test += "\nassert(" + this.stack.slice(-1) + " === " + result + ");";
    return test;
}

function Declaration(className,params,id) {
    this.className = className;
    this.params = params;
    this.id = id;
    this.identifier = className.toLowerCase() + id;
    this.translate = function(ids) {
        var ret = "var " + this.identifier + " = new " + this.className
                      + "(" + translateParams(this.params,ids) + ");"
        return ret;
    }
    this.getIdentifier = function() {
        return this.identifier;
    }
}

function Call(instanceIdentifier,methodName,params) {
    this.instanceIdentifier = instanceIdentifier;
    this.methodName = methodName;
    this.params = params;
    this.translate = function(ids) {
        var ret = instanceIdentifier + "." + this.methodName
                  + "(" + translateParams(this.params,ids) + ");"
        return ret;
    }
}

function Mut(instanceIdentifier,methodName,params) {
    this.instanceIdentifier = instanceIdentifier;
    this.methodName = methodName;
    this.params = params;
    this.translate = function(ids) {
        var ret = instanceIdentifier + ".MUT"
                  + "(" + translateParams(this.params,ids) + ")"
        return ret;
    }
}

function translateParams(params,ids) {
    var ret = "";
    for (var i in params) {
        var p = params[i];
        ret += p.name.toLowerCase();
        ret += ids[i];
        if(i < params.length-1) {
            ret += ","
        }
    }
    return ret;
}

function Test() {
    this.stack = [];
}

Test.prototype.push = function(elem,isMut) {
    var params = elem.params;
    var ids = [];
    for(var p in params) {
        var id = _.uniqueId();
        ids.push(id);
        this.push(new Declaration(params[p].name,params[p].params,id));
    }
    this.stack.push(elem.translate(ids));
}

Test.prototype.show = function() {
    console.log(this.stack)
}

exports.generate = function(classes,className,index) {
    //dump(classes,"f");

    var classInfo = classes[className];
    MAX_SEQUENCE_LENGTH = 10;

    
    var parameters = randomDataGenerator.generate(classes,classInfo.ctr.params);

    var t = new Test();

    var instance = new Declaration(classInfo.name,parameters,_.uniqueId());
    t.push(instance);

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
                            randomDataGenerator.generate(classes,method.params));
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
                       randomDataGenerator.generate(classes,mutParams));
    t.push(mut);
    return t;
}