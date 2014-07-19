var ramlSanitize = require('raml-sanitize')();
var ramlValidate = require('raml-validate')();

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
 * @param  {String} route
 * @param  {Object} params
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
var toRegExp = function (route, params, keys, options) {
  var end    = options.end !== false;
  var strict = options.strict;
  var flags  = '';

  // Allow case insensitivity.
  if (!options.sensitive) {
    flags += 'i';
  }

  // Replace route parameters and transform into a regexp.
  route = route.replace(
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
      var param    = params[key] || {};
      var type     = param.type;
      var capture  = REGEXP_MATCH[type] || '[^' + (prefix || '\\/') + ']+';
      var optional = param.required === false;

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

  if (route[route.length - 1] !== '/') {
    // If we are doing a non-ending match, we need to prompt the matching
    // groups to match as much as possible. To do this, we add a positive
    // lookahead for the next path fragment or the end. However, if the regexp
    // already ends in a path fragment, we'll run into problems.
    if (!end) {
      route += '(?=\\/|$)';
    }

    // Allow trailing slashes to be matched in non-strict, ending mode.
    if (end && !strict) {
      route += '\\/?';
    }
  }

  return new RegExp('^' + route + (end ? '$' : ''), flags);
};

/**
 * Attempt to uri decode a parameter.
 *
 * @param  {String} param
 * @return {String}
 */
var decodeParam = function (param) {
  try {
    return decodeURIComponent(param);
  } catch (_) {
    var err = new Error('Failed to decode param "' + param + '"');
    err.status = 400;
    throw err;
  }
};

/**
 * Match RAML paths in a reusable fashion. This function is purely for
 * initializing the path match instance with an options object.
 *
 * @param  {Object}   options
 * @return {Function}
 */
module.exports = function (options) {
  options = options || {};

  /**
   * Generate the match function based on a route and RAML params object.
   *
   * @param  {String}   route
   * @param  {Object}   schema
   * @return {Function}
   */
  return function (route, schema) {
    // Fallback to providing the schema object when undefined.
    schema = schema || {};

    var keys     = [];
    var re       = toRegExp(route, schema, keys, options);
    var sanitize = ramlSanitize(schema);
    var validate = ramlValidate(schema);

    /**
     * Finally returns a static, reusable function for matching paths.
     *
     * @param  {String}           path
     * @return {(Object|Boolean)}
     */
    return function (path) {
      var matches = re.exec(path);

      // Return `false` when the match failed.
      if (!matches) {
        return false;
      }

      // Convert the matches into a parameters object.
      var params = {};

      // Iterate over each of the matches and put them the params object based
      // on the key name.
      for (var i = 1; i < matches.length; i++) {
        var key   = keys[i - 1];
        var param = matches[i];

        params[key.name] = param == null ? param : decodeParam(param);
      }

      // Sanitize the parameters.
      params = sanitize(params);

      // If the parameters fail validation, return `false`.
      if (!validate(params).valid) {
        return false;
      }

      // Return the match object.
      return {
        match:  matches[0],
        params: params
      };
    };
  };
};
