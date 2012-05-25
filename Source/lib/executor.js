/*********** DISCLAIMER **************

    The code in this file is inspired
    by　and makes use of the unlicensed,
    open source code available at the
    time of edition, at:

 https://github.com/substack/node-bunker

***************************************/

var util = require('util');
var stackTrace = require('stack-trace');

var burrito = require('burrito');
var vm = require('vm');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;

var Executor = module.exports.Executor = function(originalSrc,classes,CUTname) 
{
    this.test = {};
    this.nodes = [];
    this.coverage = {};
    this.nodeNum = 0;
    this.currentCov = 0;

    // only used when the mut is not specified
    this.mutIndex = 0;

    this.names = {
        call: burrito.generateName(6),
        expr: burrito.generateName(6),
        stat: burrito.generateName(6)
    };

    this.original = originalSrc;
    this.context = this.createContext(classes);
    this.mut = this.createMUT(classes[CUTname]);

    this.on('node',
    function(i) {
//        console.log("node.id",node.id)
        this.coverage[i] = true;
        //console.log(node.id + ": " + node.source())
    });

    this.on('cov',
    function(currentCoverage, good) {
        this.currentCov = Math.round((currentCoverage / _.size(this.coverage) * 100) *
        Math.pow(10, 2) / Math.pow(10, 2));
        if (good) {
            process.stdout.write("\b\b"+this.currentCov);
        }
    });
}

function ExecutorError(CUTname, methodName, paramIndex, classes) {
    Error.captureStackTrace(this, ExecutorError);
    this.CUTname = CUTname;
    this.methodName = methodName;
    this.paramIndex = paramIndex;
    this.classes = classes;
    this.isConstructorParam = function() {
        return CUTname === methodName;
    }
}

Executor.prototype = new EventEmitter;

Executor.prototype.getCoverage = function() {
    return this.currentCov;
}

Executor.prototype.setTest = function(test) {
    this.test = test;
};

Executor.prototype.createMUT = function(classInfo, index) {
    var nodes = this.nodes;
    var names = this.names;
    var n = 0;
    var mutDef = "";
    if (index) {
        mutDef = classInfo.methods[index].def;
    }
    else {
        mutDef = classInfo.methods.filter(function(x) {
            return x.mut
        })[0].def;
    }
    var def = classInfo.name + ".prototype.MUT = " + mutDef;
    var i = 0;
    var b = burrito(def,
    function(node) {

        if (node.name === 'call') {
            i++;
            node.wrap(names.call + '(' + i + ')(%s)');
            node.id = i;
        }
        else if (node.name === 'stat' || node.name === 'throw'
        || node.name === 'var') {
            i++;
            node.wrap('{' + names.stat + '(' + i + ');%s}');
            node.id = i;
        }
        else if (node.name === 'binary') {
            i++;
            node.wrap(names.expr + '(' + i + ')(%s)');
            node.id = i;
        }
        else if (node.name === 'unary-postfix' || node.name === 'unary-prefix') {
            i++;
            node.wrap(names.expr + '(' + i + ')(%s)');
            node.id = i;
        }
    }, names);        
    
    var coverage = this.coverage;
    _.forEach(b.nodeIndexes,function(num){
        coverage[num] = false;
    });
    return b.mut;
    }
        // if the node does not correspond to any of the node types above
        // (like the very last one) no need to set its id as this node is
        // effectively ignored (it is not pushed onto the nodes array)
//        if (i !== nodes.length) {
//            node.id = i;
//            console.log(node.name)
//            console.log(node.source())
//            console.log(i)
//        }
//        if(node.id === 4 || node.id === 5) console.log(node)
//        if(node.name === 'call') console.log(node)        

    
    // initialising coverage tracker
    // n-- is for ignoring the first node which was for the MUT definition
/*    this.coverage[0] = true;
    for (var c = 1; c < n; c++) {
        this.coverage[c] = false;
    }
*/
//    console.log(nodes)
//    console.log(this.coverage)
//    process.exit(0)

