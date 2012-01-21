load('../utils.js');

var Analyser =
{
    getClassInfo : function(global) {
        
        function getArguments(test) {
            //print(test)
            //return this.arguments;
        }
        
        var arguments = global.arguments;
        var className = arguments[0];
        if (arguments[1]) {
            load(arguments[1]);
        }
        else {
            try {
                var fileName = className;
                fileName += ".js";
                load(fileName);
            }
            catch (exception) {
                print("--- ERROR loading file:");
                print("if no file name is provided, the file <class name provided>.js must be in the current dir.")
                quit();
            }
        }

        var props = [];
        for(var m in global) {
            props.push({p: m, v: global[m]});
        }

        var classInfo = {};
        var methods = [];
        for (var j in props) {
            if(props[j].v && props[j].v.name === className && props[j].v){
                classInfo.ctr = props[j].v.valueOf();
                
                // an instance of the class under test needs to be created in order
                // to retrieve the classe's method signatures
                var c = new (classInfo.ctr)();
                for(var m in c) {
                    if(typeof c[m] == "function") {
                        var f = function(a){};
                        //print(getArguments.apply(f,[2]));
                        methods.push({name: m, func: c[m]});
                    }
                }
            }
        }
        classInfo.methods = methods;
        return classInfo;
    }
}   

Analyser.classInfo = Analyser.getClassInfo(this);

for (var i=0; i<5; i++) {
    var testInstance = new (Analyser.classInfo.ctr)(i);
    print(testInstance.radius);
    print((Analyser.classInfo.methods[2].func).call(testInstance,Math.PI,2));
}


/*for(var i in methods) {
    if(methods[i].name === "multiplyRadius") {
        var mult = methods[i].func;
        mult.call(c,12);
        print(c.radius);
    }
}*/


//print(dump(Analyser))
//var info = Analyser.analyse();
//function MethodInfo(name,parameters){};

//function ClassInfo(name,constructor,methods){};