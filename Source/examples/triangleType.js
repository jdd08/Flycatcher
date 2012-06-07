
function Triangle(a,b,c) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.t = null;
}
Triangle.prototype.setT = function() {
     this.t = new Triangle(1,2,3);
     return this;
};


// Triangle.prototype.toString = function() {
//     return "{a:"+this.a+", b:"+this.b+", c:"+this.t+"}";
// }

Triangle.prototype.setA = function(a) {
    this.a = a;
    return this;
}

Triangle.prototype.setB = function(b) {
    this.b = b;
    return b;
}

Triangle.prototype.setC = function(c) {
    this.c = c;
    return c;
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
    if (b<c) {
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