function createExecHandler(classes) {

    var Handler = function(CUTname, methodName, paramIndex, exec) {
        this.CUTname = CUTname;
        this.methodName = methodName;
        this.paramIndex = paramIndex;
        this.classes = classes;
        this.exec = exec;
        this.isConstructorParam = function() {
            return CUTname === methodName;
        }
    }

    Handler.prototype = {
        
        // delete proxy[name] -> boolean
        delete: function(name) {
            return delete this.target[name];
        },

        // name in proxy -> boolean
        has: function(name) {
            return name in this.target;
        },

        // proxy[name] -> any
        get: function(receiver, name) {
            var methodName = this.methodName;

/*            console.log(_.find(this.classes[this.CUTname].methods,function(elem){
                return elem.name === methodName;
            }))
            console.log(this.isConstructorParam())
*/

/*            console.log("CUTname",this.CUTname,
                        "paramIndex",this.paramIndex,
                        "methodName",this.methodName,
                        "name",name)
*/
            // TODO index this.methodName directly vs filter
            if (name === "valueOf") {
                try {
                    throw new ExecutorError(this.CUTname,this.methodName,this.paramIndex,this.classes);
                }
                catch(err) {
                    var lineNum = stackTrace.parse(err)[1].lineNumber;
                    // shifting to correspond to correct array index
                    var line = this.exec.src.split('\n')[lineNum - 1];

                    var called = err.isConstructorParam() ?
                        err.classes[err.CUTname].ctr.params[err.paramIndex] :
                        _.find(err.classes[err.CUTname].methods,function(elem){
                            return elem.name === err.methodName;
                        }).params[err.paramIndex].called;
                    console.log(line);    
                    for (var op=0; op < operators.length; op++) {
                        if (line.indexOf(operators[op]) !== -1) {
                            called.push(operators[op]);
                            break;
                        }
                    };
                }
                return function() {
                    return 123;
                }
            }
/*            else if (name === "toString") {
                return function() {
                    return "HARO!";
                }

            }
*/
            else {
                
                var paramInfo = this.isConstructorParam() ?
                    this.classes[this.CUTname].ctr.params[this.paramIndex] :
                    _.find(this.classes[this.CUTname].methods,function(elem){
                        return elem.name === methodName;
                    }).params[this.paramIndex];
                paramInfo.push(name);
                
                var self = this;
                return Proxy.createFunction(self,
                    function() {
                        return Proxy.create(self)
                });
            }
        },

        // proxy[name] = value
        set: function(receiver, name, value) {
//            console.log(name)
            if (canPut(this.target, name)) {
                // canPut as defined in ES5 8.12.4 [[CanPut]]
                this.target[name] = value;
                return true;
            }
            return false;
            // causes proxy to throw in strict mode, ignore otherwise
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
            return Object.keys(this.target);
        }
    };
    return Handler;
}

Executor.prototype.createContext = function(classes) {
    var context = {};
    var Handler = createExecHandler(classes);
    function getProperties(o) {
        var own = {};
        var proto = {};
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                own[i] = {
                    value:o[i],
                    writable:true,
                    enumerable:true,
                    configurable:true
                };
            }
            else {
                proto[i] = {value:o[i]};
            }
        }
        return {own: own, proto: proto};
    }
    
    // we want to trap only the calls that the "proxy" object
    // below cannot answer (because the type for it is not
    // yet correct). hence the proxy is an object who does have
    // all the methods and fields of the type T we think it is (p.own)
    // but whose prototype does not only have the properties of the
    // usual T prototype, but *its* prototype (called when neither the
    // "proxy"'s direct properties nor its prototype resolve) is an object
    // of the type Proxy, whose handler is initialised to update the table
    // for the specific parameter that this "proxy" is supposed to represent
    var exec = this;
    context.proxy = function(o,CUTname,methodName,paramIndex) {
        var p = getProperties(o);
        var prox = Object.create(
            Object.create(Proxy.create(new Handler(CUTname,methodName,paramIndex,exec)),p.proto),
            p.own
        );
        return prox;
    }
    context.log = console.log;

        // adding the instrumentation methods to the runtime context
        var self = this;
        var stack = [];

        // we are only interested in the coverage of tests
        // which are usable i.e. those that have resolved
        // all of their types, so we test for test.hasUnknowns()

        context[self.names.call] = function(i) {
            if (!self.test.hasUnknowns()) {
                var node = self.nodes[i];
                stack.unshift(node);
                self.emit('node', i);
            }
            return function(expr) {
                stack.shift();
                return expr;
            };
        };

        context[self.names.expr] = function(i) {
            if (!self.test.hasUnknowns()) {
                var node = self.nodes[i];
                self.emit('node', i);
            }
            return function(expr) {
                return expr;
            };
        };

        context[self.names.stat] = function(i) {
            if (!self.test.hasUnknowns()) {
                var node = self.nodes[i];
                self.emit('node', i);            
            }
        };

        return context;
};


Executor.prototype.show = function() {
    this.showOriginal();
    this.showMut();
    this.showTest();
}

Executor.prototype.showMut = function() {
    console.log('-------------- MUT --------------------');
    console.log(this.mut);
    console.log('---------------------------------------');
}

Executor.prototype.showOriginal = function() {
    console.log('-------------- SOURCE -----------------');
    console.log(this.original);
    console.log('---------------------------------------');
}

Executor.prototype.showTest = function() {
    console.log('-------------- TEST -------------------');
    console.log(this.test.toExecutorFormat());
    console.log('---------------------------------------');

}

Executor.prototype.covered = function() {
    return _.filter(_.values(this.coverage),_.identity).length;
}

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

Executor.prototype.run = function() {
    this.src = this.original + '\n' + this.mut + '\n' + this.test.toExecutorFormat();
    if (!this.mut) {
        console.warn("Warning: Executor.mut is an empty string")
    }
    if (!this.test) {
        console.warn("Warning: Executor.test is empty")
    }
    var before = this.covered();
    var res = {};
    try {
        res = vm.runInNewContext(this.src, this.context);
    }
    catch(err) {
        console.log(err.stack);
    }

    var after = this.covered();
    var newCoverage = after > before;
    this.emit('cov', after, newCoverage);
    return {
        newCoverage: newCoverage,
        result: res,
        coverage: this.currentCov
    };
};
