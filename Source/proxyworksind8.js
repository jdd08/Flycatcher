
var handler = {
    getOwnPropertyDescriptor: function(name) {
        print("getOwnPropDes")
        var desc = Object.getOwnPropertyDescriptor(this, name);
        // a trapping proxy's properties must always be configurable
        if (desc !== undefined) {
            desc.configurable = true;
        }
        return desc;
    },
    getPropertyDescriptor: function(name) {
        print("getPropDes")
        var desc = Object.getPropertyDescriptor(this, name);
        // not in ES5
        // a trapping proxy's properties must always be configurable
        if (desc !== undefined) {
            desc.configurable = true;
        }
        return desc;
    },
    getOwnPropertyNames: function() {
        print("getOwnProp")
        return Object.getOwnPropertyNames(this);
    },
    getPropertyNames: function() {
        print("inside getPropertyNames")
        return Object.getPropertyNames(this);
        // not in ES5
    },
    defineProperty: function(name, desc) {
            print("inside defineProp")
        Object.defineProperty(this, name, desc);
    },
    get: function(rcvr, p) {
      return function(){return "tried to call " + p};
    },
    delete: function(name) {
        print("inside delete")        
        return delete this[name];
    },
    fix: function() {
        print("inside fix")        
        if (Object.isFrozen(obj)) {
            var result = {};
            Object.getOwnPropertyNames(obj).forEach(function(name) {
                result[name] = Object.getOwnPropertyDescriptor(this, name);
            });
            return result;
        }
        // As long as obj is not frozen, the proxy won't allow itself to be fixed
        return undefined;
        // will cause a TypeError to be thrown
    },

    has: function(name) {
        print("inside has")
        return name in this;
    },
    hasOwn: function(name) {
        print("inside hasOwn")
        return ({}).hasOwnProperty.call(this, name);
    },
    set: function(receiver, name, val) {
        print("inside set")        
        this[name] = val;
        return true;
    },
    // bad behavior when set fails in non-strict mode
    enumerate: function() {
        print("inside enumerate")
        var result = [];
        for (var name in this) {
            result.push(name);
        };
        return result;
    },
    keys: function() {
        print("inside keys")
        return Object.keys(this);
    },
}

function getOwnPropertyDescriptors(obj) {
    var props = {};
    for (var i in obj) {
        props[i] = Object.getOwnPropertyDescriptor(obj,i);
    }
    return props;
}

var obj = {
    foo : function() {
        return "foo";
    },
    b : 42,
    c : 123
}

var p = Proxy.create(handler);
//print(p.a)
function Q() {};
Q.prototype = Object.create(p,getOwnPropertyDescriptors(obj));

var q = new Q();
print(q.foo())

