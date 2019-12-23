# RAML Path Match

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Greenkeeper badge](https://badges.greenkeeper.io/mulesoft-labs/raml-path-match.svg)](https://greenkeeper.io/)

Path matching utility based on the [RAML spec](https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md#template-uris-and-uri-parameters).

## Installation

```shell
npm install raml-path-match --save
```

## Usage

You must require the module and call it as a function with options to get the path matching utility back.

```javascript
const ramlPathMatch = require('raml-path-match')

// Initialization Options
const options = {}

// Array<webapi-parser.Parameter>
const parameters = getParametersSomehow()

// Create a simple path matching instance.
const pathMatch = ramlPathMatch('/{route}', parameters, options)

pathMatch('/test'); //=> { match: '/test', params: { route: 'test' } }
```

### Initialization Options

* **end** - When set to `false`, the route will only match the beginning of paths.
* **strict** - When set to `true`, the route must match exactly without trailing slash.
* **sensitive** - When set to `true`, the route will be case-sensitive.

### Routes

The route is a string that can be interpolated with parameters. E.g. `/{route}`.

### Parameters

Parameters in the route string must be defined as an array of [webapi-parser](https://github.com/raml-org/webapi-parser) `Parameter` objects.

#### Optional parameters

Parameters can be optional according to the [RAML spec](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#required). With optional parameters, `/{route}` will match just `/`. When the parameter is optional and not matched, the parameter value will be set to `undefined`.

### Matching the path

The path matching instance will return a function after you give it the route template. This function is used to match the current path against the route template. If the route does not match, `false` is returned. If it does match, an object will be returned.

```javascript
{
  match: '/123',
  params: {
    route: 123
  }
}
```

The above is an example of passing the path `/123` to the result of the previous example. Notice that parameters will be automatically sanitized to the native JavaScript types.

### Updates

You can merge more parameters into the path after creation using `pathMatch.update(params)`. It'll return a new patch matching function.

## License

Apache 2.0

[npm-image]: https://img.shields.io/npm/v/raml-path-match.svg?style=flat
[npm-url]: https://npmjs.org/package/raml-path-match
[travis-image]: https://img.shields.io/travis/mulesoft-labs/raml-path-match.svg?style=flat
[travis-url]: https://travis-ci.org/mulesoft-labs/raml-path-match
[coveralls-image]: https://img.shields.io/coveralls/mulesoft-labs/raml-path-match.svg?style=flat
[coveralls-url]: https://coveralls.io/r/mulesoft-labs/raml-path-match?branch=master
