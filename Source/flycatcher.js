#!/usr/local/bin/node

var dump = require('./utils.js').dump;
var analyser = require('./analyser.js');
var randomTestGenerator = require('./randomTestGenerator.js');
var executor = require('./executor.js');

var fs = require('fs');
var vm = require('vm');

var classInfo = analyser.getClassInfo();

var validTestCases = [];
for (var i=0; i<1; i++) {
    var exploratoryTestCase = randomTestGenerator.generate(classInfo);
    var res = executor.execute(exploratoryTestCase);
    validTestCases.push({t: exploratoryTestCase,r: res});
};

var fileName = "Flycatcher_"+classInfo.className+".js";
fs.writeFileSync(fileName,testScenarios);