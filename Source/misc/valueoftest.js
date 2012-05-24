
function handlerMaker(obj) {
  return {
   getOwnPropertyDescriptor: function(name) {
     console.log("inside getOwnPropertyDescriptor");
     var desc = Object.getOwnPropertyDescriptor(obj, name);
     // a trapping proxy's properties must always be configurable
     if (desc !== undefined) { desc.configurable = true; }
     return desc;
   },
   getPropertyDescriptor:  function(name) {
     var desc = Object.getPropertyDescriptor(obj, name); // not in ES5
     // a trapping proxy's properties must always be configurable
     if (desc !== undefined) { desc.configurable = true; }
     return desc;
   },
   getOwnPropertyNames: function() {
     console.log("inside getOwnPropertyNames");
     return Object.getOwnPropertyNames(obj);
   },
   getPropertyNames: function() {
     console.log("inside getPropertNames");
     return Object.getPropertyNames(obj);                // not in ES5
   },
   defineProperty: function(name, desc) {
     console.log("inside defineProperty");
     Object.defineProperty(obj, name, desc);
   },
   delete: function(name) {
       console.log("inside delete");
       return delete obj[name];
   },
   fix: function() {
     console.log("inside fix");
     if (Object.isFrozen(obj)) {
       var result = {};
       Object.getOwnPropertyNames(obj).forEach(function(name) {
         result[name] = Object.getOwnPropertyDescriptor(obj, name);
       });
       return result;
     }
     // As long as obj is not frozen, the proxy won't allow itself to be fixed
     return undefined; // will cause a TypeError to be thrown
   },
 
   has:          function(name) { console.log("inside has"); return name in obj; },
   hasOwn:       function(name) { console.log("inside hasOwn");return ({}).hasOwnProperty.call(obj, name); },
   get:          function(receiver, name) { console.log("inside get:",name); return obj[name]; },
   set: function(receiver, name, val) { 
       console.log("inside set: ",name);
       obj[name] = val;
       return true; }, // bad behavior when set fails in non-strict mode
   enumerate:    function() {
     console.log("inside enumerate");
     var result = [];
     for (var name in obj) { result.push(name); };
     return result;
   },
   keys: function() { console.log("inside keys"); return Object.keys(obj); } 
  };
}


function O(){};
O.prototype.valueOf = function() {
    process.stdout.write("valueOf called!");
    return 5;
}

O.prototype.toString = function() {
    process.stdout.write("toString called!");
    return "HARLEARIO";
}

console.log("Arithmetic Operators");
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o+2 "); o+2; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o-3 "); o-3; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o*4 "); o*4; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o/5 "); o/5; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o%6 "); o/5; console.log();

// ALSO A STRING OPERATOR
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("2+o "); 2+o; console.log();

var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("3-o "); 3-o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("4*o "); 4*o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("5/o "); 5/o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("6%o "); 6%o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o++ "); o++; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("++o "); ++o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o-- "); o--; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("--o "); --o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("-o "); -o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("+o "); +o; console.log();
console.log();

console.log("Assignment Operators");
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o = 123 "); o = 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o *= 123 "); o *= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o /= 123 "); o /= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o %= 123 "); o %= 123; console.log();

// ALSO A STRING OPERATOR
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o += 123 "); o += 123; console.log();

var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o -= 123 "); o -= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o <<= 123 "); o <<= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o >>= 123 "); o >>= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o >>>= 123 "); o >>>= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o &= 123 "); o &= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o ^= 123 "); o ^= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o |= 123 "); o |= 123; console.log();
console.log();

console.log("Bitwise Operators");
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o & 1 "); o & 1; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o | 1 "); o | 1; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o ^ 1 "); o ^ 1; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("~o "); ~o; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o<<1 "); o<<1; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o>>1 "); o>>1; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o>>>1 "); o>>>1; console.log();
console.log();

console.log("Comparison Operators");
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o == 'abc' "); o == 'abc'; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o != 'abc' "); o != 'abc'; console.log();

// For INVARIANT reasons, the === operator isn't trapped in order
// to keep the language consistency
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o === 'abc' "); o === 'abc'; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o !== 'abc' "); o !== 'abc'; console.log();

var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o > 123 "); o > 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o >= 123 "); o >= 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o < 123 "); o < 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o <= 123 "); o <= 123; console.log();
console.log();

console.log("Logical Operators");
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o || true "); o || false; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o && false "); o && true; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("!o "); !o; console.log();
console.log();

console.log("Member Operators");
var a = [1,2,3];
process.stdout.write("a[o] "); a[o]; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o[1] "); o[1]; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o.a = 123 "); o.a = 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o['asda'] = 123 "); o['asda'] = 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("var b = o; b.a; "); var b = o; b.a;; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("o.abc = 3; var c = o; c.abc = 123 "); o.abc = 3; var c = o; c.abc = 123; console.log();
var obj = new O();
var o = Proxy.create(handlerMaker(obj));
process.stdout.write("Object.seal(obj); Object.seal(o); "); Object.seal(obj); Object.seal(o); console.log();
// Object.getOwnPropertyDescritpor etc. do not tell us more about the object (apart from maybe that it's not a
// primitive) so these can probably be ignored + some of them are not even in ES5
console.log();
