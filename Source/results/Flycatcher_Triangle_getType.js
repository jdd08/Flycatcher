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
var triangle79 = new Triangle(25,2,2);
triangle79.setA(25);
triangle79.setA(13);
triangle79.setA(4);
assert.ok(triangle79.getType() === "INVALID",
         'triangle79.getType() === "INVALID"');

// Test #2
var triangle80 = new Triangle(19,11,28);
triangle80.setA(24);
triangle80.setA(24);
triangle80.setC(21);
triangle80.setA(31);
assert.ok(triangle80.getType() === "PLAIN",
         'triangle80.getType() === "PLAIN"');

// Test #3
var triangle82 = new Triangle(25,25,21);
triangle82.setA(19);
triangle82.setC(18);
triangle82.setA(2);
triangle82.setC(18);
triangle82.setA(19);
triangle82.setA(18);
triangle82.setA(21);
assert.ok(triangle82.getType() === "PLAIN",
         'triangle82.getType() === "PLAIN"');

// Test #4
var triangle83 = new Triangle(15,10,4);
triangle83.setB(0);
triangle83.setA(22);
triangle83.setC(0);
triangle83.setB(0);
triangle83.setC(4);
triangle83.setA(10);
triangle83.setB(10);
assert.ok(triangle83.getType() === "ISOCELES",
         'triangle83.getType() === "ISOCELES"');

// Test #5
var triangle85 = new Triangle(31,11,31);
triangle85.setA(1);
triangle85.setA(11);
triangle85.setB(16);
triangle85.setC(6);
triangle85.setC(3);
triangle85.setC(30);
triangle85.setC(15);
assert.ok(triangle85.getType() === "PLAIN",
         'triangle85.getType() === "PLAIN"');

// Test #6
var triangle177 = new Triangle(11,2,16);
triangle177.setB(16);
triangle177.setA(16);
assert.ok(triangle177.getType() === "EQUILATERAL",
         'triangle177.getType() === "EQUILATERAL"');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}