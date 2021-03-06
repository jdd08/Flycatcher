function Triangle(a,b,c) {
    this.a = a;
    this.b = b;
    this.c = c;
}

Triangle.prototype.setA = function(a) {
    this.a = a;
    return a;
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
    var type = 'PLAIN';
    var a = this.a;
    var b = this.b;
    var c = this.c;
    // swap sides such that a, b and c
    // are ranked from longest to smallest
    if (a<b) {
        var tmp = a;
        a = b;
        b = tmp;
    }
    if (a<c) {
        var tmp = a;
        a = c;
        c = tmp;
    }
    if (b<c) {
        var tmp = b;
        b = c;
        c = tmp;
    }
    
    // checking triangle inequality i.e. making sure
    // that the longest side is smaller than the sum
    // of the other two
    if (a<(b+c)) {
        if (a === b && b === c) type = 'EQUILATERAL';
        else if (a === b || b === c) type = 'ISOCELES';
    }
    else {
        type = 'INVALID';
    }
    return type;
}

exports.Triangle = Triangle;