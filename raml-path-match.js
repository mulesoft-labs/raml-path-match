const extend = require('xtend')
const ramlSanitize = require('raml-sanitize')()

/**
 * Expose `ramlPathMatch`.
 */
module.exports = ramlPathMatch

/**
 * Map RAML types to basic regexp patterns.
 *
 * @type {Object}
 */
const REGEXP_MATCH = {
  number: '[-+]?\\d+(?:\\.\\d+)?',
  integer: '[-+]?\\d+',
  date: '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \\d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4} (?:[0-1]\\d|2[0-3]):[0-5]\\d:[0-5]\\d GMT',
  boolean: '(?:true|false)'
}

/**
 * Escape all regexp characters.
 *
 * @type {RegExp}
 */
const ESCAPE_CHARACTERS = /([.*+?=^!:${}()|[\]/\\])/g

/**
 * Static regexp for replacing parameters.
 *
 * @type {RegExp}
 */
const REGEXP_REPLACE = new RegExp([
  // Match RAML parameters with an optional prefix.
  '([\\.\\/])?\\{(\\+)?((?:[\\w]|%[0-9abcde]{2})(?:[\\w\\.]|%[0-9abcde]{2})*)\\}',
  // Match any escape characters.
  ESCAPE_CHARACTERS.source
].join('|'), 'ig')

/**
 * Convert the route into a regexp using the passed in parameters.
 *
 * @param  {String} path
 * @param  {Object<String:webapi-parser.Parameter>}   paramsMap
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function toRegExp (path, paramsMap, keys, options) {
  const end = options.end !== false
  const strict = options.strict
  let flags = ''
  const used = {}

  // Allow case insensitivity.
  if (!options.sensitive) {
    flags += 'i'
  }

  // Replace path parameters and transform into a regexp.
  let route = path.replace(
    REGEXP_REPLACE,
    function (match, prefix, modifier, key, escape) {
      if (escape) {
        return '\\' + escape
      }

      // Decode URI parameters in variable name.
      const name = decodeURIComponent(key)

      // Push the current key into the keys array.
      keys.push({
        name: name,
        prefix: prefix || '/'
      })

      // Default the prefix to an empty string for simpler concatination.
      prefix = prefix ? '\\' + prefix : ''

      // Use the param type and if it doesn't exist, fallback to matching
      // the entire segment.
      const expanded = modifier === '+'
      const paramConfig = extractParamConfig(paramsMap[name])
      const param = extend({ type: 'string', required: true }, paramConfig)
      let capture = (
        REGEXP_MATCH[param.type] ||
        (expanded ? '.*?' : '[^' + (prefix || '\\/') + ']+'))

      // Cache used parameters.
      used[name] = param

      // Allow support for enum values as the regexp match.
      if (Array.isArray(param.enum)) {
        capture = '(?:' + param.enum.map(value => {
          return String(value).replace(ESCAPE_CHARACTERS, '\\$1')
        }).join('|') + ')'
      }

      // Return the regexp as a matching group.
      return prefix + '(' + capture + ')' +
        (param.required === false ? '?' : '')
    }
  )

  const endsWithSlash = path.endsWith('/')

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return {
    regexp: new RegExp('^' + route, flags),
    params: used
  }
}

/**
 * Generate the match function based on a route and RAML params object.
 *
 * @param  {String}   path
 * @param  {Array<webapi-parser.Parameter>}   params
 * @param  {Object}   options
 * @return {Function}
 */
function ramlPathMatch (path, params = [], options = {}) {
// function ramlPathMatch (path, schema, options) {
  options = options || {}

  // Fast slash support.
  if (path === '/' && options.end === false) {
    return truth
  }

  const paramsMap = Object.fromEntries(
    params.map(p => [p.name.value(), p]))
  const keys = []
  const result = toRegExp(path, paramsMap, keys, options)
  const sanitize = ramlSanitize(Object.values(result.params))

  /**
   * Return a static, reusable function for matching paths.
   *
   * @param  {String}           pathname
   * @return {(Object|Boolean)}
   */
  async function pathMatch (pathname) {
    const match = result.regexp.exec(pathname)

    if (!match) {
      return false
    }

    const path = match[0]
    const params = {}

    for (let i = 1; i < match.length; i++) {
      const key = keys[i - 1]
      params[key.name] = match[i]
    }

    // If the parameters fail validation, return `false`.
    const promises = Object.entries(params).map(([name, val]) => {
      return paramsMap[name].validate(val)
        .then(report => report.conforms)
    })
    const reports = await Promise.all(promises)
    if (reports.includes(false)) {
      return false
    }

    return {
      path: path,
      params: sanitize(params)
    }
  }

  /**
   * Adds more params to match path against.
   * Leaves only params with unique names.
   *
   * @param  {Array<webapi-parser.Parameter>}   moreParams
   */
  pathMatch.update = function update (moreParams) {
    const moreParamsMap = {
      ...paramsMap,
      ...Object.fromEntries(moreParams.map(p => [p.name.value(), p]))
    }
    return ramlPathMatch(path, Object.values(moreParamsMap), options)
  }

  return pathMatch
}

/**
 * Always match this path.
 *
 * @return {Object}
 */
function truth () {
  return { path: '', params: {} }
}

/**
 * Extracts necessary config from Parameter.
 *
 * @param  {webapi-parser.Parameter} param
 * @return {Object}
 */
function extractParamConfig (param) {
  if (!param) {
    return {}
  }
  const shape = param.schema
  const conf = {
    type: getShapeType(shape),
    required: param.required.value() || false
  }
  if (shape.values && shape.values.length > 0) {
    conf.enum = shape.values.map(val => val.value.value())
  }
  return conf
}

/**
 * Returns a one-word string representing a shape type.
 *
 * @param  {webapi-parser.AnyShape} shape
 * @return  {string|Array<string>}
 */
function getShapeType (shape) {
  // ScalarShape
  if (shape.dataType !== undefined) {
    return shape.dataType.value().split('#').pop()
  }
  // UnionShape
  if (shape.anyOf !== undefined) {
    return shape.anyOf.map(getShapeType)
  }
  // ArrayShape
  if (shape.items !== undefined) {
    return 'array'
  }
  // NodeShape
  if (shape.properties !== undefined) {
    return 'object'
  }
}
