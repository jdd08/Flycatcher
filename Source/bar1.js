var doNothing = function(a){a++; return a;};

function Bar(x,y) {
    this.x = x; 
    this.y = y;
    
    /*this.undertest2 = function() {
        var x= this.x;
        var y = this.y;

        if(x>1) {
            if (y>1) {
                var one = 1; 
                return doNothing(one);
            } 
            else {
                var two = 2;
                return doNothing(two);
            }
        } 
        else {
            if (y>1){
                var three = 3;
                return doNothing(three);
            } 
            else {
                var four = 4;
                return doNothing(four);
            }
        }
    };*/
};

Bar.prototype.incX = function(){this.x++;}
Bar.prototype.decX = function(){this.x--;}
Bar.prototype.incY = function(){this.y++;}
Bar.prototype.decY = function(){this.y--;}

Bar.prototype.undertest1 = function(brap){

    var x= this.x;
    var y = this.y;
    
    if(x>50) {
        if (y>50) {
            var one = 1;
            one++;
            return doNothing(one);
        } 
        else {
            var two = 2;
            two++;
            return doNothing(two);
        }
    } 
    else {
        if (y>50){
            var three = 3;
            three++;
            return doNothing(three);
        } 
        else {
            var four = 4;
            four++;
            return doNothing(four);
        }
    }

};

Bar.prototype.incX2 = function(){this.x++;}
Bar.prototype.decX2 = function(){this.x--;}
Bar.prototype.incY2 = function(){this.y++;}
Bar.prototype.decY2 = function(){this.y--;}
