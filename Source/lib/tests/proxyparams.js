function Test(proxy) {
    
// TESTING GET AND SET DERIVED TRAPS

proxy + 1;
proxy.toString();
proxy.f;
proxy.f.f;
proxy.f.m();
proxy.f + 1;
proxy.f.toString();
proxy.f = 3;

proxy.m;
proxy.m();
proxy.m().f;
proxy.m().m();
proxy.m.valueOf();
proxy.m.toString();
proxy.m = function(){};

// TESTING FUNDAMENTAL TRAPS (the ones in ES5)

Object.getOwnPropertyDescriptor(proxy,'m');
Object.getOwnPropertyNames(proxy);
Object.defineProperty(proxy,{});
delete proxy.m;
}

Test.prototype.test = function() {
};