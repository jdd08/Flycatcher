var IdleHandler = require('./analyser.js').IdleHandler;

var beautify = require('beautify').js_beautify;
var burrito = require('burrito');
var colors = require('colors');
colors.setTheme({
  info1: 'blue',
  info2: 'yellow',  
  warn: 'magenta',
  good: 'green',
  error: 'red',
  bad: 'red'
});
var stackTrace = require('stack-trace');
var traverse = require('traverse');
var _ = require('underscore');
// XRegExp add-ons are the copyright of
// Steven Levithan under the MIT License
var XRegExp = require('xregexp').XRegExp;

var util = require('util');
var vm = require('vm');

// represents the number of traps after which we throw away a proxy,
// because when operations are trapped, the resulting behaviour is
// non-determistic, as valueOf traps return random primtive values,
// which can lead to terminating programs that hang
const TRAP_THRESHOLD = 25;
const OBJECT_HIDDEN_PROPS = ["__defineGetter__", "__defineSetter__",
                             "__lookupGetter__", "__lookupSetter__",
                             "__noSuchMethod__", "__parent__", 
                             "__proto__", "toString", "isPrototypeOf",
                             "hasOwnProperty", "toSource", "toLocaleString",
                             "propertyIsEnumerable", "watch", "unwatch",
                             "inspect", "constructor"];

var Executor = module.exports.Executor = function(src, pgmInfo, start, stop)
{
    this.test = {};
    this.coverage = {};
    this.currentCov = 0;
    this.start = start;
    this.stop = start + stop*1000;
    this.MUTname = pgmInfo.MUT.name;
    this.namespace = pgmInfo.ns;
    this.source = src;
    this.context = this.createContext(pgmInfo);
    this.wrappedMUT = this.wrapMUT(pgmInfo);
    this.xregexp = XRegExp;
    // hints that require negative lookbehind
    this.lbHints = ['(?<!-)(-)(?!-)',            // -
                    '(?<!\\&)(\\&)(?!\\&)',      // &
                    '(?<!\\|)(\\|)(?!\\|)',      // |
                    '(?<!>)(>>)(?!>)',           // >>
                    '(?<!>)(>)(?!>)',            // >
                    '(?<!<)(<)(?!<)',            // <
                   ];
    this.hints = ['(\\+)(\\+)',                  // ++
                  '(--)',                        // --
                  '(\\*)',                       // *
                  '(\\/)',                       // /
                  '(%)',                         // %
                  '(\\^)',                       // ^
                  '(~)',                         // ~
                  '(<<)',                        // <<
                  '(>>>)',                       // >>>
                  '(\\")',                       // double quote
                  '(\\d+\\.?\\d*)',              // digits
                  ];                 
}

function ValueOfTrap(execHandle, primitiveScore) {
    Error.captureStackTrace(this, ValueOfTrap);
    this.execHandle = execHandle;
    this.primitiveScore = primitiveScore;
}

Executor.prototype.getCoverage = function() {
    return this.currentCov;
}

Executor.prototype.updateCoverage = function(currentCoverage, good) {
    if (good) {
        this.currentCov = Math.round((currentCoverage / _.size(this.coverage) * 100) *
        Math.pow(10, 2) / Math.pow(10, 2));
        if (this.currentCov === 100) {
            console.log((this.currentCov + "% coverage.").good);
        }
        else {
            console.log((this.currentCov + "% coverage...").info2);
        }
    }
};

Executor.prototype.setTest = function(test) {
    this.test = test;
};

