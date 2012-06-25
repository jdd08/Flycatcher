var fs = require('fs');
var vm = require('vm');
var util = require('util');
var _ = require('underscore');
var colors = require('colors');
colors.setTheme({
  info1: 'blue',
  info2: 'yellow',  
  warn: 'magenta',
  good: 'green',
  error: 'red',
  bad: 'red'
});

const NUMBER_INSTANCE_PROPS = [
    "toExponential",
    "toFixed",
    "toPrecision"
]

const STRING_INSTANCE_PROPS = [
    "length",
    "charAt",
    "charCodeAt",
    "concat",
    "indexOf",
    "lastIndexOf",
    "localeCompare",
    "match",
    "quote",
    "replace",
    "search",
    "slice",
    "split",
    "substr",
    "substring",
    "toLocaleLowerCase",
    "toLocaleUpperCase",
    "toLowerCase",
    "toUpperCase",
    "trim",
    "trimLeft",
    "trimRight"
]

const TRAP_THRESHOLD = 50;

function ProgramInfo(CUTname, maxSequenceLength, ns) {
    this.classes = {};
    this.CUTname = CUTname;
    this.maxSequenceLength = maxSequenceLength;
    this.ns = ns;
}

ProgramInfo.prototype.setMUT = function(method) {
    this.MUTname = method.name;
    this.MUT = method;
};

// updates the inferences for the parameters
// of each class (constructor and methods)
ProgramInfo.prototype.makeInferences = function() {
    for(var c in this.classes) {
        this.classes[c].makeInferences(this);
    };
}

// retrieves the ParamInfo objects for a class
// returns [] for primitive types
ProgramInfo.prototype.getConstructorParams = function(className) {
    switch(className) {
        case "number":
        case "string":
        case "bool":
        case "unknown": return [];
        default: return this.classes[className].ctr.params;
    }
}

// obtains a hierarchy of inferred types for a parameter,
// in order to generate that hierarchy of objects for a test
ProgramInfo.prototype.getRecursiveParams = function(inferences) {
    var recursiveParams = [];
    for (var p=0; p < inferences.length; p++) {
        var inference = inferences[p];
        var inferenceParams = this.getConstructorParams(inference);
        _.forEach(inferenceParams, function(param) {
            param.useCounter++;
        });        
        recursiveParams.push({
            type: inference,
            params: this.getRecursiveParams(
                _.pluck(inferenceParams,
                        "inferredType")
            )
        });
    }
    return recursiveParams;
}

// used in the proxy handlers to access ParamInfo fields
ProgramInfo.prototype.getConstructorParamInfo = function(className, paramIndex) {
    return this.getConstructorParams(className)[paramIndex];
}

// used in the proxy handlers to access ParamInfo fields
ProgramInfo.prototype.getMethodParamInfo = function(className, methodName, paramIndex) {
    return _.find(this.getMethods(className), function(elem){
        return elem.name === methodName;
    }).params[paramIndex];    
}

// returns all of the MethodInfo objects for a class, including that of the MUT
ProgramInfo.prototype.getMethods = function(className) {
    return this.classes[className].methods;
}

