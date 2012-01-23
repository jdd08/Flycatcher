README for Flycatcher
-------------------

* To run flycatcher.js on a file that contains a class, say Foo, run: d8 analyser.js -- Foo
* d8 does not implement __noSuchMethod__ but *does* implement the Proxy class that does the same, it is enabled with the option --harmony_proxies
* Many other options exist for d8 (see d8 --help) that should be investigated to check for ones that would help with coverage info collection
* Flycatcher assumes that the constructor of the CUT *does not crash* when used to instantiate an object -> however a no such method exception handler/undefined handler needs to be implemented for the parameters of the constructor so that it doesn't crash for that reason (these handlers need not do anything except prevent a crash - all that is needed at this stage is the signatures of the methods)

* TODO

- implement analyser for literal objects i.e. not created with a constructor