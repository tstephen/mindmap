Mind Map tool
=============

An experimental / prototype of mind mapping in a browser.

## License

GPL v2 or later

## Features

- Load mm files (such as those edited with FreeMind) after addition of diagram information
- Polyfill stylesheet to create default diagram information, for example:
  ```
    xsltproc -o test.mm src/xslt/polyfill.xslt src/animal-kingdom.mm
  ```
- Move existing shapes around
- Save updated file

## TODO

- make polyfill repeatable
- add edges to polyfill
- create new mindmap
- create new shapes (new child node; new peer node) 
- rename node
- link nodes
- undo?
- test, test, test
