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
var idleHandler = require('./analyser.js').idleHandler;

var Executor = module.exports.Executor = function(src, pgmInfo) 
{
    this.test = {};
    this.nodes = [];
    this.coverage = {};
    this.nodeNum = 0;
    this.currentCov = 0;
    this.MUTname = pgmInfo.MUTname;

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
        if (good) {
            this.currentCov = Math.round((currentCoverage / _.size(this.coverage) * 100) *
            Math.pow(10, 2) / Math.pow(10, 2));
            if (this.currentCov === 100) 
                console.log("\u001b[32m"+ this.currentCov + "% coverage.\u001b[0m");
            else
                console.log("\u001b[33m"+ this.currentCov + "% coverage...\u001b[0m");
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
        || node.name === 'var' || node.name === 'return') {
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

const OBJECT_HIDDEN_METHODS = ["toString", "isPrototypeOf",
                               "hasOwnProperty", "toSource",
                               "propertyIsEnumerable",
                               "toLocaleString",
                               "watch", "unwatch","inspect",
                               "constructor"];

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
    var TRAP_THRESHOLD = 50;

    var ExecHandler = function(className, methodName, paramIndex, exec) {
        // exec reference needed to have a handle on the vm source
        this.exec = exec;

        var paramInfo;
        className === methodName ? // handler is for a constructor's param
            paramInfo = pgmInfo.getConstructorParamInfo(className, paramIndex) :
            paramInfo = pgmInfo.getMethodParamInfo(className, methodName, paramIndex);

        this.paramInfo = paramInfo;
        this.name = paramInfo.name;
        this.primitiveScore = paramInfo.primitiveScore;
        this.membersAccessed = paramInfo.membersAccessed;

        this.trapCount = 0;
    }

    function idleProxy() {
        return Proxy.createFunction(idleHandler,
            function() {
                return Proxy.create(idleHandler)
            }
        );
    };

    ExecHandler.prototype = {

        /* FUNDAMENTAL TRAPS */

        // there are no names/descriptors to retrieve
        // as our proxy has no target
        
        // trapped: Object.getOwnPropertyDescriptor(proxy, name)
        getOwnPropertyDescriptor: function(name) {
            // console.log("INSIDE EXECUTOR GET OWN PROP",name);
            this.membersAccessed.push(name);
            return undefined;
        },
        
        // Not in ES5!
        // trapped: Object.getPropertyDescriptor(proxy, name)
        getPropertyDescriptor: function(name) {
            // console.log("INSIDE EXECUTOR GET PROP",name);
            this.membersAccessed.push(name);
            return undefined;
        },
        // trapped: Object.getOwnPropertyNames(proxy)
        getOwnPropertyNames: function() {
            // console.log("INSIDE EXECUTOR GET OWN PROPERTY NAMES");
            return [];
        },
            
        // Not in ES5!
        // trapped: Object.getPropertyNames(proxy)
        getPropertyNames: function() {
            // console.log("INSIDE EXECUTOR GET PROPERTY NAMES");
            return [];
        },
        
        // outcome of the defineProperty and delete irrelevant
        // as we trap [[get]]
        
        // trapped: Object.defineProperty(proxy,name,pd)
        defineProperty: function(name, pd) {
            // console.log("INSIDE EXECUTOR DEFINE PROPERTY",name);
            // pretend to succeed
            return true;
        },

        // trapped: delete proxy.name
        delete: function(name) {
            // console.log("INSIDE EXECUTOR DELETE",name);            
            // pretend to succeed
            return true;
        },
        
        // we ignore the fundamenal trap fix
        // which traps:
        // - Object.freeze(proxy)
        // - Object.seal(proxy)
        // - Object.preventExtensions(proxy)
        // as it kills the proxy

        /* DERIVED TRAPS */

        // trapped: proxy.name
        get: function(receiver, name) {
            // console.log("INSIDE EXECUTOR GET",name);
            this.trapCount++;
            if (this.trapCount > TRAP_THRESHOLD) {
                throw new TrapThresholdExceeded();
            }
            if (name === "valueOf") {
                // console.log("INSIDEVALUEOF");
                try {
                    throw new ValueOfTrap(this.exec.vmSource,
                                          this.primitiveScore,
                                          this.exec.valueOfHintRegexp);
                }
                catch(err) {
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
                var self = this;
                return function() {
                    // we work from the idea that if valueOf is important
                    // it will be implemented and not trapped
                    return randomData.getRandomPrimitive();
                }
            }
            else {
                if (!_.include(OBJECT_HIDDEN_METHODS,name)) this.membersAccessed.push(name);
                // console.log(this.paramInfo);
                // console.log('MEMBER ACCESS');
                // return a proxy with a handler that does nothing so that we can avoid
                // crashing and keep collecting data for the other parameters during this
                // run if possible
                return idleProxy();
            }
        },

        // trapped: proxy.name
        // no point in setting value as any [[get]] will be trapped anyway
        set: function(receiver, name, value) {
            // console.log("INSIDE EXECUTOR SET PROP",name);
            this.membersAccessed.push(name);
            return true; // to avoid throw in strict mode
        }
    };
    return ExecHandler;
}

Executor.prototype.createContext = function(pgmInfo) {
    var context = {};
    var ExecHandler = createExecHandler(pgmInfo);
    
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
    context.proxy = function(className, methodName, paramIndex) {
        // var prox = Object.create(Proxy.create(new Handler(className, methodName, paramIndex, exec)));
        return Proxy.create(new ExecHandler(className, methodName, paramIndex, exec));
    }
    context.log = console.log;

        // adding the instrumentation methods theo the runtime context
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
    console.log(this.coverage);
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
        console.warn("\u001b[35mWARNING:\u001b[0m Executor.mut is an empty string")
    }
    if (!this.test) {
        console.warn("\u001b[35mWARNING:\u001b[0m Executor.test is empty")
    }
    var before = this.covered();
    var beforeCoverage = {};
    for (var i in this.coverage) {
        beforeCoverage[i] = this.coverage[i];
    }
    var results = [];
    try {
        results = vm.runInNewContext(this.vmSource, this.context);
        var after = this.covered();
        var newCoverage = after > before;
        this.emit('cov', after, newCoverage);
        return {
            newCoverage: newCoverage,
            results: results,
            coverage: this.currentCov,
        };
    }
    catch(err) {
        // If the test run yields an error, this test will not become a unit test
        // therefore the coverage that it has contributed must be cancelled.
        // Only errors which we do not expect should however be logged as failing
        // tests, which does not apply to the trap threshold being exceeded.
        this.coverage = beforeCoverage;
        if (err instanceof TrapThresholdExceeded) {
            console.info("Trap threshold exceeded. Updating program info and generating new test.");
            return {};         
        }
        else {
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

            /* 
                var trace = _.find(stackTrace.parse(err), function(value){
                // we want the line number to correspond the line in
                // the vm script, not the one in the Flycatcher source,
                // nor within any native code: the first entry with
                // the fileName set to evalmachine.<anonymous> will
                // return that line
                return value.fileName && // ignore if it is null
                       value.fileName.indexOf("evalmachine") !== -1;
            });

            // TODO: fix the wrapping methods and you can print out
            // the line of code for the error err.toString() + name
            try {
                var methodName = trace.methodName === "MUT" ?
                                 this.MUTname : trace.methodName;                
            }
            catch (err) {
                console.log(stackTrace.parse(err));
                console.log("ersresrrser");
                process.exit(0);
            }
            */
            console.warn("\u001b[35mWARNING:\u001b[0m error in the executor:");
            console.warn(err.toString());
            return {
                msg: err.toString(),
                error: true
            }
        }
    }
};


// AUXILLIARY

function updatePrimitiveScore(hint, primitiveScore) {
    // console.log(hint);
    switch(hint) {
        case "++" :
        case "--" : primitiveScore.num += 100;
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
                    //primitiveScore.string += 0.5;
    }
    // console.log(primitiveScore);
}