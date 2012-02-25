

function Foo(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z;
}

Foo.prototype.foo1 = function() {
    return "foo1 " + this.x + this.y + this.z;
}

Foo.prototype.foo2 = function() {
    return "foo2" + this.x + this.y + this.z;    
}

function Point(foo) {
    this.x = 1;
    this.y = 1;
}

Point.prototype.incX = function() {
//    this.foo.foo1();
//    this.x++;   
}

Point.prototype.incY = function() {
//    this.foo.foo2();
//    this.y++;
}


function Quadrilateral(topRight,topLeft,bottomRight,bottomLeft) {
/*
    // All arguments are in effect Proxy objects which return
    // function Proxies such that the return values of get operations
    // on the proxies can be either called or dereferenced.
    // This is so that the execution of the constructor is unperturbed
    // and the signatures can be obtained for the various classes.

    // Primitive operations are dealt with too (see below).
    
    // setting proxy property
    topRight.a = 123;
    // getting proxy property
    topRight.b;
    delete topRight.a;
    // calling proxy's method
    topRight.foo();
    // calling proxy's method result;
    topRight.foo().test();
    // getting proxy's method result's property;
    topRight.foo().field;
    // setting proxy's method result's property;
    topRight.foo().field = 3;


    // calling proxy's property's method
    topRight.a.f();
    // getting proxy's property's property
    topRight.a.f;
    // setting proxy's property's property
    topRight.a.f = 234;
    
    // If a primitive operation is executed on a proxy parameter
    // this leads to a valueOf() call which is trapped and returns
    // the number 1. As can be seen below, no primitive operation
    // throws an exception when used with a primitive number,
    // which enables the constructor to execute till the end
    // and yield constructor and method signatures for all classes
    // (manually thrown exception are however not tolerated in constructors) 

    // LOGICAL OPERATORS
    log("LOGICAL OPERATORS")

    // proxy does not call valueOf()
    log(topRight && true);
    log(true || topRight)
    log(!topRight)
    log()

    // COMPARISON OPERATORS
    log("COMPARISON OPERATORS")

    log("-> string comparison")
    log(topRight == 'hello');
    log(topRight > 'hello')
    log(topRight >= 'hello')
    log(topRight < 'hello')
    log(topRight <= 'hello')
    log()

    // proxy does not call valueOf()
    log(topRight !== 'hello')
    log(topRight === 'hello')
    log(topRight !== 'hello')
    log()

    log("-> boolean comparison")
    log(topRight == true);
    log(topRight > true)
    log(topRight >= true)
    log(topRight < true)
    log(topRight <= true)
    log()
    
    // proxy does not call valueOf()
    log(topRight !== true)
    log(topRight === true)
    log(topRight !== true)
    log()

    log("-> number comparison")
    log(topRight == 123);
    log(topRight > 123)
    log(topRight >= 123)
    log(topRight < 123)
    log(topRight <= 123)
    log()
    
    // proxy does not call valueOf()
    log(topRight !== 123)
    log(topRight === 123)
    log(topRight !== 123)
    log()

    log("-> object comparison")
    log(topRight == {});
    log(topRight > {})
    log(topRight >= {})
    log(topRight < {})
    log(topRight <= {})
    log()
    
    // proxy does not call valueOf()
    log(topRight !== {})
    log(topRight === {})
    log(topRight !== {})
    log()
    
    // STRING OPERATORS
    log("STRING OPERATORS")
    log(topRight + "hi")
    var a = topRight;
    a += "hi";
    log(a)
    log()
    
    // BITWISE OPERATORS
    log("BITWISE OPERATORS")
    log(topRight & 3)
    log(topRight | 3)
    log(topRight ^ 3)
    log(~topRight)
    log(topRight << 1)
    log(topRight >> 1)
    log(topRight >>> 1)
    log()

    // ARITHMETIC OPERATORS
    log("ARITHMETIC OPERATORS")
    log(topRight + 3);
    log(topRight - 3);
    log(topRight * 3);
    log(topRight / 3);
    log(topRight % 3);
    log(-topRight);
    log(+topRight);
    
    // ASSIGNMENT OPERATORS all make use of
    // ARITHMETIC OPERATORS so if the above
    // work these will work too, only they
    // will change the parameter's value
*/
    bottomRight.incX();
    topRight.incY();
    topLeft.incY();
    bottomLeft.incY();
    this.topRight = topRight;
    this.topLeft = topLeft;
    this.bottomRight = bottomRight;
    this.bottomLeft = bottomLeft;
}

Quadrilateral.prototype.incTopRightX = function(n) {
    n.incX();
}

Quadrilateral.prototype.incTopLeftX = function(n) {
    n.incX();
}

Quadrilateral.prototype.incBottomRightX = function(n) {
    n.incX();
}

Quadrilateral.prototype.incBottomLeftX = function(n) {
    n.incX();
}

Quadrilateral.prototype.incTopRightY = function(n) {
    n.incY();
}

Quadrilateral.prototype.intTopLeftY = function(n) {
    n.incY();
}

Quadrilateral.prototype.incBottomRightY = function(n) {
    n.incY();
}

Quadrilateral.prototype.incBottomLeftY = function(n) {
    n.incY();
}

Quadrilateral.prototype.getCoords = function(n,m) {
    
    n.incX();
    var r = Math.random();
    if (r < 0.1) {
        Math.random();
    }
    else if (r < 0.2) {
        Math.random();
    }
    else if (r < 0.3) {
        Math.random();
    }
    else if (r < 0.4) {
        Math.random();
    }
    else if (r < 0.5) {
        Math.random();
    }
    else if (r < 0.6) {
        Math.random();
    }
    else if (r < 0.7) {
        Math.random();
    }
    else if (r < 0.8) {
        Math.random();
    }
//    m.incY();
    /*var tr = this.topRight;
    var tl = this.topLeft;
    var br = this.bottomRight;
    var bl = this.bottomleft;

    if(tr.y > 1) {
        var f = new Foo(1,2,3);
    }
    if(tr.x > 1) {
        var f = new Foo(1,2,3);
    }
    
    if(tr.y > 2) {
        var f = new Foo(1,2,3);
    }
    if(tr.x > 2) {
        var f = new Foo(1,2,3);
    }
    
    if(tr.y > 3) {
        var f = new Foo(1,2,3);
    }
    if(tr.x > 3) {
        var f = new Foo(1,2,3);
    }
    if(tr.y > 4) {
        var f = new Foo(1,2,3);
    }
    if(tr.x > 4) {
        var f = new Foo(1,2,3);
    }
    var res = this.topRight.x + " " + this.topRight.y + ", ";
    res += this.topLeft.x + " " + this.topLeft.y + ", ";
    res += this.bottomRight.x + " " + this.bottomRight.y + ", ";
    res += this.bottomLeft.x + " " + this.bottomLeft.y;*/
    return "HARO";
}