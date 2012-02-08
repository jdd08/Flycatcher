// Testing bunker & burrito

var bunker = require('bunker');
var fs = require('fs');
var dump = require('./utils').dump;
var assert = require('assert');

var b = bunker();
var src = fs.readFileSync('simplebar.js','utf8');
var mut = "undertest1";
b.addSource(src,'Bar',mut);
//dump(b.compile());

//var test = fs.readFileSync('bartest.js','utf8');
var test = "new Bar()";
b.addTest(test);

var counts = {};

b.on('node', function (node) {
    if (!counts[node.id]) {
        counts[node.id] = { times : 0, node : node };
    }
    counts[node.id].times ++;
});

var bunkerContext = {assert: assert};
b.run(bunkerContext);

Object.keys(counts).forEach(function (key) {
    var count = counts[key];
    console.log(count.times + ' : ' + count.node.source() + " name: " + count.node.name + " line: " + count.node.start.line);
    console.log(count.node.node)
})