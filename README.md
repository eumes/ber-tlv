# ber-tlv

[![npm version](https://badge.fury.io/js/ber-tlv.svg)](https://www.npmjs.com/package/ber-tlv)
[![travis status](https://travis-ci.org/eumes/ber-tlv.svg?branch=develop)](https://travis-ci.org/eumes/ber-tlv)

> Parsing and serializing TLV data

A streamlined library for creating, serializing and parsing TLV encoded data with focus on verbosity.

## Usage

### Importing the Module

```js
//typescript
import { ITlv, TlvType, TlvClass } from './node_modules/src/Tlv.ts';
import { TlvFactory, IParseError } from './node_modules/src/TlvFactory.ts';

//javascript
var ITlv = require('ber-tlv').ITlv;
var TlvType = require('ber-tlv').TlvType;
var TlvClass = require('ber-tlv').TlvClass;
var TlvFactory = require('ber-tlv').TlvFactory;
var IParseError = require('ber-tlv').IParseError;
```

### The ITlv object

```js
//some way of getting an actual item (see next paragraph)
var tlv = ...;
//the tag (as hex string)
var tag = tlv.tag;
//the type of the tag (constructed or primitive)
var type = tlv.type;
//the class of the tag (universal, application, context-specific, private)
var class = tlv.class;

//in case of a primitive, the value buffer contains the actual payload
var buffer = tlv.value;
//and in case of a constrcuted, the items array contains the pre-parsed sub items
var array = tlv.items;

//to convert the type to an actual string use
var string = TlvType[tlv.type];
//and for the class use this
var string = TlvClass[tlv.class]
```

### The TlvFactory

```js
//creating a new item is straight forward. tag and value can either be <Buffer> or <string> and the value can be omitted.
var tlv = TlvFactory.primitiveTlv(tag, value);
//the same is true for a constructed item. tag can either be <Buffer> or <string> and the value can either be another <ITlv>, <Itlv[]> or simple be omitted.
var tlv = TlvFactory.constructedTlv(tag, value);
//in case an error is encountered, an Error is thrown!

//parsing given data is also a piece of cake. Just provide the <string> or <Buffer> and get the parsed data back :)
var tlv[] = TlvFactory.parse(data);
//in case an error is encountered, an Error is trown! The error has an additional field which contains the items that were parsed before the error was encountered.
var tlv[] = error.partialTlv;

//and if you need to serialize your constructed items again, there is also a method for this available. It takes either a <ITlv> or a <ITlv[]> and returns a Buffer.
var buffer = TlvFactory.serialize(tlv);
//in case an error is encountered, an Error is thrown!
```

## Examples

### Working with High Level Constructors
```js
//primitive
var tag = '57';
var value = '2030001020'
var primitive = TlvFactory.primitiveTlv(tag, value);

//constrcuted
var tag = 'E0';
var constructed = TlvFactory.constructedTlv(tag, primitive);
```

### Parsing a String
```js
//primitives
var string = '570101';
var tlv = [];
try {
    tlv = TlvFactory.parse(string);
}
catch (error){
    //we use the partially parsed tlv and show an error message
    tlv = error.partialTlv;
    console.log(error.name);
    console.log(error.message);
}
```

## Development

### Prerequisites

The project is build on `Typescript` for strong javascript typing and uses `DefinitelyTyped` for downloading typescript definitions for development dependencies. In the end, everything is glued together by `Gulp`.

```bash
//global dependencies
npm install gulp -g
npm install typescript -g
npm install tsd -g
//and now the local dependencies
npm install
```

### Build

```bash
gulp build
```

> Note: The ts.d file for the resulting javascript is currently created manually after the build.

### Test

```bash
gulp test
```

## License
```
The MIT License (MIT)

Copyright (c) 2015 Simon Eumes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
