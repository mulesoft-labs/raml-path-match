var expect    = require('chai').expect;
var util      = require('util');
var pathMatch = require('./');

/**
 * An array of tests to execute. The tests come in the format:
 * ["route", "params", "path", "matches", "options"]
 *
 * @type {Array}
 */
var TESTS = [
  /**
   * Basic tests.
   */
  [
    '/',
    null,
    '/',
    { match: '/', params: {} }
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
    { match: '/route', params: {} }
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
    { match: '/test', params: {} }
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
      match: '/test',
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
      match: '/123',
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
      match: '/something',
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
      match: '/test',
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
      match: '/test',
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
      match: '/123',
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
      match: '/123.5',
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
      match: '/6',
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
      match: '/-3',
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
      match: '/-3',
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
      match: '/10',
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
      match: '/10',
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
      match: '/1',
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
      match: '/true',
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
      match: '/false',
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
      match: '/test',
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
      match: '/',
      params: {
        route: undefined
      }
    }
  ],
  /**
   * Repeated parameters.
   */
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true }
    },
    '/',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true, required: false }
    },
    '/',
    {
      match: '/',
      params: {
        route: []
      }
    }
  ],
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true }
    },
    '/test',
    {
      match: '/test',
      params: {
        route: ['test']
      }
    }
  ],
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true }
    },
    '/test/route',
    {
      match: '/test/route',
      params: {
        route: ['test', 'route']
      }
    }
  ],
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true, enum: ['test'] }
    },
    '/test',
    {
      match: '/test',
      params: {
        route: ['test']
      }
    }
  ],
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true, enum: ['test'] }
    },
    '/test/something',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'integer', repeat: true }
    },
    '/abc/123',
    false
  ],
  [
    '/{route}',
    {
      route: { type: 'integer', repeat: true }
    },
    '/123/456',
    {
      match: '/123/456',
      params: {
        route: [123, 456]
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
      match: '/test.json',
      params: {
        route: 'json'
      }
    }
  ],
  [
    '/test.{route}',
    {
      route: { type: 'string', repeat: true }
    },
    '/test.json.html',
    {
      match: '/test.json.html',
      params: {
        route: ['json', 'html']
      }
    }
  ],
  [
    '/test.{route}',
    {
      route: { type: 'string', repeat: true, enum: ['json', 'html'] }
    },
    '/test.json.html',
    {
      match: '/test.json.html',
      params: {
        route: ['json', 'html']
      }
    }
  ],
  [
    '/test.{route}',
    {
      route: { type: 'string', repeat: true, enum: ['json', 'html'] }
    },
    '/test.json.erb',
    false
  ],
  [
    '/test.{route}',
    {
      route: { type: 'integer', repeat: true }
    },
    '/test.1.2.3',
    {
      match: '/test.1.2.3',
      params: {
        route: [1, 2, 3]
      }
    }
  ],
  [
    '/test.{route}',
    {
      route: { type: 'number', repeat: true }
    },
    '/test.1.2.3',
    {
      match: '/test.1.2.3',
      params: {
        route: [1, 2, 3]
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
      match: '/test',
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
      match: '/test',
      params: {
        route: 'test'
      }
    },
    { end: false }
  ],
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true }
    },
    '/test/route',
    {
      match: '/test/route',
      params: {
        route: ['test', 'route']
      }
    },
    { end: false }
  ],
  [
    '/{route}',
    {
      route: { type: 'string', repeat: true, enum: ['test'] }
    },
    '/test',
    {
      match: '/test',
      params: {
        route: ['test']
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
      match: '/test123',
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
      match: '/testabc',
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
      match: '/test',
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
];

describe('raml-path-match', function () {
  /**
   * Generate and run the test suite from an array of tests.
   */
  describe('functional tests', function () {
    TESTS.forEach(function (test) {
      var route   = test[0];
      var params  = test[1];
      var path    = test[2];
      var match   = test[3];
      var options = test[4];

      // Dynamically build the test description.
      var description = [
        util.inspect(route),
        (match ? 'should' : 'should not'),
        'match',
        util.inspect(path)
      ];

      // Push the options definition onto the description.
      if (options) {
        description.push('with options', util.inspect(options));
      }

      // Run the test.
      it(description.join(' '), function () {
        var test   = pathMatch(options)(route, params);
        var result = test(path);

        expect(result).to.deep.equal(match);
      });
    });
  });
});
