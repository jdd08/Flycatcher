var fs = require('fs');
var vm = require('vm');
var util = require('util');
var _ = require('underscore');

// important for the operators which are superstrings of others
// to come earlier in the array
var operators = exports.operators = [ "++",
                                      "+",
                                      "--",
                                      "-",
                                      "*",
                                      "/",
                                      "%",
                                      ">>>",
                                      ">>",
                                      "<<",
                                      "~",
                                      "^",
                                      "||",
                                      "|",
                                      "&&",
                                      "&",
                                      "==",
                                      "!=",
                                      "!",
                                      ">=",
                                      ">",
                                      "<=",
                                      "<"                  
                                      ];

var handler = {

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

function ParamInfo(name) {
    this.called = [];
    this.inferredType = "unknown";
    this.SUFFICIENT_UPDATES = 15;
}

ParamInfo.prototype.update = function() {
    // only start updating when we have enough
    // data to make a wise inference
    if (this.called.length >= this.SUFFICIENT_UPDATES) {
        var called = this.called;
        var primitive = {
            num : 0,
            string : 0,
            bool : 0
        }
        var memberFunctions = [];
        _.map(called,function(value,key) {
            if(_.include(operators,value)) {
                operatorToPrimitive(value,primitive);
            }
            else {
                memberFunctions.push(value);
            }
        })

        // if we have but one member function call
        // this rules out the possibility that the type
        // is a primitive
        if (memberFunctions.length) {
            console.log("MEMBERS");
            var currentMatches = 0;
            var name = "";
            var map = _.map(classes,function(value,key){
                return {
                    name:key,
                    params:value.ctr.params,
                    count: function(){
                        var names = _.pluck(value.methods,"name");
                        return _.intersection(names,called).length;
                    }()
                }
            });
            var max = _.max(map,function(elem){
                return elem.count;
            });        
            if (max.count > 0) {
                this.inferredType = max.name;
            }
        }
        else {
            // TODO: return primitive type with biggest score
//            console.log(_.max(primitive,function(value) { return value; }));
            this.inferredType = "num";
        }
    }
}

function operatorToPrimitive(operator,primitive) {
    switch(operator) {
        case "++" :
        case "--" : primitive.num += 100;
                    break;
        case "+" :  primitive.num += 1;
                    primitive.string += 1;
                    break;
        case "-" :
        case "*" :
        case "/" :
        case "%" :
        case ">>>" :
        case ">>" :
        case "<<" :
        case "~" :
        case "^" :
        case "|" :
        case "&" :  primitive.num += 1;
                    break;
        case "||" :            
        case "&&" :
        case "==" :
        case "!=" :
        case "!" :  primitive.num += 1;
                    primitive.string += 1;
                    primitive.bool += 1;
                    break;
        case ">=" :
        case ">" :
        case "<=" :
        case "<":   primitive.num += 2;
                    primitive.string += 1;
                    break;
    }
}

function MethodInfo(name, def, params, isMUT) {
    this.name = name;
    this.def = def;
    this.params = params;
    this.isMUT = isMUT || false;
}

MethodInfo.prototype.update = function() {
    for (var p=0; p < this.params.length; p++) {
        this.params[p].update();
    };
}

function ClassInfo(name, ctr, methods) {
    this.name = name;
    this.ctr = ctr;
    this.methods = methods;
}

ClassInfo.prototype.update = function() {
    this.ctr.update();
    for (var m=0; m < this.methods.length; m++) {
        this.methods[m].update();
    };
}

function ProgramInfo(CUTname, MUTname) {
    this.classes = [];
    this.CUTname = CUTname;
    this.MUTname = MUTname;
}

ProgramInfo.prototype.getCUTname = function() {
    return this.CUTname;
}

ProgramInfo.prototype.getMUTname = function() {
    return this.MUTname;
}

ProgramInfo.prototype.getMUT = function() {
    return _.filter(this.classes[this.CUTname].methods,
                    function(x){ return x.isMUT})[0];    
}

ProgramInfo.prototype.getMUTdefinition = function(className) {
    return _.filter(this.classes[this.CUTname].methods,
                    function(x){ return x.isMUT})[0].def;
}

ProgramInfo.prototype.addClassInfo = function(className,classInfo) {
    this.classes[className] = classInfo;
}

ProgramInfo.prototype.getClassInfo = function(className) {
    return this.classes[className];
}

ProgramInfo.prototype.update = function() {
    for(var c in this.classes) {
        this.classes[c].update();
    };
}

ProgramInfo.prototype.getRecursiveMUTparams = function() {
    var methodParams = this.getMUT().params;
    var recursiveParams = [];
    for (var p=0; p < methodParams.length; p++) {
        var inferredType = methodParams[p].inferredType;
        recursiveParams.push({name: inferredType,
                              params: this.getRecursiveConstructorParams(inferredType)})
    };
    return recursiveParams;
}

ProgramInfo.prototype.getRecursiveMethodParams = function(className,methodIndex) {
    var methodParams = _.filter(this.classes[className].methods,function(x){
        return !x.isMUT;
    })[methodIndex].params;
    var recursiveParams = [];
    for (var p=0; p < methodParams.length; p++) {
        var inferredType = methodParams[p].inferredType;
        recursiveParams.push({name: inferredType,
                              params: this.getRecursiveConstructorParams(inferredType)})
    };
    return recursiveParams;
}

ProgramInfo.prototype.getRecursiveConstructorParams = function(className) {
    if (className === "string" ||
        className === "num"    ||
        className === "bool"   ||
        className === "unknown")
    {
        return [];
    }
    else {
        var constructorParams = this.classes[className].ctr.params;
        var recursiveParams = [];
        for (var p=0; p < constructorParams.length; p++) {
            var inferredType = constructorParams[p].inferredType;
            recursiveParams.push({name: inferredType,
                                  params: this.getRecursiveConstructorParams(inferredType)})
        };
        return recursiveParams;   
    }
}

ProgramInfo.prototype.getConstructorParams = function(className) {
    switch(className) {
        case "num":
        case "string":
        case "bool":
        case "unknown": return [];
        default: return this.classes[className].ctr.params;
    }
}

ProgramInfo.prototype.getMethods = function(className) {
    return this.classes[className].methods;
}

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
                emptyParams[i] = Proxy.create(handler);
            }

            // an instance of the class under test needs to be created in order
            // to retrieve the class's method signatures
            var c = {};
            try {
                c = construct(emptyParams);
            }
            catch (err) {
                console.error("Error in class constructor/function definition <" + className + "> :");
                console.error(err.toString());
                process.exit(1);
            }
            // retrieving methods
            var methods = [];
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
            }
            pgmInfo.addClassInfo(className,new ClassInfo(className, ctr, methods));
        }
    }
    if(!mutDefined) {
        console.error("Error: specified method <" + MUTname + "> was not found in class <"+ CUTname +">");
        console.error("(see README for information on recognised class definitions)");
        console.info(cmd.helpInformation());
        process.exit(1);
    }
    return pgmInfo;
}