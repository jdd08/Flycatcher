// DISCLAIMER
// ----------
// XRegExp add-ons are the copyright of
// Steven Levithan under the MIT License
var XRegExp = require('xregexp').XRegExp;

var util = require('util');
var stackTrace = require('stack-trace');

var burrito = require('burrito');
var vm = require('vm');
var beautify = require('beautify').js_beautify;
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var randomData = require('./randomData.js');
var idleHandler = require('./analyser.js').idleHandler;
var colors = require('colors');
colors.setTheme({
  info1: 'blue',
  info2: 'yellow',  
  warn: 'magenta',
  good: 'green',
  error: 'red',
  bad: 'red'
});

var Executor = module.exports.Executor = function(src, pgmInfo) 
{
    this.test = {};
    this.coverage = {};
    this.currentCov = 0;
    this.MUTname = pgmInfo.MUT.name;
    this.source = src;
    this.context = this.createContext(pgmInfo);
    this.wrappedMUT = this.wrapMUT(pgmInfo);
    (function (XRegExp) {

        function preparePattern(pattern, flags) {
            var lbOpen, lbEndPos, lbInner;
            flags = flags || "";
            // Extract flags from a leading mode modifier, if present
            pattern = pattern.replace(/^\(\?([\w$]+)\)/, function ($0, $1) {
                flags += $1;
                return "";
            });
            if (lbOpen = /^\(\?<([=!])/.exec(pattern)) {
                // Extract the lookbehind pattern. Allows nested groups, escaped parens, and unescaped parens within classes
                lbEndPos = XRegExp.matchRecursive(pattern, /\((?:[^()[\\]|\\.|\[(?:[^\\\]]|\\.)*])*/.source, "\\)", "s", {
                    valueNames: [null, null, null, "right"],
                    escapeChar: "\\"
                })[0].end;
                lbInner = pattern.slice("(?<=".length, lbEndPos - 1);
            } else {
                throw new Error("lookbehind not at start of pattern");
            }
            return {
                lb: XRegExp("(?:" + lbInner + ")$(?!\\s)", flags.replace(/[gy]/g, "")), // $(?!\s) allows use of flag m
                lbType: lbOpen[1] === "=", // Positive or negative lookbehind
                main: XRegExp(pattern.slice(("(?<=)" + lbInner).length), flags)
            };
        }

        XRegExp.execLb = function (str, pattern, flags) {
            var pos = 0, match, leftContext;
            pattern = preparePattern(pattern, flags);
            while (match = XRegExp.exec(str, pattern.main, pos)) {
                leftContext = str.slice(0, match.index);
                if (pattern.lbType === pattern.lb.test(leftContext)) {
                    return match;
                }
                pos = match.index + 1;
            }
            return null;
        };

        XRegExp.testLb = function (str, pattern, flags) {
            return !!XRegExp.execLb(str, pattern, flags);
        };

        XRegExp.searchLb = function (str, pattern, flags) {
            var match = XRegExp.execLb(str, pattern, flags);
            return match ? match.index : -1;
        };

        XRegExp.matchAllLb = function (str, pattern, flags) {
            var matches = [], pos = 0, match, leftContext;
            pattern = preparePattern(pattern, flags);
            while (match = XRegExp.exec(str, pattern.main, pos)) {
                leftContext = str.slice(0, match.index);
                if (pattern.lbType === pattern.lb.test(leftContext)) {
                    matches.push(match[0]);
                    pos = match.index + (match[0].length || 1);
                } else {
                    pos = match.index + 1;
                }
            }
            return matches;
        };

        XRegExp.replaceLb = function (str, pattern, replacement, flags) {
            var output = "", pos = 0, lastEnd = 0, match, leftContext;
            pattern = preparePattern(pattern, flags);
            while (match = XRegExp.exec(str, pattern.main, pos)) {
                leftContext = str.slice(0, match.index);
                if (pattern.lbType === pattern.lb.test(leftContext)) {
                    // Doesn't work correctly if lookahead in regex looks outside of the match
                    output += str.slice(lastEnd, match.index) + XRegExp.replace(match[0], pattern.main, replacement);
                    lastEnd = match.index + match[0].length;
                    if (!pattern.main.global) {
                        break;
                    }
                    pos = match.index + (match[0].length || 1);
                } else {
                    pos = match.index + 1;
                }
            }
            return output + str.slice(lastEnd);
        };

    }(XRegExp));
    this.xregexp = XRegExp;
    this.lbHints = ['(?<!-)(-)(?!-)',                // -
                    '(?<!\\&)(\\&)(?!\\&)',          // &
                    '(?<!\\|)(\\|)(?!\\|)',          // |
                    '(?<!>)(>>)(?!>)',               // >>
                    '(?<!>)(>)(?!>)',                // >
                    '(?<!<)(<)(?!<)',                // <
                    // '(?<!\\()(\\d+\\.?\\d*)(?!\\))', // digits not preceded nor followed by parentheses
                    // '(?<!\\()(\\d+\\.?\\d*)',        // digits not preceded by a parenthesis
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
                    '(\\d+\\.?\\d*)',             // digits
                    // '(\\d+\\.?\\d*)(?!\\))',      // digits not followed by a parenthesis
                  ];                 
}

function ValueOfTrap(execHandle, primitiveScore) {
    Error.captureStackTrace(this, ValueOfTrap);
    this.execHandle = execHandle;
    this.primitiveScore = primitiveScore;
}

Executor.prototype = new EventEmitter;

Executor.prototype.getCoverage = function() {
    return this.currentCov;
}

Executor.prototype.updateCoverage = function(currentCoverage, good) {
    if (good) {
        this.currentCov = Math.round((currentCoverage / _.size(this.coverage) * 100) *
        Math.pow(10, 2) / Math.pow(10, 2));
        if (this.currentCov === 100) 
            console.log((this.currentCov + "% coverage.").good);
        else
            console.log((this.currentCov + "% coverage...").info2);
    }
};

Executor.prototype.setTest = function(test) {
    this.test = test;
};

Executor.prototype.wrapMUT = function(pgmInfo) {
    var i = 0;
    function wrapper(node) {
        if (node.name === 'stat'  ||
            node.name === 'throw' ||
            node.name === 'var'   ||
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
    var MUTdeclaration = pgmInfo.CUTname + ".prototype." + MUT.name + " = " + MUT.def;
    var wrapped = burrito(MUTdeclaration, wrapper);
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
            this.trapCount++;
            if (this.trapCount > TRAP_THRESHOLD) {
                throw new TrapThresholdExceeded();
            }
            if (name === "valueOf") {
                // console.log("INSIDEVALUEOF");
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
        // all of their types, so we test for test.hasUnknowns()
        __coverage__ : function(i) {
            if (!exec.test.hasUnknowns()) {
                exec.coverage[i] = true;
            }
            return function(expr) {
                return expr;
            };
        },
        
        log : console.log,
        
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
    try {
        results = vm.runInNewContext(this.vmSource, this.context);
        var after = this.covered();
        var newCoverage = after > before;
        this.updateCoverage(after, newCoverage);
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
            return {
                msg: err.toString(),
                error: true
            }
        }
    }
};


// AUXILLIARY
function isNumber (o) {
  return !isNaN(o-0) && o != null;
}

function updatePrimitiveScore(matches, primitiveScore) {
    for (var m=0; m < matches.length; m++) {
        var hint = matches[m];
        switch(hint) {
            case "++" :
            case "--" : primitiveScore.num += 10;
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
            case "&" :  primitiveScore.num += 2;
                        break;
            case ">" :
            case "<":   primitiveScore.num += 2;
                        primitiveScore.string += 1;
                        break;
            case "\"" :
                        primitiveScore.string += 5;
                        break;
        };
        if (isNumber(hint)) primitiveScore.num += 5;        
    }
}