Executor.prototype.wrapMUT = function(pgmInfo) {
    var i = 0;
    // name of the nodes inside private functions
    // (not tracked as they are not executed)
    var startCoverage = false;
    var privateNodes = [];
    function wrapper(node) {
        
        // private functions are not executed so we don't track coverage:
        // we collect their child nodes and do not wrap for coverage
        // until the latter have expired
        if (privateNodes.length) {
            privateNodes.splice(privateNodes.indexOf(node.name), 1);
            return;
        }

        // we must be careful not to include the MUT in this process: (i > 0)
        if ((node.name === 'function' || node.name === 'defun') && i > 0) {
            var children = node.node[3];
            traverse(children).forEach(function (x) {
                if(x && x.name) privateNodes.push(x.name);
            });
        };
        if (!startCoverage && node.name === 'stat' && i === 0) {
            startCoverage = true;
            return;
        }
        if (!startCoverage) return;
        if (node.name === 'stat'             ||
            node.name === 'throw'            ||
            node.name === 'var'              ||
            node.name === 'return') {
            i++;
            node.wrap('{ __coverage__(' + i + ');%s}');
            node.id = i;
        }
        else if (node.name === 'call'          ||
                 node.name === 'binary'        || 
                 node.name === 'unary-postfix' ||
                 node.name === 'unary-prefix')
        {
            i++;
            node.wrap('__coverage__(' + i + ')(%s)');
            node.id = i;
        }
    }    
    var MUT = pgmInfo.MUT;
    var MUTdeclaration = "";
    if (this.namespace) MUTdeclaration += this.namespace + ".";
    MUTdeclaration += pgmInfo.CUTname + ".prototype." + MUT.name + " = " + MUT.def;
    var wrapped = burrito(MUTdeclaration, wrapper);
    var coverage = this.coverage;
    _.forEach(wrapped.nodeIndexes,function(num){
        coverage[num] = false;
    });
    return wrapped.MUT;
}

var TrapThresholdExceeded = function (){};

function createExecHandler(pgmInfo) {

    var ExecHandler = function(className, methodName, paramIndex, exec) {
        this.exec = exec;

        var paramInfo;
        className === methodName ? // ExecHandler instance is for a constructor's param
            paramInfo = pgmInfo.getConstructorParamInfo(className, paramIndex) :
            paramInfo = pgmInfo.getMethodParamInfo(className, methodName, paramIndex);

        this.paramInfo = paramInfo;
        this.name = paramInfo.name;
        this.primitiveScore = paramInfo.primitiveScore;
        this.membersAccessed = paramInfo.membersAccessed;

        this.trapCount = 0;
    }

    function idleProxy() {
        var idleHandler = new IdleHandler();
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
            this.membersAccessed.push(name);
            return undefined;
        },
        
        // Not in ES5!
        // trapped: Object.getPropertyDescriptor(proxy, name)
        getPropertyDescriptor: function(name) {
            this.membersAccessed.push(name);
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
            this.trapCount++;
            if (this.trapCount > TRAP_THRESHOLD) {
                throw new TrapThresholdExceeded();
            }
            if (name === "valueOf") {
                try {
                    throw new ValueOfTrap(this.exec,
                                          this.primitiveScore);
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
                    try {
                        var exec = err.execHandle;
                        // shifting to correspond to correct array index
                        var noisyLine = exec.vmSource.split('\n')[lineNum - 1];
                        var line = noisyLine.replace(/__coverage__\([0-9]+\)/,"");
                        var matches = [];
                        for (var h=0; h < exec.lbHints.length; h++) {
                            var match = exec.xregexp.execLb(line, exec.lbHints[h]);
                            if(match) matches.push(match[0]);
                        };
                        for (var i=0; i < exec.hints.length; i++) {
                            var re = new RegExp(exec.hints[i]);
                            match = re.exec(line);
                            if(match) matches.push(match[0]);
                        };
                        updatePrimitiveScore(matches, err.primitiveScore);
                    }
                    catch(err) {
                        console.log("ERROR inside the Executor's valueOf trap".error);
                        console.log(err.stack);
                        process.exit(1);
                    }

                }
                // returning a function that returns a primitive, as expected
                // when valueOf is called, means that no exception is thrown
                // and operator collection can continue through that round
                var self = this;
                return function() {
                    return (function() {
                        const MAX_INT = (1 << 15);
                        // returns a number from 0 to 65535 for exploration
                        if(Math.random() > 0.2) return Math.floor(Math.random()*MAX_INT);
                        // we need more 0s as they are significant for covering branches
                        else return 0;
                    })();
                }
            }
            else {
                if (!_.include(OBJECT_HIDDEN_PROPS,name)) this.membersAccessed.push(name);
                // return a proxy with a handler that does nothing so that we can avoid
                // crashing and keep collecting data for the other parameters during this
                // run if possible
                return idleProxy();
            }
        },

        // trapped: proxy.name
        // no point in setting value as any [[get]] will be trapped anyway
        set: function(receiver, name, value) {
            this.membersAccessed.push(name);
            return true; // to avoid throw in strict mode
        }
    };
    return ExecHandler;
}

