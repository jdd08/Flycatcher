
function Foo(a,b,c,d) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    
    function printabcdfunc() {
        //console.log('a='+this.a+' '+'b='+this.b+' '+'c='+this.c+' '+'d='+this.d+' ');
        return "printabcd";
    }

    this.printabcd = printabcdfunc;
    this.printOne = function(p) {
        //console.log(p);
        return "printOne";
    }
    
    this.printTwo = function (p,pp) {
        var text = p + " " + pp;
        //console.log(text);
        return "printTwo";
    }
    this.printThree = function (p,pp,ppp) {
        var text = p + " " + pp + " " + ppp;
        //console.log(text);
        return "printThree";
    }
    
    this.printFour = function(p,pp,ppp,pppp) {
        var text = p + " " + pp + " " + ppp + " " + pppp;
        //console.log(text);
        return "printFour";
    }
}