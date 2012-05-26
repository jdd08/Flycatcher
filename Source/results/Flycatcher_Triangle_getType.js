/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: Triangle
        METHOD: getType

*******************************************/

var assert = require('assert');


function Triangle(a,b,c) {
    this.a = a;
    this.b = b;
    this.c = c;
}

Triangle.prototype.setA = function(a) {
    this.a = a;
}

Triangle.prototype.setB = function(b) {
    this.b = b;
}

Triangle.prototype.setC = function(c) {
    this.c = c;
}

Triangle.prototype.getType = function() {
    
    function swap(a,b) {
        var tmp = a;
        a = b;
        b = tmp;
    }
    
    var type = 'PLAIN';
    var a = this.a;
    var b = this.b;
    var c = this.c;

    // swap sides such that a, b and c
    // are ranked from longest to smallest
    if (a<b) {
        swap(a,b);
    }
    if (a<c) {
        swap(a,c);
    }
    if (b<c && !isNaN(b)) {
        swap(b,c);
    }
    
    // checking triangle inequality i.e. making sure
    // that the longest side is smaller than the sum
    // of the other two
    if (a<(b+c)) {
        if (a === b && b === c) {
                type = 'EQUILATERAL';
        }
        else if (a === b || b === c) {
            type = 'ISOCELES';
        }
    }
    else {
        type = 'INVALID';
    }
    return type;
}

/*Triangle.prototype.printType = function(printStream) {
    printStream.output(this.type);
}*/


try {

// Test #1
var triangle94 = new Triangle(0,19,27);
triangle94.setC(2);
assert.ok(triangle94.getType() === "PLAIN",
         'triangle94.getType() === "PLAIN"');

// Test #2
var triangle98 = new Triangle(23,14,12);
triangle98.setC(23);
triangle98.setC(23);
assert.ok(triangle98.getType() === "PLAIN",
         'triangle98.getType() === "PLAIN"');

// Test #3
var triangle103 = new Triangle(17,17,5);
triangle103.setB(3);
assert.ok(triangle103.getType() === "INVALID",
         'triangle103.getType() === "INVALID"');

// Test #4
var triangle108 = new Triangle(9,9,30);
triangle108.setB(24);
triangle108.setA(24);
triangle108.setB(9);
triangle108.setB(24);
triangle108.setC(19);
assert.ok(triangle108.getType() === "ISOCELES",
         'triangle108.getType() === "ISOCELES"');

// Test #5
var triangle285 = new Triangle(5,16,5);
triangle285.setC(24);
triangle285.setB(24);
triangle285.setA(24);
assert.ok(triangle285.getType() === "EQUILATERAL",
         'triangle285.getType() === "EQUILATERAL"');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}