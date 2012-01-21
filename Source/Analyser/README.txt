README for Analyser
-------------------

* To run analyser.js on a file that contains a class, say Foo, run: d8 analyser.js -- Foo
* d8 does not implement __noSuchMethod__ but *does* implement the Proxy class that does the same, it is enabled with the option --harmony_proxies
* Many other options exist for d8 (see d8 --help) that should be investigated to check for ones that would help with coverage info collection