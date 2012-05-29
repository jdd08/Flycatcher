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
var beautify = require('beautify').js_beautify;
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var randomData = require('./randomData.js');

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

    this.valueOfHintRegexp = function(){

        var hints = ['(\\+)(\\+)',     // ++
                     '(\\+)',          // +
                     '(--)',           // --
                     '(-)',            // -
                     '(\\*)',          // *
                     '(\\/)',          // /
                     '(%)',            // %
//                     '(\\&)(\\&)',     // &&
                     '(\\&)',          // &
//                     '(\\|)(\\|)',     // ||
                     '(\\|)',          // |
                     '(!)',            // !
                     '(\\^)',          // ^
                     '(~)',            // ~
                     '(<<)',           // <<
                     '(>>>)',          // >>>
                     '(>>)',           // >>
                     '(>)',            // >
                     '(<)',            // <
//                   '(\\d+\\.?\\d*)(?!\\))', // TODO: find a way to use number hints without
                                              // counting the wrapper calls
                     '(\\")',                 // matches the string quote "
                     ];
        var regexp = new RegExp(hints.join("|"),"g")
        return regexp; 
    }();
}

function ValueOfTrap(vmSource, primitiveScore, hintRegexp) {
    Error.captureStackTrace(this, ValueOfTrap);
    this.vmSource = vmSource;
    this.primitiveScore = primitiveScore;
    this.hintRegexp = hintRegexp;
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
    
    var MUTdeclaration = pgmInfo.CUTname +
                         ".prototype.MUT = "  +
                         pgmInfo.getMUT().def;
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

    var Handler = function(target, className, methodName, paramIndex, exec) {
        // exec reference needed to have a handle on the vm source
        this.exec = exec;

        var paramInfo;
        className === methodName ? // handler is for a constructor's param
            paramInfo = pgmInfo.getConstructorParamInfo(className, paramIndex) :
            paramInfo = pgmInfo.getMethodParamInfo(className, methodName, paramIndex);

        this.name = paramInfo.name;
        this.primitiveScore = paramInfo.primitiveScore;
        this.membersAccessed = paramInfo.membersAccessed;

        this.target = target;

        this.trapCount = 0;
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
            this.membersAccessed.push(name);
            console.log("INSIDE GET PROP DESC CALLS");
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
            this.trapCount++;
            if (this.trapCount > TRAP_THRESHOLD) {
                throw new TrapThresholdExceeded();
            }
            if (name === "valueOf") {
                try {
                    throw new ValueOfTrap(this.exec.vmSource,
                                          this.primitiveScore,
                                          this.exec.valueOfHintRegexp);
                }
                catch(err) {
                    console.log(stackTrace.parse(err));
                    var lineNum = _.find(stackTrace.parse(err), function(value){
                        // we want the line number to correspond the line in
                        // the vm script, not the one in the Flycatcher source,
                        // nor within any native code: the first entry with
                        // the fileName set to evalmachine.<anonymous> will
                        // return that line
                        return value.fileName && // ignore if it is null
                               value.fileName.indexOf("evalmachine") !== -1;
                    }).lineNumber;

                    // shifting to correspond to correct array index
                    var line = err.vmSource.split('\n')[lineNum - 1];
                    var match;
                    while ((match = err.hintRegexp.exec(line)) != null) {
                        updatePrimitiveScore(match[0], err.primitiveScore);
                    }

                }
                // returning a function that returns a primitive, as expected
                // when valueOf is called, means that no exception is thrown
                // and operator collection can continue through that round
                // *but* for reassignment operators this also means that we
                // lose the proxy but if we were to try and return a proxy
                // an exception would be thrown and we wouldn't be able to
                // keep collecting during this round either - so this is the
                // lesser of two evils (the only potential solution seems
                // to be to let the exception be thrown and wrap all operator
                // reassignment operations in the vm source in try/catches,
                // which is infeasible)
                return function() {
                    return randomData.getRandomPrimitive();
                }
            }
            else {
                if (name === "getTarget") {
                    console.log("INSIDE GET TARGET");
                    console.log(this.target);
                    var handler = this;
                    return function() {
                        handler.target.toString();
                    }
                }
                else {
                    this.membersAccessed.push(name);
                    // return a proxy with a handler that does nothing so that we can avoid
                    // crashing and keep collecting data for the other parameters during this
                    // run if possible
                    return Proxy.createFunction(doNothingHandler,
                        function() {
                            return Proxy.create(doNothingHandler)
                    });                    
                }
            }
        },

        // proxy[name] = value
        set: function(receiver, name, value) {
            console.log("INSIDE SET");
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
//        console.log(o);
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
    context.proxy = function(o,className,methodName,paramIndex) {
        var p = getProperties(o);
//        o.valueOf = function(){return "aadsad"};
    console.log(o.first);
        var prox = Object.create(
            Object.create(Proxy.create(
                new Handler(o, className, methodName, paramIndex, exec)),p.proto),
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
    this.showMUT();
    this.showTest();
}

Executor.prototype.showMUT = function() {
    console.log('-------------- MUT --------------------');
    console.log(beautify(this.wrappedMUT));
    console.log('---------------------------------------');
}

Executor.prototype.showCoverage = function() {
    console.log('-------------- COVERED --------------------');
    console.log(beautify(this.coverage));
    console.log('-------------------------------------------');
}

Executor.prototype.showSource = function() {
    console.log('-------------- SOURCE -----------------');
    console.log(beautify(this.source));
    console.log('---------------------------------------');
}

Executor.prototype.showTest = function() {
    console.log('-------------- TEST -------------------');
    console.log(beautify(this.test.toExecutorFormat()));
    console.log('---------------------------------------');

}

Executor.prototype.covered = function() {
    return _.filter(_.values(this.coverage),_.identity).length;
}

Executor.prototype.run = function() {
    this.vmSource = this.source + '\n' + this.wrappedMUT + '\n' 
                                + this.test.toExecutorFormat();
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
        console.log("before run");
        results = vm.runInNewContext(this.vmSource, this.context);
        console.log("after run");
//        console.log(util.inspect(results, false, null));
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
        // res = err.toString();
        // e = true;
    }
    var after = this.covered();
    var newCoverage = after > before;
    this.emit('cov', after, newCoverage);
    return {
        newCoverage: newCoverage,
        results: results,
        coverage: this.currentCov,
        error: e
    };
};


// AUXILLIARY

function updatePrimitiveScore(hint, primitiveScore) {
    switch(hint) {
        case "++" :
        case "--" : primitiveScore.num += 100;
                    break;
        case "+" :  primitiveScore.num += 1;
                    primitiveScore.string += 1;
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
        case "&" :  primitiveScore.num += 1;
                    break;
//        case "||" :            
//        case "&&" :
        case "!" :  primitiveScore.bool += 1;
                    break;
        case ">" :
        case "<":   primitiveScore.num += 2;
                    primitiveScore.string += 1;
                    break;
        case "\"" :
                    primitiveScore.string += 5;
    }
}