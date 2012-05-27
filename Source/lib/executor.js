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
var randomData = require('./randomData.js');

var operators = require('./analyser.js').operators;

var Executor = module.exports.Executor = function(src, pgmInfo) 
{
    this.test = {};
    this.nodes = [];
    this.coverage = {};
    this.nodeNum = 0;
    this.currentCov = 0;

    this.names = {
        call: burrito.generateName(6),
        expr: burrito.generateName(6),
        stat: burrito.generateName(6)
    };

    this.source = src;
    this.context = this.createContext(pgmInfo);
    this.wrappedMUT = this.wrapMUT(pgmInfo);

    this.on('node', function(i) {
        this.coverage[i] = true;
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

function ExecutorError(proxyContext) {
    Error.captureStackTrace(this, ExecutorError);
    this.context = proxyContext;
}

Executor.prototype = new EventEmitter;

Executor.prototype.getCoverage = function() {
    return this.currentCov;
}

Executor.prototype.setTest = function(test) {
    this.test = test;
};

Executor.prototype.wrapMUT = function(pgmInfo) {
    function wrapper(node) {

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
    }    
    
    var nodes = this.nodes;
    var names = this.names;
    var n = 0;
    
    var MUTdeclaration = pgmInfo.getCUTname() +
                         ".prototype.MUT = "  +
                         pgmInfo.getMUTdefinition();
    var i = 0;
    var wrapped = burrito(MUTdeclaration, wrapper, names);
    
    var coverage = this.coverage;
    _.forEach(wrapped.nodeIndexes,function(num){
        coverage[num] = false;
    });
    return wrapped.MUT;
}

var TrapThresholdExceeded = function (){};

function createExecHandler(pgmInfo) {

    // Represents the number of traps after which
    // we throw away a proxy, because when operations
    // are trapped, the resulting behaviour is non-determistic,
    // as valueOf traps return random primtive values
    // which can lead to unintended behaviour such as looping
    //  forever (in recursive or traditional loop scenarios 
    // where the termination condition is not met in either
    // case due to the non-deterministic behaviour).
    // Moreover, in the case of non-unknown type proxies,
    // the very fact that they are traps means that we have
    // not yet inferred the correct type and it is in our interest
    // to update sooner than later to achieve coverage
    var TRAP_THRESHOLD = 10;

    var Handler = function(CUTname, methodName, paramIndex, exec) {
        this.CUTname = CUTname;
        this.methodName = methodName;
        this.paramIndex = paramIndex;
        this.pgmInfo = pgmInfo;
        this.exec = exec;
        this.isConstructorParam = function() {
            return CUTname === methodName;
        }
        this.trapCount = 0;
        this.registerMemberAccess = function(name) {
            var handler = this;
            var paramInfo = this.isConstructorParam() ?
                this.pgmInfo.getConstructorParams(this.CUTname)[this.paramIndex].membersAccessed :
                _.find(this.pgmInfo.getMethods(this.CUTname),function(elem){
                    return elem.name === handler.methodName;
                }).params[this.paramIndex].membersAccessed;
            paramInfo.push(name);
        }
    }
    
    var doNothingHandler = {
        get: function(receiver, name) {
            // returning a random value for primitive
            // can be seen as doing nothing, again the
            // main objective is not to crash so that
            // more info can be collected during this run
            if(name === "valueOf") {
                return randomData.getRandomPrimitive();                
            }
            // if a function is called or a member is accessed
            // on a proxy that does nothing we return another
            // proxy that does nothing
            else {
                var self = this;
                return Proxy.createFunction(self,
                    function() {
                        return Proxy.create(self)
                });
            }
        }
    }

    Handler.prototype = {

        getPropertyDescriptor: function(name) {
            this.registerMemberAccess(name);
            //console.log("INSIDE GET PROP DESC CALLS");
            return undefined;
        },

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
            //console.log("INSIDE GET");
            this.trapCount++;
            //console.log(this.trapCount);
            if (this.trapCount > TRAP_THRESHOLD) {
                throw new TrapThresholdExceeded();
            }
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
                //console.log("INSIDE VALUEOF");
                try {
                    throw new ExecutorError(this);
                }
                catch(err) {
                    var lineNum = _.find(stackTrace.parse(err), function(value){
                        // we want the line number to correspond the line in
                        // the vm script, not the one in the Flycatcher source,
                        // nor within any native code: the first entry with
                        // the fileName set to evalmachine.<anonymous> will
                        // return that line
                        return value.fileName === "evalmachine.<anonymous>";
                    }).lineNumber;
                    //console.log(stackTrace.parse(err));
                    // shifting to correspond to correct array index
                    var line = err.context.exec.vmSource.split('\n')[lineNum - 1];
                    console.log();
                    console.log(err.context.pgmInfo.getConstructorParams(err.context.CUTname)[err.context.paramIndex]);
                    console.log(util.inspect(_.find(err.context.pgmInfo.getMethods(err.context.CUTname),function(elem){
                        return elem.name === err.context.methodName;
                    }), false, null));
                    console.log(line);
                    console.log();
                    var operatorsCalled = err.context.isConstructorParam() ?
                        err.context.pgmInfo.getConstructorParams(err.context.CUTname)[err.context.paramIndex].operatorsCalled :
                        _.find(err.context.pgmInfo.getMethods(err.context.CUTname),function(elem){
                            return elem.name === err.context.methodName;
                        }).params[err.context.paramIndex].operatorsCalled;
                    
                    for (var op=0; op < operators.length; op++) {
                        if (line.indexOf(operators[op]) !== -1) {
                            operatorsCalled.push(operators[op]);
                            break;
                        }
                    };
                    console.log();
                    console.log(err.context.pgmInfo.getConstructorParams(err.context.CUTname)[err.context.paramIndex]);
                    console.log(util.inspect(_.find(err.context.pgmInfo.getMethods(err.context.CUTname),function(elem){
                        return elem.name === err.context.methodName;
                    }), false, null));
                    console.log(line);
                    console.log();
                }
                return function() {
                    return randomData.getRandomPrimitive();
                }
            }
/*            else if (name === "toString") {
                return function() {
                    return "HARO!";
                }

            }
*/
            else {
                //console.log("INSIDE MEMBER CALLS");
                this.registerMemberAccess(name);
                
                // FIXME: this is wrong we want to return a proxy with the capability
                // of trapping etc. but NOT ONE that pretends/proxies it is the same object
                // that got trapped in the first place because it isn't: it is the
                // object resulting from that initial trap (which we don't know the type
                // of since we trapped its parent)
                
                // return a proxy with a handler that does nothing so that we can avoid
                // crashing and keep collecting data for the other parameters during this
                // run if possible
                return Proxy.createFunction(doNothingHandler,
                    function() {
                        return Proxy.create(doNothingHandler)
                });
            }
        },

        // proxy[name] = value
        set: function(receiver, name, value) {
            //console.log("INSIDE SET");
            //console.log(name)
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

Executor.prototype.createContext = function(pgmInfo) {
    var context = {};
    var Handler = createExecHandler(pgmInfo);
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
    console.log(this.wrappedMUT);
    console.log('---------------------------------------');
}

Executor.prototype.showOriginal = function() {
    console.log('-------------- SOURCE -----------------');
    console.log(this.source);
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

Executor.prototype.run = function() {
    this.vmSource = this.source + '\n' + this.wrappedMUT + '\n' + this.test.toExecutorFormat();
    if (!this.wrappedMUT) {
        console.warn("Warning: Executor.mut is an empty string")
    }
    if (!this.test) {
        console.warn("Warning: Executor.test is empty")
    }
    var before = this.covered();
    var res = {};
    var e = null;
    try {
        res = vm.runInNewContext(this.vmSource, this.context);
    }
    catch(err) {
        err instanceof TrapThresholdExceeded ?
        console.info("Trap threshold exceeded. Updating program info and generating new test.") :
        console.warn("ERROR: vm error in executor.js",err.stack);
        // in cases where there are still unknowns the result won't be displayed because the test
        // will be dismissed, where there are no longer unknowns, if we get an exception, it means
        // that the program, with the parameters that we have carefully inferred for it, crashes,
        // in which cases we should notify of this in displaying the test result (as opposed to
        // looping forever which is what could happen if we did not accept the result of an execution
        // that fails even if there are no longer unknowns) - in the case where less than 100% of the
        // code coverage is desire this approach could work and *not* lead to looping forever (by
        // waiting for a path that does not contain an error, if there is one, to be executed and help
        // achieve the desire coverage) but it is *probably better* to let the user know that his
        // program fails after we have made the best possible guess for the type of the parameters
        // we have produced in the tests

        // also display res if TrapThresholdExceeded?
        res = err.toString();
        e = true;
    }
    var after = this.covered();
    var newCoverage = after > before;
    this.emit('cov', after, newCoverage);
    return {
        newCoverage: newCoverage,
        result: res,
        coverage: this.currentCov,
        error: e
    };
};