// public method used to initialise the ProgramInfo object for a run of Flycatcher
exports.getProgramInfo = function(cmd, classContext, CUTname) {
    var ns = cmd.namespace;
    var pgmInfo = new ProgramInfo(CUTname, cmd.maxSequenceLength, ns);
    ParamInfo.typeInferenceDelay = cmd.typeInferenceDelay;
    var context = ns ? classContext[ns] : classContext;
    if (!context || !context[CUTname]){
        console.error("Error: specified class <" + CUTname + "> was not found");
        if(ns) console.error("       in specified namespace <" + ns + ">");
        console.info(cmd.helpInformation());
        process.exit(1);
    }
    var mutDefined = false;
    for (var className in context) {
        if(typeof context[className] === "function") {
            // retrieving constructor for the class under test
            var constructor = context[className];

            var ctrParams = [];
            for (var i = 0; i<constructor.length; i++) {
                ctrParams.push(new ParamInfo(getParamNames(constructor)[i],
                                             className));
            }
            var ctr = new MethodInfo(className, constructor, ctrParams);
            
            var construct = (function() {
                function Copy(args) {
                    return constructor.apply(this, args);
                }
                Copy.prototype = constructor.prototype;
                return function(args) {
                    return new Copy(args);
                }
            })();

            var emptyParams = [];
            var len = constructor.length;
            for (var i = 0; i < len; i++) {
                // we use empty proxy parameters because we are not interested in
                // what the constructor methods achieve atm, just the class's methods                
                emptyParams[i] = Proxy.create(new IdleHandler());
            }

            // an instance of the class under test needs to be created in order
            // to retrieve the class's method signatures
            var c = {};
            try {
                c = construct(emptyParams);
            }
            catch (err) {
                console.error("ANALYSER: error when constructing class <" +
                               className + "> :");
                console.error(err.stack);
                process.exit(1);
            }
            // retrieving class members
            var methods = [];
            var fields = [];
            for(var m in c) {
                var member = c[m];
                if(typeof member === "function") {
                    var methodParams = [];
                    for (var i = 0; i<member.length; i++) {
                        methodParams.push(new ParamInfo(getParamNames(member)[i],m));
                    }
                    methods.push(new MethodInfo(m, c[m], methodParams));
                }
                else {
                    fields.push(m);
                }
            }
            pgmInfo.classes[className] = new ClassInfo(className,
                                                       ctr,
                                                       methods,
                                                       fields);
        }
    }
    return pgmInfo;
}

function ClassInfo(name, ctr, methods, fields) {
    this.name = name;
    this.ctr = ctr;
    this.methods = methods;
    this.fields = fields;
}

ClassInfo.prototype.makeInferences = function(pgmInfo) {
    this.ctr.makeInferences(pgmInfo);
    for (var m=0; m < this.methods.length; m++) {
        this.methods[m].makeInferences(pgmInfo);
    };
}

function MethodInfo(name, def, params) {
    this.name = name;
    this.def = def;
    this.params = params;
}

MethodInfo.prototype.makeInferences = function(pgmInfo) {
    for (var p=0; p < this.params.length; p++) {
        var param = this.params[p];
        if (param.isUnknown() || param.unsure) 
            param.makeInferences(pgmInfo);
    };
}

function ParamInfo(name, methodName) {
    this.name = name;
    this.methodName = methodName;
    this.membersAccessed = [];
    this.inferredType = "unknown";
    this.primitiveScore = {
        number : 0,
        string : 0,
        bool : 0        
    }
    this.useCounter = 0;
    // if we try random primitives out of lack of
    // information, we set this flag to true
    this.unsure = false;
}

function sumValues(obj) {
    _.reduce(obj,
        function(memo, num){ return memo + num; }, 0);
}

ParamInfo.prototype.hasSufficientUses = function() {
    // We do not start inferring types for the parameters straight
    // away: we wait until they have been used in a certain # of
    // method calls/constructors, so that we can make a stronger
    // inference, based on more data.
    
    // When we start to try and infer:
    // * If there isn't any data to work with we issue a warning -
    //   the parameter might never be used. To avoid looping
    //   we use a primitive instead
    // * If there are mistakes in the types, the user may want to adjust
    //   the type inference delay variable, such that estimates can be
    //   made with even more confidence
    return this.useCounter >= ParamInfo.typeInferenceDelay;
};

ParamInfo.prototype.isUnknown = function() {
    return this.inferredType === "unknown";
}

