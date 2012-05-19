/*********** DISCLAIMER **************

    The code in this file is inspired
    by　and makes use of the unlicensed,
    open source code available at the
    time of edition, at:

 https://github.com/substack/node-bunker

***************************************/

var dump = require('./utils.js').dump;

var burrito = require('burrito');
var vm = require('vm');
var _ = require('underscore');
var beautify = require('./beautify-js/beautify.js');
var EventEmitter = require('events').EventEmitter;

var Executor = module.exports.Executor = function(src,classes,CUTname) 
{
    this.test = {};
    this.nodes = [];
    this.coverage = [];
    this.nodeNum = 0;
    this.currentCov = 0;

    // only used when the mut is not specified
    this.mutIndex = 0;

    this.names = {
        call: burrito.generateName(6),
        expr: burrito.generateName(6),
        stat: burrito.generateName(6)
    };

    this.original = src;
    this.context = this.createContext(classes);
    this.mut = this.createMut(classes[CUTname]);

    this.on('node',
    function(node) {
        // -1 is because we ignore the first node (the MUT definition)
        this.coverage[node.id - 1] = true;
        //console.log(node.id + ": " + node.source())
    });

    this.on('cov',
    function(currentCoverage, good) {
        this.currentCov = Math.round((currentCoverage / this.nodeNum * 100) *
        Math.pow(10, 2) / Math.pow(10, 2));
        if (good) {
            process.stdout.write("\b\b"+this.currentCov);
        }
    });
}

Executor.prototype = new EventEmitter;

Executor.prototype.getCoverage = function() {
    return this.currentCov;
}

Executor.prototype.setTest = function(test) {
    this.test = test;
};

Executor.prototype.createMut = function(classInfo, index) {
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
    var mut = burrito(def,
    function(node) {
        var i = nodes.length;
        if (node.name === 'call') {
            nodes.push(node);
            n++;
            node.wrap(names.call + '(' + i + ')(%s)');
        }
        else if (node.name === 'stat' || node.name === 'throw'
        || node.name === 'var') {
            nodes.push(node);
            n++;
            node.wrap('{' + names.stat + '(' + i + ');%s}');
        }
        else if (node.name === 'binary') {
            nodes.push(node);
            n++;
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        else if (node.name === 'unary-postfix' || node.name === 'unary-prefix') {
            nodes.push(node);
            n++;
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        // if the node does not correspond to any of the node types above
        // (like the very last one) no need to set its id as this node is
        // effectively ignored (it is not pushed onto the nodes array)
        if (i !== nodes.length) {
            node.id = i;
        }
    });
    
    // initialising coverage tracker
    // n-- is for ignoring the first node which was for the MUT definition
    n--;
    for (var c = 0; c < n; c++) {
        this.coverage[c] = false;
    }
    this.nodeNum = n;
    return mut;
}

function createExecHandler(classes) {

    var Handler = function(CUTname, methodName, paramIndex) {
        this.CUTname = CUTname;
        this.methodName = methodName;
        this.paramIndex = paramIndex;
        this.classes = classes;
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
//            console.log(name)
            var methodName = this.methodName;

/*            console.log(_.find(this.classes[this.CUTname].methods,function(elem){
                return elem.name === methodName;
            }))
            console.log(this.isConstructorParam())

            console.log(this.CUTname)
            console.log(this.paramIndex)
            console.log("this.methodName",this.methodName)
            console.log("method to add",name)
*/

            // TODO index this.methodName directly vs filter
            var paramInfo = this.isConstructorParam() ?
                this.classes[this.CUTname].ctr.params[this.paramIndex] :
                _.find(this.classes[this.CUTname].methods,function(elem){
                    return elem.name === methodName;
                }).params[this.paramIndex];
            paramInfo.push(name);
            if (name === "valueOf") {
                return function() {
                    return 2;
                }
            }
/*            else if (name === "toString") {
                return function() {
                    return "HARO!";
                }
            }
*/
            else {
                var self = this;
                return Proxy.createFunction(self,
                    function() {
                        return Proxy.create(self)
                });
            }
        },

        // proxy[name] = value
        set: function(receiver, name, value) {
            console.log(name)
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
    context.proxy = function(o,CUTname,methodName,paramIndex) {
        var p = getProperties(o);
        var prox = Object.create(
            Object.create(Proxy.create(new Handler(CUTname,methodName,paramIndex)),p.proto),
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
            self.emit('node', node, stack);
        }
        return function(expr) {
            stack.shift();
            return expr;
        };
    };

    context[self.names.expr] = function(i) {
        if (!self.test.hasUnknowns()) {
            var node = self.nodes[i];
            self.emit('node', node, stack);
        }
        return function(expr) {
            return expr;
        };
    };

    context[self.names.stat] = function(i) {
        if (!self.test.hasUnknowns()) {
            var node = self.nodes[i];
            self.emit('node', node, stack);            
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
    return (this.coverage.filter(_.identity)).length;
}

Executor.prototype.run = function() {
    var src = this.original + '\n' + this.mut + '\n' + this.test.toExecutorFormat();
    if (!this.mut) {
        console.warn("Warning: Executor.mut is an empty string")
    }
    if (!this.test) {
        console.warn("Warning: Executor.test is empty")
    }
    var before = this.covered();
    var res = {};
    try {
        res = vm.runInNewContext(src, this.context);
    }
    catch(err) {
        console.log(err.stack)
        console.log("caught " + err);
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
