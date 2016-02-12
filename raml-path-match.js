var ramlSanitize = require('raml-sanitize')();
var ramlValidate = require('raml-validate')();

/**
 * Expose `ramlPathMatch`.
 */
module.exports = ramlPathMatch;

/**
 * Map RAML types to basic regexp patterns.
 *
 * @type {Object}
 */
var REGEXP_MATCH = {
  number:  '[-+]?\\d+(?:\\.\\d+)?',
  integer: '[-+]?\\d+',
  date:    '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \\d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4} (?:[0-1]\\d|2[0-3]):[0-5]\\d:[0-5]\\d GMT',
  boolean: '(?:true|false)'
};

/**
 * Escape all regexp characters.
 *
 * @type {RegExp}
 */
var ESCAPE_CHARACTERS = /([.*+?=^!:${}()|[\]\/\\])/g;

/**
 * Static regexp for replacing parameters.
 *
 * @type {RegExp}
 */
var REGEXP_REPLACE = new RegExp([
  // Match RAML parameters with an optional prefix.
  '([.\\/])?\\{([^}]+)\\}',
  // Match any escape characters.
  ESCAPE_CHARACTERS.source
].join('|'), 'g');

/**
 * Convert the route into a regexp using the passed in parameters.
 *
 * @param  {String} path
 * @param  {Object} params
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function toRegExp (path, params, keys, options) {
  var end    = options.end !== false;
  var strict = options.strict;
  var flags  = '';
  var used   = {};

  // Allow case insensitivity.
  if (!options.sensitive) {
    flags += 'i';
  }

  // Replace path parameters and transform into a regexp.
  var route = path.replace(
    REGEXP_REPLACE,
    function (match, prefix, key, escape) {
      if (escape) {
        return '\\' + escape;
      }

      // Push the current key into the keys array.
      keys.push({
        name:   key,
        prefix: prefix || '/'
      });

      // Default the prefix to an empty string for simpler concatination.
      prefix = prefix ? '\\' + prefix : '';

      // Use the param type and if it doesn't exist, fallback to matching
      // the entire segment.
      var param    = params[key] || { type: 'string', required: true };
      var type     = param.type;
      var capture  = REGEXP_MATCH[type] || '[^' + (prefix || '\\/') + ']+';
      var optional = param.required === false;

      // Cache used parameters.
      used[key] = param;

      // Allow support for enum values as the regexp match.
      if (Array.isArray(param.enum)) {
        capture = '(?:' + param.enum.map(function (value) {
          return String(value).replace(ESCAPE_CHARACTERS, '\\$1');
        }).join('|') + ')';
      }

      // Return the regexp as a matching group.
      return prefix + '(' + capture + ')' + (optional ? '?' : '');
    }
  );

  var endsWithSlash = path.charAt(path.length - 1) === '/';

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
  }

  if (end) {
    route += '$';
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)';
  }

  return {
    regexp: new RegExp('^' + route + (end ? '$' : ''), flags),
    params: used
  };
}

/**
 * Generate the match function based on a route and RAML params object.
 *
 * @param  {String}   path
 * @param  {Object}   schema
 * @param  {Object}   options
 * @return {Function}
 */
function ramlPathMatch (path, schema, options) {
  options = options || {};

  // Fast slash support.
  if (path === '/' && options.end === false) {
    return truth;
  }

  // Fallback to providing the schema object when undefined.
  schema = schema || {};

  var keys     = [];
  var result   = toRegExp(path, schema, keys, options);
  var sanitize = ramlSanitize(result.params);
  var validate = ramlValidate(result.params);

  /**
   * Return a static, reusable function for matching paths.
   *
   * @param  {String}           pathname
   * @return {(Object|Boolean)}
   */
  return function (pathname) {
    var m = result.regexp.exec(pathname);

    if (!m) {
      return false;
    }

    var path = m[0];
    var params = {};

    for (var i = 1; i < m.length; i++) {
      var key = keys[i - 1];
      params[key.name] = m[i];
    }

    params = sanitize(params);

    // If the parameters fail validation, return `false`.
    if (!validate(params).valid) {
      return false;
    }

    return {
      path: path,
      params: params
    };
  };
}

/**
 * Always match this path.
 *
 * @return {Object}
 */
function truth () {
  return { path: '', params: {} };
}
