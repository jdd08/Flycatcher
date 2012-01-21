load('../utils.js')

var className = arguments[0];
if (arguments[1]) {
    load(arguments[1]);
}
else {
    try {
        var fileName = arguments[0];
        fileName += ".js";
        load(fileName);
    }
    catch (exception) {
        print("--- ERROR loading file:");
        print("if no file name is provided, the file <class name provided>.js must be in the current dir.")
        quit();
    }
}

// TODO : check whether name conflicts can occur with the loaded class
var props = [];
for(var m in this) {
    props.push(this[m]);
}

var constructor;
var methods = [];
for (var j in props) {
    if(props[j] && props[j].name === className){
        constructor = props[j].valueOf();
        var c = new (constructor)(4);
        for(var m in c) {
            if(typeof c[m] == "function") {
                methods.push({name: m, func: c[m]});
            }
        }
        for(var i in methods) {
            if(methods[i].name === "multiplyRadius") {
                var mult = methods[i].func;
                mult.call(c,12);
                print(c.radius);
            }
        }
    }
}

function MethodInfo(name,parameters){};

function ClassInfo(name,constructor,methods){};