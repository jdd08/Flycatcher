
function Test () {
}

Test.prototype.test = function(p) {
    p - 3 & 4 || 2 >> 3 > 2 < 1 * 3 / 2 % 4 ^ 2 - ~2 << 5 >>> 3 && "hello" || "goodbye";
    p + "test";
    2 + p && p - 678123;    
}