Flycatcher
=====================

Todo
----
* use Proxy to catch method calls and fill in the parameters' method lists so that they can be instantiated to the appropriate class

Issues
----
* implement analyser for literal objects i.e. not created with a constructor
* problem when method under test calls a function -- should it be part of the coverage? if so the burrito wrapping should be made quite sophisticated, in a way that a method is wrapped such that it conditionally logs coverage if it is called from the MUT (it could be called from another method in which case it should not contribute to the coverage measure)
* Flycatcher assumes that the constructor of the CUT *does not crash* when used to instantiate an object -> however a no such method exception handler/undefined handler needs to be implemented for the parameters of the constructor so that it doesn't crash for that reason (these handlers need not do anything except prevent a crash - all that is needed at this stage is the signatures of the methods)
* only classes that are declared can be used as parameters, otherwise they can't be instantiated as there will be no analyser info for them
* an issue that will need looking into is how to catch *real* errors such as `o.fooz()` instead of `o.foo()` as opposed to when o should actually have a `fooz` method but it does not have it because it is of the wrong type and needs to be instantiated to something else