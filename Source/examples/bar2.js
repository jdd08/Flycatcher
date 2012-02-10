function Bar(x,y,z,a,b,c) {
    this.x = x; 
    this.y = y;
    this.z = z; 
    this.a = a;
    this.b = b;
    this.c = c;
};

Bar.prototype.incX = function(){this.x++;}
Bar.prototype.decX = function(){this.x--;}
Bar.prototype.incY = function(){this.y++;}
Bar.prototype.decY = function(){this.y--;}

Bar.prototype.undertest1 = function(){

    var x= this.x;
    var y = this.y;
    var z = this.z;
    var a = this.a;
    var b = this.b;
    var c = this.c;
    
    if(x>500) {
        if (y>500) {
            if (z>500) {
                if (a>500) {
                    if (b>500) {
                        if (c>500) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                    else {
                        if (c>50) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                }
                else {
                    if (b>50) {
                        if (c>50) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                    else {
                        if (c>50) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                }
            }
            else {
                return 'c';            
            }
        }
        else {
            return 'c';            
        }
    }
    else {
        return 'c';
    }
};

Bar.prototype.undertest2 = function(){

    var x= this.x;
    var y = this.y;
    var z = this.z;
    var a = this.a;
    var b = this.b;
    var c = this.c;
    
    if(x>500) {
        if (y>500) {
            if (z>500) {
                if (a>500) {
                    if (b>500) {
                        if (c>500) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                    else {
                        if (c>50) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                }
                else {
                    if (b>50) {
                        if (c>50) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                    else {
                        if (c>50) {
                            var aa = 'a'; 
                            return aa;
                        }
                        else {
                            var ab = 'b';
                            return ab;
                        }
                    }
                }
            }
            else {
                return 'c';            
            }
        }
        else {
            return 'c';            
        }
    }
    else {
        return 'c';
    }
};