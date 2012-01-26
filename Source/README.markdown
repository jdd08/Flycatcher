README for Flycatcher
=====================

Notes
-----

* To run flycatcher.js on a file that contains a class, say Foo, run: d8 flycatcher.js -- Foo
* d8 does not implement `__noSuchMethod__` but *does* implement the Proxy class that does the same, it is enabled with the option --harmony_proxies
* Many other options exist for d8 (see d8 --help) that should be investigated to check for ones that would help with coverage info collection
* Flycatcher assumes that the constructor of the CUT *does not crash* when used to instantiate an object -> however a no such method exception handler/undefined handler needs to be implemented for the parameters of the constructor so that it doesn't crash for that reason (these handlers need not do anything except prevent a crash - all that is needed at this stage is the signatures of the methods)

Todo
----

* implement analyser for literal objects i.e. not created with a constructor
* problem when method under test calls a function -- should it be part of the coverage? if so the burrito wrapping should be made quite sophisticated, in a way that a method is wrapped such that it conditionally logs coverage if it is called from the MUT (it could be called from another method in which case it should not contribute to the coverage measure)
* getting the number of nodes from a method (and its possibly sub-methods) such that the coverage retrieved can be mapped onto a target set of nodes and coverage percentage can be returned for a MUT