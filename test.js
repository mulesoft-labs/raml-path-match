/* global describe, it, before */

const expect = require('chai').expect
const util = require('util')
const ramlPathMatch = require('./')
const wp = require('webapi-parser')
const domain = wp.model.domain

const TYPES = {
  string: 'http://www.w3.org/2001/XMLSchema#string',
  number: 'http://a.ml/vocabularies/shapes#number',
  integer: 'http://www.w3.org/2001/XMLSchema#integer',
  boolean: 'http://www.w3.org/2001/XMLSchema#boolean',
  date: 'http://www.w3.org/2001/XMLSchema#date',
  dateTime: 'http://www.w3.org/2001/XMLSchema#dateTime',
  dateTimeOnly: 'http://a.ml/vocabularies/shapes#dateTimeOnly'
}

function asParams (shape, required = true, name = 'route') {
  return [
    new domain.Parameter()
      .withName(name)
      .withSchema(shape)
      .withRequired(required)
  ]
}

/**
 * An array of tests to execute. The tests come in the format:
 * ["route", "params", "path", "matches", "options"]
 *
 * @type {Array}
 */
const TESTS = [
  /**
   * Basic tests.
   */
  [
    '/',
    null,
    '/',
    { path: '/', params: {} }
  ],
  [
    '/',
    null,
    '/route',
    false
  ],
  [
    '/route',
    null,
    '/route',
    { path: '/route', params: {} }
  ],
  [
    '/route',
    null,
    '/test',
    false
  ],
  /**
   * Undocumented parameters.
   */
  [
    '/{route}',
    [],
    '/test',
    { path: '/test', params: { route: 'test' } }
  ],
  [
    '/{route}',
    [],
    '/',
    false
  ],
  /**
   * String parameters.
   */
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/test',
    {
      path: '/test',
      params: {
        route: 'test'
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/test/something',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withPattern('\\d+')),
    '/test',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withPattern('\\d+')),
    '/123',
    {
      path: '/123',
      params: {
        route: '123'
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withMinLength(5)),
    '/test',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withMinLength(5)),
    '/something',
    {
      path: '/something',
      params: {
        route: 'something'
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withMaxLength(5)),
    '/test',
    {
      path: '/test',
      params: {
        route: 'test'
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withMaxLength(5)),
    '/something',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withValues([
        new domain.ScalarNode('test', 'string')
      ])),
    '/something',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.string)
      .withValues([
        new domain.ScalarNode('test', 'string')
      ])),
    '/test',
    {
      path: '/test',
      params: {
        route: 'test'
      }
    }
  ],
  /**
   * Number parameters.
   */
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.number)),
    '/123',
    {
      path: '/123',
      params: {
        route: 123
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.number)),
    '/123.5',
    {
      path: '/123.5',
      params: {
        route: 123.5
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.number)),
    '/test',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.number)
      .withMinimum(5)),
    '/1',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.number)
      .withMinimum(5)),
    '/6',
    {
      path: '/6',
      params: {
        route: 6
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.number)
      .withMaximum(5)),
    '/6',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.number)
      .withMaximum(5)),
    '/-3',
    {
      path: '/-3',
      params: {
        route: -3
      }
    }
  ],
  /**
   * Integer parameters.
   */
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.integer)),
    '/-3',
    {
      path: '/-3',
      params: {
        route: -3
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.integer)),
    '/10',
    {
      path: '/10',
      params: {
        route: 10
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.integer)),
    '/10.5',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.integer)),
    '/abc',
    false
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.integer)
      .withMinimum(5)),
    '/10',
    {
      path: '/10',
      params: {
        route: 10
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route')
      .withDataType(TYPES.integer)
      .withMaximum(5)),
    '/1',
    {
      path: '/1',
      params: {
        route: 1
      }
    }
  ],
  /**
   * Boolean parameters
   */
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.boolean)),
    '/true',
    {
      path: '/true',
      params: {
        route: true
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.boolean)),
    '/false',
    {
      path: '/false',
      params: {
        route: false
      }
    }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.boolean)),
    '/test',
    false
  ],
  /**
   * Not required.
   */
  [
    '/{route}',
    asParams(
      new domain.ScalarShape().withName('route').withDataType(TYPES.string),
      false),
    '/test',
    {
      path: '/test',
      params: {
        route: 'test'
      }
    }
  ],
  [
    '/{route}',
    asParams(
      new domain.ScalarShape().withName('route').withDataType(TYPES.string),
      false),
    '/',
    {
      path: '/',
      params: {
        route: undefined
      }
    }
  ],
  /**
   * Extension parameters.
   */
  [
    '/test.{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/test.json',
    {
      path: '/test.json',
      params: {
        route: 'json'
      }
    }
  ],
  /**
   * Non-ending mode.
   */
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/test',
    {
      path: '/test',
      params: {
        route: 'test'
      }
    },
    { end: false }
  ],
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/test/route',
    {
      path: '/test',
      params: {
        route: 'test'
      }
    },
    { end: false }
  ],
  /**
   * Trailing parameters.
   */
  [
    '/test{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.integer)),
    '/test123',
    {
      path: '/test123',
      params: {
        route: 123
      }
    }
  ],
  [
    '/test{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/testabc',
    {
      path: '/testabc',
      params: {
        route: 'abc'
      }
    }
  ],
  /**
   * Case sensitive.
   */
  [
    '/test',
    [],
    '/test',
    {
      path: '/test',
      params: {}
    },
    { sensitive: true }
  ],
  [
    '/test',
    [],
    '/TEST',
    false,
    { sensitive: true }
  ],
  /**
   * Decode URI parameters.
   */
  [
    '/{route}',
    asParams(new domain.ScalarShape().withName('route').withDataType(TYPES.string)),
    '/test%2Fexample',
    {
      path: '/test%2Fexample',
      params: {
        route: 'test%2Fexample'
      }
    }
  ],
  /**
   * Ignore unused params.
   */
  [
    '/path',
    asParams(
      new domain.ScalarShape().withName('random').withDataType(TYPES.string),
      true, 'random'),
    '/path',
    {
      path: '/path',
      params: {}
    }
  ],
  /**
   * Encoded keys.
   */
  [
    '/{a%7Eb}',
    asParams(
      new domain.ScalarShape().withName('a~b').withDataType(TYPES.number),
      true, 'a~b'),
    '/abc',
    false
  ],
  /**
   * Path expansion.
   */
  [
    '/{+file}',
    [],
    '/path/to/file',
    {
      path: '/path/to/file',
      params: {
        file: 'path/to/file'
      }
    }
  ]
]

