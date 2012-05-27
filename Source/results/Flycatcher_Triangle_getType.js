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
var triangle17 = new Triangle(6,10,26);
triangle17.setB(28);
triangle17.setB(25);
triangle17.setC(13);
triangle17.setA(28);
assert.ok(triangle17.getType() === "PLAIN",
         'triangle17.getType() === "PLAIN"');

// Test #2
var triangle18 = new Triangle(29,29,5);
triangle18.setC(19);
triangle18.setA(13);
triangle18.setB(25);
triangle18.setB(5);
triangle18.setC(1);
triangle18.setB(19);
triangle18.setC(12);
triangle18.setA(15);
assert.ok(triangle18.getType() === "PLAIN",
         'triangle18.getType() === "PLAIN"');

// Test #3
var triangle19 = new Triangle(12,5,5);
triangle19.setA(6);
triangle19.setB(6);
triangle19.setB(7);
triangle19.setC(31);
triangle19.setC(18);
triangle19.setB(24);
triangle19.setA(3);
triangle19.setC(11);
triangle19.setB(28);
assert.ok(triangle19.getType() === "PLAIN",
         'triangle19.getType() === "PLAIN"');

// Test #4
var triangle21 = new Triangle(20,19,20);
triangle21.setA(19);
triangle21.setC(20);
triangle21.setC(19);
triangle21.setA(20);
triangle21.setB(15);
triangle21.setB(19);
triangle21.setA(22);
triangle21.setB(8);
triangle21.setA(29);
triangle21.setA(26);
assert.ok(triangle21.getType() === "PLAIN",
         'triangle21.getType() === "PLAIN"');

// Test #5
var triangle22 = new Triangle(10,10,31);
triangle22.setC(28);
triangle22.setA(31);
triangle22.setB(1);
triangle22.setC(19);
triangle22.setA(1);
triangle22.setB(28);
triangle22.setC(11);
triangle22.setB(6);
triangle22.setC(0);
triangle22.setA(22);
assert.ok(triangle22.getType() === "INVALID",
         'triangle22.getType() === "INVALID"');

// Test #6
var triangle29 = new Triangle(6,14,6);
triangle29.setA(6);
triangle29.setB(23);
triangle29.setB(2);
triangle29.setB(14);
triangle29.setC(2);
triangle29.setA(14);
assert.ok(triangle29.getType() === "ISOCELES",
         'triangle29.getType() === "ISOCELES"');

// Test #7
var triangle126 = new Triangle(8,14,28);
triangle126.setA(14);
triangle126.setA(8);
triangle126.setA(22);
triangle126.setB(9);
triangle126.setA(30);
triangle126.setA(28);
triangle126.setB(28);
assert.ok(triangle126.getType() === "EQUILATERAL",
         'triangle126.getType() === "EQUILATERAL"');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}