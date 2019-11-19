/* global describe, it */

const expect = require('chai').expect
const util = require('util')
const pathMatch = require('./')
const wp = require('webapi-parser')
const domain = wp.model.domain

function asParam (shape) {
  return new domain.Parameter()
    .withName('param')
    .withSchema(shape)
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
    {},
    '/test',
    { path: '/test', params: { route: 'test' } }
  ],
  [
    '/{route}',
    {},
    '/',
    false
  ],
  /**
   * String parameters.
   */
  [
    '/{route}',
    {
      route: { type: 'string' }
    },
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
    {
      route: { type: 'string' }
    },
    '/',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'string' }
    },
    '/test/something',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'string', pattern: '\\d+' }
    },
    '/test',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'string', pattern: '\\d+' }
    },
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
    {
      route: { type: 'string', minLength: 5 }
    },
    '/test',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'string', minLength: 5 }
    },
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
    {
      route: { type: 'string', maxLength: 5 }
    },
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
    {
      route: { type: 'string', maxLength: 5 }
    },
    '/something',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'string', enum: ['test'] }
    },
    '/something',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'string', enum: ['test'] }
    },
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
    {
      route: { type: 'number' }
    },
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
    {
      route: { type: 'number' }
    },
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
    {
      route: { type: 'number' }
    },
    '/test',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'number', minimum: 5 }
    },
    '/1',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'number', minimum: 5 }
    },
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
    {
      route: { type: 'number', maximum: 5 }
    },
    '/6',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'number', maximum: 5 }
    },
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
    {
      route: { type: 'integer' }
    },
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
    {
      route: { type: 'integer' }
    },
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
    {
      route: { type: 'integer' }
    },
    '/10.5',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'integer' }
    },
    '/abc',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'integer', minimum: 5 }
    },
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
    {
      route: { type: 'integer', maximum: 5 }
    },
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
    {
      route: { type: 'boolean' }
    },
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
    {
      route: { type: 'boolean' }
    },
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
    {
      route: { type: 'boolean' }
    },
    '/test',
    false
  ],
  /**
   * Not required.
   */
  [
    '/{route}',
    {
      route: { type: 'string', required: false }
    },
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
    {
      route: { type: 'string', required: false }
    },
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
    {
      route: { type: 'string' }
    },
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
    {
      route: { type: 'string' }
    },
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
    {
      route: { type: 'string' }
    },
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
    {
      route: { type: 'integer' }
    },
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
    {
      route: { type: 'string' }
    },
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
    {},
    '/test',
    {
      path: '/test',
      params: {}
    },
    { sensitive: true }
  ],
  [
    '/test',
    {},
    '/TEST',
    false,
    { sensitive: true }
  ],
  /**
   * Decode URI parameters.
   */
  [
    '/{route}',
    {
      route: { type: 'string' }
    },
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
    {
      random: { type: 'string', required: true }
    },
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
    {
      'a~b': { type: 'number', required: true }
    },
    '/abc',
    false
  ],
  /**
   * Path expansion.
   */
  [
    '/{+file}',
    {},
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
    TESTS.forEach(function (test) {
      const route = test[0]
      const params = test[1]
      const path = test[2]
      const match = test[3]
      const options = test[4]

      // Dynamically build the test description.
      const description = [
        util.inspect(route),
        (match ? 'should' : 'should not'),
        'match',
        util.inspect(path)
      ]

      // Push the options definition onto the description.
      if (options) {
        description.push('with options', util.inspect(options))
      }

      // Run the test.
      it(description.join(' '), function () {
        const test = pathMatch(route, params, options)
        const result = test(path)

        expect(result).to.deep.equal(match)
      })
    })
  })

  it('should update path matchers immutably', function () {
    const pathMatch1 = pathMatch('/{slug}')
    const pathMatch2 = pathMatch1.update({ slug: { enum: ['valid'] } })
    const pathMatch3 = pathMatch2.update({ random: { type: 'number' } })

    expect(pathMatch1).to.not.equal(pathMatch2)
    expect(pathMatch2).to.equal(pathMatch3)

    const match1 = pathMatch1('/test')
    const match2 = pathMatch2('/invalid')
    const match3 = pathMatch2('/valid')

    expect(match1).to.deep.equal({ path: '/test', params: { slug: 'test' } })
    expect(match2).to.equal(false)
    expect(match3).to.deep.equal({ path: '/valid', params: { slug: 'valid' } })
  })
})
