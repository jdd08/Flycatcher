var randomData = require('./randomData.js');
var _ = require('underscore');
var beautify = require('./beautify-js/beautify.js');
var util = require('util');

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

function CutDeclaration(type, params, id) {
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

function Declaration(type,params,identifier,parentType,parentMethod,index,id,reuse) {
    this.reuse = reuse;
    this.type = type;
    this.params = params;
    this.identifier = identifier;
    this.id = id;
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
    console.log(elem)
    var elemType = elem.type;
    var elemId = elem.id;
    var reusing = elem.reuse;
    if(elemType === "Unknown") {
        this.unknowns = true;
    }
    var params = elem.params;
//    console.log(util.inspect(params, false, null));
    var identifiers = [];
    var numbers = [];
    
    if (!this.pool[elemType]) this.pool[elemType] = {};
    if (!this.pool[elemType][elemId] || this.pool[elemType][elemId].length == 0) {
        this.pool[elemType][elemId] = [];
    }    

    console.log(this.pool)    
    for(var p = 0; p<params.length; ++p) {
        console.log(p)
        var paramType = params[p].name;
//        console.log(util.inspect(paramType, false, null));
//        console.log("pool",this.pool);

        if (!this.pool[paramType]) this.pool[paramType] = {};

        // when the parameter is of type Number, the number
        // itself becomes the identifier
        var id;
        
        // we can only decide to reuse a param if it is not already
        // predetermined by the reuse of the parent (elem)
        var reuseParam = false;
        // parent is in the pool, we need to use predefined args
        if(reusing && elem.id){ // checking if not a call
            console.log("this.pool[elemType]",this.pool[elemType])
            console.log(elemId)
            console.log(p)
            id = this.pool[elemType][elemId][p];
        }
        else {
            var keys = Object.keys(this.pool[paramType]);
            // if not already reusing this parameter by default because
            // we are reusing the parent, we can decide to reuse the
            // parameter only
            var length = keys.length;
            var reusingParam = length && Math.random() > 0.75;
            if (reusingParam) {
                id = keys[Math.floor(Math.random()*length)]-0;
                console.log("reusing")
                console.log(id)
                if(elemId) this.pool[elemType][elemId].push(id); // checking if not call
            }
            else {
                if (!isPrimitive(paramType)) id = _.uniqueId();
                else id = randomData.getNumber();
//                var idStr = Number(id).toString();
                this.pool[paramType][id] = [];
                this.pool[elemType][elemId].push(id);
            }
        }
//        console.log(paramType+"Pool",pool);
//        console.log()
        var identifier = !isPrimitive(paramType) ?
                         paramType.toLowerCase() + id + "_" + p: id;
        identifiers.push(identifier);

/*      if (!pool[id]) pool[id] = [];
        else pool[id].push
        pool[elemType]
*/
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
                                      p,
                                      id,reusingParam || reusing));
        }
    }
    //console.log(util.inspect({elem:elem,identifiers:identifiers}, false, null));
    this.stack.push({elem:elem,identifiers:identifiers});
}

Test.prototype.show = function() {
//    console.log(this.stack)
}

exports.generate = function(classes,CUTname,index) {
    var CUTinfo = classes[CUTname];
    MAX_SEQUENCE_LENGTH = 15;
    var inferredParams = randomData.inferTypes(classes,CUTinfo.ctr.params);
    var t = new Test();    
    var instance = new CutDeclaration(CUTname,inferredParams,_.uniqueId());
    t.push(instance);
//    console.log(util.inspect(t, false, null));
    console.log(t.toExecutorFormat())
//    process.exit(0);
    var callSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_SEQUENCE_LENGTH);
    if (CUTinfo.methods.length > 1) {
        for (var j = 0; j<randomSequenceLength;j++) {
            var randomMethod = Math.floor(Math.random()*CUTinfo.methods.length);

            // TODO: if index is 0 initially FAILS IF CLASS UNDER TEST HAS NO METHODS
            while ((index && randomMethod === index) || CUTinfo.methods[randomMethod].mut) {
                randomMethod = Math.floor(Math.random()*CUTinfo.methods.length);
            }
            var method = CUTinfo.methods[randomMethod];
            var call = new Call(instance.getIdentifier(),
                                method.name,
                                randomData.inferTypes(classes,method.params),
                                CUTname);
            t.push(call);
        }
    }

    var mutParams = {};
    var MUTname = "";
    if (index) {
        MUTname = CUTinfo.methods[index].name;
        mutParams = CUTinfo.methods[index].params;
    }
    else {
        var mut_ = CUTinfo.methods.filter(function(x){return x.mut})[0];
        MUTname = mut_.name;
        mutParams = mut_.params;
    }
    var mut = new Mut(instance.getIdentifier(),
                      MUTname,
                      randomData.inferTypes(classes,mutParams),
                      CUTname);
    t.push(mut);
    return t;
}