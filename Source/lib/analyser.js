var fs = require('fs');
var vm = require('vm');
var util = require('util');
var _ = require('underscore');

function ProgramInfo(CUTname, MUTname) {
    this.classes = {};
    this.CUTname = CUTname;
    this.MUTname = MUTname;
}

// updates the inferences for the parameters
// of each class (constructor and methods)
ProgramInfo.prototype.update = function() {
    for(var c in this.classes) {
        this.classes[c].update(this);
    };
}

// retrieves the ParamInfo objects for a class
// returns [] for primitive types
ProgramInfo.prototype.getConstructorParams = function(className) {
    switch(className) {
        case "num":
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
        recursiveParams.push({
            name: inference,
            params: this.getRecursiveParams(
                _.pluck(this.getConstructorParams(inference),
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

// returns the MethodInfo object of the MUT
ProgramInfo.prototype.getMUT = function() {
    return _.filter(this.classes[this.CUTname].methods,
                    function(x){ return x.isMUT})[0];    
}

// returns all of the MethodInfo objects for a class, including that of the MUT
ProgramInfo.prototype.getMethods = function(className) {
    return this.classes[className].methods;
}

// public method used to initialise the ProgramInfo object for a run of Flycatcher
exports.getProgramInfo = function(cmd, classContext, CUTname, MUTname) {

    var pgmInfo = new ProgramInfo(CUTname, MUTname);

    if (!classContext[CUTname]){
        console.error("Error: specified class <" + CUTname + "> was not found");
        console.error("(see README for information on recognised class definitions)");
        console.info(cmd.helpInformation());
        process.exit(1);
    }
    var mutDefined = false;
    for (var className in classContext) {
        if(typeof classContext[className] === "function") {
            // retrieving constructor for the class under test
            var constructor = classContext[className];
            
            var ctrParams = [];
            for (var i = 0; i<constructor.length; i++) {
                ctrParams.push(new ParamInfo(getParamNames(constructor)[i]));
            }
            var ctr = new MethodInfo(className, constructor, ctrParams);

            var construct = (function() {
                function F(args) {
                    return constructor.apply(this, args);
                }
                F.prototype = constructor.prototype;
                return function(args) {
                    return new F(args);
                }
            })();
            
            var emptyParams = [];
            var len = constructor.length;
            for (var i = 0; i < len; i++) {
                // we use empty proxy parameters because we are not interested in
                // what the constructor methods achieve atm, just the class's methods
                emptyParams[i] = Proxy.create(analyserHandler);
            }

            // an instance of the class under test needs to be created in order
            // to retrieve the class's method signatures
            var c = {};
            try {
                c = construct(emptyParams);
            }
            catch (err) {
                console.error("Error in class constructor/function definition <" +
                               className + "> :");
                console.error(err.toString());
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
                        methodParams.push(new ParamInfo(getParamNames(member)[i]));
                    }
                    var isMUT = className === CUTname && m === MUTname;
                    if (isMUT) {
                        mutDefined = true;
                    };
                    methods.push(new MethodInfo(m, c[m], methodParams, isMUT));
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
    if(!mutDefined) {
        console.error("Error: specified method <" +
                       MUTname + "> was not found in class <" +
                       CUTname +">");
        console.error("(see README for information on recognised class definitions)");
        console.info(cmd.helpInformation());
        process.exit(1);
    }
    return pgmInfo;
}

function ClassInfo(name, ctr, methods, fields) {
    this.name = name;
    this.ctr = ctr;
    this.methods = methods;
    this.fields = fields;
}

ClassInfo.prototype.update = function(pgmInfo) {
    this.ctr.update(pgmInfo);
    for (var m=0; m < this.methods.length; m++) {
        this.methods[m].update(pgmInfo);
    };
}

function MethodInfo(name, def, params, isMUT) {
    this.name = name;
    this.def = def;
    this.params = params;
    this.isMUT = isMUT || false;
}

MethodInfo.prototype.update = function(pgmInfo) {
    for (var p=0; p < this.params.length; p++) {
        this.params[p].update(pgmInfo);
    };
}

function ParamInfo(name) {
    this.name = name;
    this.membersAccessed = [];
    this.memberAccesses = 0;
    this.inferredType = "unknown";
    this.primitiveScore = {
        num : 0,
        string : 0,
        bool : 0        
    }
    this.updateCount = 0;
}

function sumValues(obj) {
    _.reduce(obj,
        function(memo, num){ return memo + num; }, 0);
}

ParamInfo.prototype.startUpdating = function() {
    
    // This number needs to be sum of the number of
    // individual operator calls and each individual
    // member access - we CANNOT impose a lower a limit
    // on the variety of these operator calls and member
    // accesses as this would be making too strong
    // assumptions about the program. The purpose of this
    // lower limit however is to wait for a number of
    // indviduals operations in order to strengthen the 
    // confidence of our type estimate
    MIN_CALLS_BEFORE_UPDATING = 5;
    
    // similarly a minimum is required for the most confident
    // primitive score
    MIN_SCORE_BEFORE_UPDATING = 5;

    // This lower limit is for when we have attempted so many
    // updates without gaining sufficient information to infer
    // a type that we try and infer something with the info
    // we have (if there is any even though below call threshold)
    // or if there is none we use a random primitive.
    // The latter case means the parameter is never
    // accessed/called in the present test circumstances
    MIN_CALLS_BEFORE_WEAK_GUESS = 60;
    
    return (_.max(this.primitiveScore) >= MIN_SCORE_BEFORE_UPDATING) ||
           (this.memberAccesses >= MIN_CALLS_BEFORE_UPDATING) ||
           (this.updateCount >= MIN_CALLS_BEFORE_WEAK_GUESS && this.isUnknown());
};

ParamInfo.prototype.isUnknown = function() {
    return this.inferredType === "unknown";
}

ParamInfo.prototype.update = function(pgmInfo) {
    /*console.log();
    console.log(this.name);
    console.log(this.membersAccessed);
    console.log(this.primitiveScore);*/
    // before we make the members accessed unique for performance
    // purposes we add them up to use in the comparison 
    // with MIN_CALLS_BEFORE_UPDATING
    this.memberAccesses += this.membersAccessed.length;

    // for the member function calls we are interested
    // in the names only not the number of calls
    var membersAccessed = _.uniq(this.membersAccessed);
    this.membersAccessed = membersAccessed;    
        
    this.updateCount++;
    // only start updating when we have enough
    // data to make a wise inference or we give up
    // and do with what we have / or at random
    if (this.startUpdating()) {
        // If we have made MIN_CALLS_BEFORE_WEAK_GUESS attempts
        // this if means that we have *some* member access data.
        // Otherwise we see whether we have gained any new info,
        // this if statement comes before the operator inference
        // because even having just one member function call
        // rules out the possibility that the type is a primitive
        // (TODO: later look at native types and their member function calls)
        if (membersAccessed.length) {
            //console.log("inside members");
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
            if (max.count > 0) {
                this.inferredType = max.name;
            }
        }
        
        // If we have made MIN_CALLS_BEFORE_WEAK_GUESS attempts
        // this means that there are *some* operator calls (accumulated
        // overall previous rounds i.e. there have never been more)
        // to work with - even though less than MIN_CALLS_BEFORE_UPDATING.
        // Otherwise it is only worth updating primitiveScore if there is
        // anything to update it with.
        else if(_.any(this.primitiveScore)) {
//            console.log();
//           console.log(this.name);
//            console.log(this.primitiveScore);
//            console.log(this.primitiveScore);
            var max = 0;
            var t;
            _.each(this.primitiveScore, function(value, key) {
                if(value > max) {
                    t = key;
                    max = value;
                }
            });
            this.inferredType = t;
        }
        
        // the reason this if is inside of the startUpdating()
        // if is that if we reach MIN_CALLS_BEFORE_WEAK_GUESS we want
        // to try and infer with the little data we have (if we have
        // any) even if it is below our MIN_CALLS_BEFORE_UPDATING
        // threshold - but if there are no member accesses and no
        // operators (or these sets of data are inconclusive) in the
        // two if/else if above -> then we infer at random to avoid
        // looping forever
        if (this.inferredType === "unknown" &&
            this.updateCount >= MIN_CALLS_BEFORE_WEAK_GUESS) {
            console.warn("\nWarning: insufficient info to infer param "
                          + this.name + ", attempting to infer random primitive.");
                          
            // no point in inferring a primitive if we have member accesses,
            // this will just cause an error which may prevent coverage
            // and cause looping forever (note: if there is only one operator, we 
            // shouldn't enter this if at all because they should always resolve
            // to some primitive i.e. no operator yields a 0 score)
            if (membersAccessed.length) {
                throw new function InaccessibleClass(membersAccessed) {
                    this.membersAccessed = membersAccessed;
                    Error.captureStackTrace(this, InaccessibleClass);
                    this.toString = function() {
                        var msg = "Warning: Couldn't infer primitive, param has member accesses.\n";
                        msg += "         Object likely belongs to a class which is not accessible.\n";
                        msg += "         The member accesses are:\n";
                        for (var i=0; i < this.membersAccessed.length; i++) {
                            msg += "            " + this.membersAccessed[i];
                        };
                        return msg;
                    }
                }(membersAccessed);
            }
            else {
                var rand = Math.random();
                this.inferredType = rand > 0.66 ? "num" :
                                    (rand > 0.33 ? "string" : "bool");                
            }
        }
        //console.log(this.inferredType);
    }
}

// AUXILLIARY

var analyserHandler = {

    delete: function(name) {
        console.log(name)
        var self = this;
        return Proxy.createFunction(self,
        function() {
            return Proxy.create(self)
        });
    },

    // ignoring fundamental traps that aren't in ES5
    getOwnPropertyDescriptor: function(name) {
        var desc = Object.getOwnPropertyDescriptor(this, name);
        // a trapping proxy's properties must always be configurable
        if (desc !== undefined) {
            desc.configurable = true;
        }
        return desc;
    },

    // proxy[name] -> any
    get: function(rcvr, name) {
        var self = this;
        if (name === "valueOf") {
            return function() {
                return 35;
            }
        }
        else {
            return Proxy.createFunction(self,
            function() {
                return Proxy.create(self)
            });
        }
    },

    // proxy[name] = value
    set: function(receiver, name, value) {
        this[name] = Proxy.create(this);
        return true;
    },

    // name in proxy -> boolean
    has: function(name) {
        return false;
    },

    // for (var name in proxy) { ... }
    enumerate: function() {
        var result = [];
        for (var name in this.target) {
            result.push(name);
        };
        return result;
    },

    // Object.keys(proxy) -> [ string ]
    keys: function() {
        return [];
    }
};

function getParamNames(func) {
    var reg = /\(([\s\S]*?)\)/;
    var params = reg.exec(func);
    if (params) 
        return params[1].split(',');
    else
        return [];
}