describe('raml-path-match', function () {
  before(async function () {
    await wp.WebApiParser.init()
  })
  /**
   * Generate and run the test suite from an array of tests.
   */
  describe('functional tests', function () {
    TESTS.forEach(([route, params, path, match, options]) => {
      // Dynamically build the test description.
      const description = [
        util.inspect(route),
        (match ? 'should' : 'should not'),
        'match',
        util.inspect(path),
        'with output object',
        util.inspect(match)
      ]

      // Push the options definition onto the description.
      if (options) {
        description.push('with options', util.inspect(options))
      }

      // Run the test.
      it(description.join(' '), async function () {
        const pathMatch = ramlPathMatch(route, params, options)
        const result = await pathMatch(path)
        expect(result).to.deep.equal(match)
      })
    })
  })

  it('should update path matchers immutably', async function () {
    const pathMatch1 = ramlPathMatch('/{slug}')
    const pathMatch2 = pathMatch1.update(
      asParams(
        new domain.ScalarShape().withName('slug')
          .withDataType(TYPES.string)
          .withValues([new domain.ScalarNode('valid', 'string')]),
        true, 'slug')
    )

    const match1 = await pathMatch1('/test')
    const match2 = await pathMatch2('/invalid')
    const match3 = await pathMatch2('/valid')

    expect(match1).to.deep.equal({ path: '/test', params: { slug: 'test' } })
    expect(match2).to.equal(false)
    expect(match3).to.deep.equal({ path: '/valid', params: { slug: 'valid' } })
  })
})
