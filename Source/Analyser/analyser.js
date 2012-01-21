

var className = arguments[0];

function dump(obj, indent)
{
  var result = "";
  if (indent == null) indent = "";

  for (var property in obj)
  {
    var value = obj[property];
    if (typeof value == 'string')
      value = "'" + value + "'";
    else if (typeof value == 'object')
    {
      if (value instanceof Array)
      {
        // Just let JS convert the Array to a string!
        value = "[ " + value + " ]";
      }
      else
      {
        // Recursive dump
        // (replace "  " by "\t" or something else if you prefer)
        var od = dump(value, indent + "  ");
        // If you like { on the same line as the key
        //value = "{\n" + od + "\n" + indent + "}";
        // If you prefer { and } to be aligned
        value = "\n" + indent + "{\n" + od + "\n" + indent + "}";
      }
    }
    result += indent + "'" + property + "' : " + value + ",\n";
  }
  return result.replace(/,\n$/, "");
}

function arr_diff(a1, a2)
{
  var a=[], diff=[];
  for(var i=0;i<a1.length;i++)
    a[a1[i]]=true;
  for(var i=0;i<a2.length;i++)
    if(a[a2[i]]) delete a[a2[i]];
    else a[a2[i]]=true;
  for(var k in a)
    diff.push(k);
  return diff;
}

/*var globalProps = [];
for(var m in this) {
    globalProps.push({p:m, v: this[m]});
}

for (var i in globalProps) {
    print(globalProps[i].v);
}*/

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

var mixProps = [];
for(var m in this) {
    mixProps.push({p:m, v: this[m]});
}
var globalLength = globalProps.length;
var mixLength = mixProps.length;

//for (var i in mixProps) {
//    print(mixProps[i]);
//}

//print(dump(mixProps))
var classLength = globalLength - mixLength;
var classProps = mixProps.slice(classLength);

//print(dump(classProps))
//print(className);
var constructor;
for (var j in classProps) {
    if(classProps[j].v.name === className){
        constructor = classProps[j].v;
    }
}
//for (var i in classProps) {
//    print(classProps[i].v);
//}


/*for (var p in classProps.valueOf()) {
    print("--- prop ---")
    print(p)
    for (var pp in p) {
    print("-> has")        
    }
}*/

var c = new (constructor.valueOf())(3);
print(c.radius)

/*
for (var member in c) {
    if(typeof(c[member]) === "function") {
        print("---- member")
        print(member);
        print("++++ c[member]")
        print(c[member]);
        print("\n")
    }
}

*/
//c.__noSuchMethod__ = function () {print("omg no such method!");};
//c.test()



function MethodInfo(name,parameters){};

function ClassInfo(name,constructor,methods){};