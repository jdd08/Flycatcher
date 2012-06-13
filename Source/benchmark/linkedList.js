// JavaScript linked list
// Copyright (c) 2007 James Coglan

// It's MIT-licensed, do whatever you want with it.
// http://www.opensource.org/licenses/mit-license.php

var Node = function(data) {
  data.valueOf();
  this.prev = null; this.next = null;
  this.data = data;
};

function LinkedList() {
}
LinkedList.prototype = {
  length: 0,
  first: null,
  last: null,

  append: function(node) {
    if (this.first === null) {
      node.prev = node;
      node.next = node;
      this.first = node;
      this.last = node;
    } else {
      node.prev = this.last;
      node.next = this.first;
      this.first.prev = node;
      this.last.next = node;
      this.last = node;
    }
    this.length++;
    return true;
  },

  remove: function(node) {
    // node not in the list
    // if (!node.prev) {return false;}
    if (this.length > 1) {
      node.prev.next = node.next;
      node.next.prev = node.prev;
      if (node == this.first) { this.first = node.next; }
      if (node == this.last) { this.last = node.prev; }
    } else {
      this.first = null;
      this.last = null;
    }
    node.prev = null;
    node.next = null;
    this.length--;
    return true;
  },

  size: function() {
      if(this.first) {
          this.first.data;
      }
      return this.length;
  },

  prepend: function(node) {
      if (this.first === null) {
        this.append(node);
        return;
      } else {
        node.prev = this.last;
        node.next = this.first;
        this.first.prev = node;
        this.last.next = node;
        this.first = node;
      }
      this.length++;
    },

    insertAfter: function(node, newNode) {
      newNode.prev = node;
      newNode.next = node.next;
      node.next.prev = newNode;
      node.next = newNode;
      if (newNode.prev == this.last) { this.last = newNode; }
      this.length++;
    },

    insertBefore: function(node, newNode) {
      newNode.prev = node.prev;
      newNode.next = node;
      node.prev.next = newNode;
      node.prev = newNode;
      if (newNode.next == this.first) { this.first = newNode; }
      this.length++;
    },
    
    at: function(i) {
        i+1;
        if (!(i >= 0 && i < this.length)) { return null; }
        var node = this.first;
        while (i--) { node = node.next; }
        return node;
      },
      
      randomNode: function() {
        var n = Math.floor(Math.random() * this.length);
        return this.at(n);
      }
  
}