Executor.prototype.createContext = function(pgmInfo) {
    var exec = this;
    return {
        // we are only interested in the coverage of tests
        // which are usable i.e. those that have resolved
        // all of their types, so we check for test.hasUnknowns()
        __coverage__ : function(i) {
            if (!exec.test.hasUnknowns()) {
                exec.coverage[i] = true;
            }
            return function(expr) {
                return expr;
            };
        },

        exports : {},

        proxy : function(className, methodName, paramIndex) {
            var ExecHandler = createExecHandler(pgmInfo);
            return Proxy.create(
                new ExecHandler(className, methodName, paramIndex, exec)
            );
        }
    }
};

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

var StrictTimeout = exports.StrictTimeout = function (t){
    Error.captureStackTrace(this, StrictTimeout);
    this.toString = function() {
        return "TIMEOUT: ".info2 + t + " seconds expired";
    }
};

Executor.prototype.run = function() {
    this.vmSource = this.source + '\n' + this.wrappedMUT + '\n' 
                                + this.test.toExecutorFormat();
    if (!this.wrappedMUT) {
        console.warn("WARNING: ".warn + "Executor.mut is an empty string");
    }
    if (!this.test) {
        console.warn("WARNING: ".warn + "Executor.test is empty");
    }
    var before = this.covered();
    var beforeCoverage = {};
    for (var i in this.coverage) {
        beforeCoverage[i] = this.coverage[i];
    }
    var results = [];
    var t = Date.now();
    if (t > this.stop) {
        throw new StrictTimeout((t-this.start)/1000);
    }
    try {
        results = vm.runInNewContext(this.vmSource, this.context);
    }
    catch(err) {
        // if the test run yields an error, it is logged as a failing test but
        // only errors which we do not expect should however be logged as failing
        // tests, which does not apply to the trap threshold
        this.coverage = beforeCoverage;
        if (err instanceof TrapThresholdExceeded) {
            console.info("Trap threshold exceeded. Updating program info and generating new test.");
            return {};         
        }
        else {
            var trace = _.find(stackTrace.parse(err), function(value){
                // we want the line number to correspond the line in
                // the vm script, not the one in the Flycatcher source,
                // nor within any native code: the first entry with
                // the fileName set to evalmachine.<anonymous> will
                // return that line
                return value.fileName && // ignore if it is null
                       value.fileName.indexOf("evalmachine") !== -1;
            });
            return {
                msg: err.toString() + " in method <" + (trace ? trace.methodName : "undefined") + ">",
                error: true
            }
        }
    }
    var after = this.covered();
    var newCoverage = after > before;
    this.updateCoverage(after, newCoverage);
    return {
        newCoverage: newCoverage,
        results: results,
        coverage: this.currentCov,
    };
};

function updatePrimitiveScore(matches, primitiveScore) {
    for (var m=0; m < matches.length; m++) {
        var hint = matches[m];
        switch(hint) {
            case "++" :
            case "--" : primitiveScore.number += 10;
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
            case "&" :  primitiveScore.number += 2;
                        break;
            case ">" :
            case "<":   primitiveScore.number += 2;
                        primitiveScore.string += 1;
                        break;
            case "\"" :
                        primitiveScore.string += 5;
                        break;
        };
        if (isNumber(hint)) primitiveScore.number += 5;        
    }
}

// AUXILLIARIES

function isNumber (o) {
  return !isNaN(o-0) && o != null;
}