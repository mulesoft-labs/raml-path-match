const ramlSanitize = require('raml-sanitize')()
const wp = require('webapi-parser')

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
  const replaces = {}
  const matches = []
  let mch
  while ((mch = REGEXP_REPLACE.exec(path)) !== null) {
    matches.push(mch)
  }

  let i
  for (i = 0; i < matches.length; i++) {
    let [match, prefix, modifier, key, escape] = matches[i]
    if (escape) {
      replaces[match] = '\\' + escape
      continue
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
    const paramEl = patchParameter(paramsMap[name], name)
    const param = extractBasicParamConfig(paramEl)

    let capture = (
      REGEXP_MATCH[param.type] ||
      (expanded ? '.*?' : '[^' + (prefix || '\\/') + ']+'))

    // Cache used parameters.
    used[name] = paramEl

    // Allow support for enum values as the regexp match.
    if (Array.isArray(param.enum)) {
      capture = '(?:' + param.enum.map(value => {
        return String(value).replace(ESCAPE_CHARACTERS, '\\$1')
      }).join('|') + ')'
    }

    // Return the regexp as a matching group.
    replaces[match] = prefix + '(' + capture + ')' +
      (param.required === false ? '?' : '')
  }

  let routeRe = path.replace(REGEXP_REPLACE, match => replaces[match])
  // replaces.forEach(repl => {
  //   routeRe = routeRe.replace(REGEXP_REPLACE, repl)
  // })

  const endsWithSlash = path.endsWith('/')

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    routeRe = (endsWithSlash ? routeRe.slice(0, -2) : routeRe) + '(?:\\/(?=$))?'
  }

  if (end) {
    routeRe += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    routeRe += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return {
    regexp: new RegExp('^' + routeRe, flags),
    params: used
  }
}

/**
 * Generate the match function based on a route and RAML params object.
 *
 * @param  {String}   path
 * @param  {Array.<webapi-parser.Parameter>}   params
 * @param  {Object}   options
 * @return {Function}
 */
function ramlPathMatch (path, params, options = {}) {
  options = options || {}
  // Fast slash support.
  if (path === '/' && options.end === false) {
    return truth
  }

  params = params || []

  const paramsMap = {}
  params.forEach(param => {
    paramsMap[param.name.value()] = param
  })
  const keys = []
  const result = toRegExp(path, paramsMap, keys, options)

  /**
   * Return a static, reusable function for matching paths.
   *
   * @param  {String}           pathname
   * @return {(Object|Boolean)}
   */
  async function pathMatch (pathname) {
    const sanitize = ramlSanitize(Object.values(result.params))
    const match = result.regexp.exec(pathname)

    if (!match) {
      return false
    }

    const newPath = match[0]
    let paramsValues = {}

    for (let i = 1; i < match.length; i++) {
      const key = keys[i - 1]
      paramsValues[key.name] = match[i]
    }

    paramsValues = sanitize(paramsValues)

    // If the parameters fail validation, return `false`.
    const promises = Object.entries(result.params)
      .map(([name, param]) => {
        let prom
        if (param.schema) {
          prom = param.schema.validate(
            JSON.stringify(paramsValues[name]) || '')
        } else {
          /* Params without schema are considered to be required strings.
          Thus perform simple validation of value presence. */
          prom = Promise.resolve({ conforms: !!paramsValues[name] })
        }
        return prom.then(report => report.conforms)
      })
    const reports = await Promise.all(promises)
    if (reports.includes(false)) {
      return false
    }
    return {
      path: newPath,
      params: paramsValues
    }
  }

  /**
   * Adds more params to match path against.
   * Leaves only params with unique names.
   *
   * @param  {Array.<webapi-parser.Parameter>}   moreParams
   */
  pathMatch.update = function update (moreParams) {
    const moreParamsMap = {
      ...paramsMap
    }
    moreParams.forEach(param => {
      moreParamsMap[param.name.value()] = param
    })
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
function extractBasicParamConfig (param) {
  if (!param) {
    return {}
  }
  const conf = {
    required: param.required.value() || false
  }
  if (conf.required === undefined) {
    conf.required = true
  }
  const shape = param.schema
  // Params without schema are considered to be strings
  const dt = shape && shape.dataType !== undefined
    ? shape.dataType.value()
    : 'http://www.w3.org/2001/XMLSchema#string'
  conf.type = dt.split('#').pop()
  if (shape && shape.values && shape.values.length > 0) {
    conf.enum = shape.values.map(val => val.value.value())
  }
  return conf
}

/**
 * Patches Parameter by setting default values.
 *
 * @param  {webapi-parser.Parameter} param
 * @param  {String} defaultName
 * @return {webapi-parser.Parameter}
 */
function patchParameter (param, defaultName) {
  if (!param) {
    param = new wp.model.domain.Parameter()
  }
  if (param.name.option === undefined) {
    param.withName(defaultName)
  }
  if (param.required.option === undefined) {
    param.withRequired(true)
  }
  return param
}
