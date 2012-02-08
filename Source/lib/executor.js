/*********** DISCLAIMER **************

    The code in this file is inspired
    by/makes use of the unlicensed,
    open source code available at the
    time of edition, at:

 https://github.com/substack/node-bunker

***************************************/

var dump = require('./utils.js').dump;

var burrito = require('burrito');
var vm = require('vm');
var EventEmitter = require('events').EventEmitter;

module.exports = function () {
    var b = new Executor();
    return b;
};

function Executor () {
    this.source = "";
    this.mut = "";
    this.test = "";
    this.nodes = [];
    this.cov = [];
    this.coverageNodes = {};
    this.names = {
        call : burrito.generateName(6),
        expr : burrito.generateName(6),
        stat : burrito.generateName(6)
    };
}

Executor.prototype = new EventEmitter;

Executor.prototype.addSource = function (src) {
    this.source = src;
    return this;
};

Executor.prototype.setTest = function (test) {
    this.test = test;
    return this;
};

Executor.prototype.setMUT = function(classInfo) {
    var nodes = this.nodes;
    var names = this.names;
    var cov = this.cov;
    var def = classInfo.name + ".prototype.MUT = "+classInfo.mut.def;
    var mut = burrito(def, function (node) {
        var i = nodes.length;
        if (node.name === 'call') {
            nodes.push(node);
            cov.push({src:node.source(),exec:false});
            node.wrap(names.call + '(' + i + ')(%s)');
        }
        else if (node.name === 'stat' || node.name === 'throw'
        || node.name === 'var') {
            nodes.push(node);
            cov.push({src:node.source(),exec:false});
            node.wrap('{' + names.stat + '(' + i + ');%s}');
        }
        else if (node.name === 'binary') {
            nodes.push(node);
            cov.push({src:node.source(),exec:false});
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        else if (node.name === 'unary-postfix' || node.name === 'unary-prefix') {
            nodes.push(node);
            cov.push({src:node.source(),exec:false});
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        // if the node does not correspond to any of the node types above
        // (like the very last one) no need to set its id as this node is
        // effectively ignored (it is not pushed onto the nodes array)
        if (i !== nodes.length) {
            node.id = i;
        }
    });

    // ignoring the first node which contains the MUT definition
    this.mut = mut;
    this.coverageNodes = cov.slice(1);
}

Executor.prototype.getCoverageNodes = function() {
    return this.coverageNodes;
}

Executor.prototype.assign = function (context) {
    if (!context) context = {};
    
    var self = this;
    var stack = [];
    
    context[self.names.call] = function (i) {
        var node = self.nodes[i];
        stack.unshift(node);
        self.emit('node', node, stack);
        
        return function (expr) {
            stack.shift();
            return expr;
        };
    };
    
    context[self.names.expr] = function (i) {
        var node = self.nodes[i];
        self.emit('node', node, stack);
        
        return function (expr) {
            return expr;
        };
    };
    
    context[self.names.stat] = function (i) {
        var node = self.nodes[i];
        self.emit('node', node, stack);
    };
    
    return context;
};
    
Executor.prototype.display = function() {
    console.log('-------------- SOURCE -----------------');
    console.log(this.source);
    console.log('---------------------------------------');
    console.log('-------------- MUT --------------------');
    console.log(this.mut);
    console.log('---------------------------------------');
    console.log('-------------- TEST -------------------');
    console.log(this.test);
    console.log('---------------------------------------');    
}

function getCoverage(coverageNodes) {
    var nodesCovered = [];
    for (var n in coverageNodes) {
        if (coverageNodes[n].exec) {
            nodesCovered.push(n);
        }
    }
    return nodesCovered;
}

Executor.prototype.execute = function() {
    var counts = {};
    var coverageNodes = this.coverageNodes;
    
    // TODO: calculate before after coverage difference more efficiently
    var nodesBefore = getCoverage(coverageNodes);
    var good = false;
    this.on('node', function (node) {
        if (!counts[node.id]) {
            counts[node.id] = { times : 0, node : node };
        }
        counts[node.id].times ++;
    });
    
    var res = this.run();
    Object.keys(counts).forEach(function (key) {
        if(key > '0'){
            var count = counts[key];
            // console.log(key + ' : ' + count.node.source() + " name: " + count.node.name + " line: " + count.node.start.line);
            // relevant nodes are indexed from 1 but the array starts from 0 for convenience
            coverageNodes[key-1].exec = true;
        }
    })
    var nodesAfter = getCoverage(coverageNodes);
    return {good : !(nodesAfter.length === nodesBefore.length), result : res};
}

Executor.prototype.run = function (context) {
    var src = this.source + '\n' + this.mut + '\n' + this.test;
    if (!this.mut) {
        console.warn("Warning: Executor.mut is an empty string")
    }
    if (!this.mut) {
        console.warn("Warning: Executor.test is an empty string")
    }
    var res = vm.runInNewContext(src, this.assign(context));
    return res;
};