ParamInfo.prototype.makeInferences = function(pgmInfo) {
    // for the member function calls we are interested
    // in the names only not the number of calls
    var membersAccessed = _.uniq(this.membersAccessed);
    this.membersAccessed = membersAccessed;
    if (this.hasSufficientUses()) {
        if (!this.unsure) {
            console.log("INFO: " + "Inferring a type for parameter " +
            this.name + " of method " + this.methodName + "...");
        }
        // this if statement comes before the operator inference because
        // it may rule out the possibility that the type is a primitive
        if (membersAccessed.length) {
            var currentMatches = 0;
            var name = "";
            var map = _.map(pgmInfo.classes,function(value, key){
                return {
                    name:key,
                    params:value.ctr.params,
                    count: function(){
                        var names = _.union(_.pluck(value.methods, "name"),
                                            value.fields);
                        return _.intersection(names, membersAccessed).length;
                    }()
                }
            });

            var max = _.max(map, function(elem){
                return elem.count;
            });
            // there is overlap with one of the user defined classes
            if (max.count > 0) {
                this.inferredType = max.name;
                console.log("=> " + this.inferredType.yellow);
            }
            // there is overlap with the Number class
            else if (_.intersection(membersAccessed,
                                     NUMBER_INSTANCE_PROPS).length)
            {
                this.inferredType = "number";
                console.log("=> " + this.inferredType.yellow);
            }
            // there is overlap with the String class
            else if (_.intersection(membersAccessed,
                                     STRING_INSTANCE_PROPS).length)
            {
                this.inferredType = "string";
                console.log("=> " + this.inferredType.yellow);
            }
            // if there are members but none of them match any of the
            // classes methods, the parameter is an inaccessible class
            // in which case there is no point in continuing
            else {
                throw new function InaccessibleClass(membersAccessed) {
                    this.membersAccessed = membersAccessed;
                    Error.captureStackTrace(this, InaccessibleClass);
                    this.toString = function() {
                        var msg = "       Couldn't infer type, parameter has unknown member accesses.\n";
                        msg += "       Object likely belongs to a class which is not accessible.\n";
                        msg += "       The member accesses are:\n";
                        for (var i=0; i < this.membersAccessed.length; i++) {
                            msg += "            " + this.membersAccessed[i];
                        };
                        return msg;
                    }
                }(membersAccessed);
            }
        }
        else if(_.any(this.primitiveScore)) {
            var max = 0;
            var t;
            _.each(this.primitiveScore, function(value, key) {
                if(value > max) {
                    t = key;
                    max = value;
                }
            });
            this.inferredType = t;
            console.log("=> " + this.inferredType.yellow);            
        }
        // if we cannot infer a type, issue a warning and try with a random primitive
        else {
            if (!this.unsure) {
                console.warn("WARNING: ".warn + "No information to infer param " +
                             this.name + " in method " + this.methodName);
                console.warn("         This may be due to the param being seldom or never used.");
                console.warn("         Trying with random primitive types...");
            }
            this.inferredType = Math.random() > 0.5 ? 'number' : 'string';
            this.unsure = true;
        }
    }
}

var TrapThresholdExceeded = function (){};
var IdleHandler = exports.IdleHandler = function(){
    this.trapCount = 0;
};

IdleHandler.prototype = {
    
    /* FUNDAMENTAL TRAPS */

    // there are no names/descriptors to retrieve
    // as our proxy has no target
    
    // trapped: Object.getOwnPropertyDescriptor(proxy, name)
    getOwnPropertyDescriptor: function(name) {
        return undefined;
    },
    
    // Not in ES5!    
    // trapped: Object.getPropertyDescriptor(proxy, name)
    getPropertyDescriptor: function(name) {
        return undefined;
    },

    // trapped: Object.getOwnPropertyNames(proxy)
    getOwnPropertyNames: function() {
        return [];
    },

    // Not in ES5!
    // trapped: Object.getPropertyNames(proxy)
    getPropertyNames: function() {
        return [];
    },
    
    // outcome of the defineProperty and delete irrelevant
    // as we trap [[get]]
    
    // trapped: Object.defineProperty(proxy,name,pd)
    defineProperty: function(name, pd) {
        return true;
    },

    // trapped: delete proxy.name
    delete: function(name) {
        return true; // to avoid throw in strict mode
    },
    
    // we ignore the fundamenal trap fix
    // which traps:
    // - Object.freeze(proxy)
    // - Object.seal(proxy)
    // - Object.preventExtensions(proxy)
    // as it kills the proxy

    /* DERIVED TRAPS */

    // trapped: proxy.name
    get: function(rcvr, name) {
        this.trapCount++;
        if (this.trapCount > TRAP_THRESHOLD) {
            throw new TrapThresholdExceeded();
        }
        var self = this;
        if (name === "valueOf") {
            return function() {
                return (function() {
                    return 1;
                })();
            }
        }
        else {
            return Proxy.createFunction(self,
            function() {
                return Proxy.create(self)
            });
        }
    },

    // no point in actually setting as we trap [[get]]
    // return true to avoid throw in strict mode
    // trap: proxy.name = value
    set: function(receiver, name, value) {
        return true;
    }
};

// AUXILLARIES

function getParamNames(func) {
    var reg = /\(([\s\S]*?)\)/;
    var params = reg.exec(func);
    if (params) 
        return params[1].split(',');
    else
        return [];
}