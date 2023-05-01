'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var msw = require('msw');

var defaultParseOptions = {
  decodeValues: true,
  map: false,
  silent: false,
};

function isNonEmptyString(str) {
  return typeof str === "string" && !!str.trim();
}

function parseString(setCookieValue, options) {
  var parts = setCookieValue.split(";").filter(isNonEmptyString);
  var nameValue = parts.shift().split("=");
  var name = nameValue.shift();
  var value = nameValue.join("="); // everything after the first =, joined by a "=" if there was more than one part

  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  var cookie = {
    name: name, // grab everything before the first =
    value: options.decodeValues ? decodeURIComponent(value) : value, // decode cookie value
  };

  parts.forEach(function (part) {
    var sides = part.split("=");
    var key = sides.shift().trimLeft().toLowerCase();
    var value = sides.join("=");
    if (key === "expires") {
      cookie.expires = new Date(value);
    } else if (key === "max-age") {
      cookie.maxAge = parseInt(value, 10);
    } else if (key === "secure") {
      cookie.secure = true;
    } else if (key === "httponly") {
      cookie.httpOnly = true;
    } else if (key === "samesite") {
      cookie.sameSite = value;
    } else {
      cookie[key] = value;
    }
  });

  return cookie;
}

function parse(input, options) {
  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  if (!input) {
    if (!options.map) {
      return [];
    } else {
      return {};
    }
  }

  if (input.headers && input.headers["set-cookie"]) {
    // fast-path for node.js (which automatically normalizes header names to lower-case
    input = input.headers["set-cookie"];
  } else if (input.headers) {
    // slow-path for other environments - see #25
    var sch =
      input.headers[
        Object.keys(input.headers).find(function (key) {
          return key.toLowerCase() === "set-cookie";
        })
      ];
    // warn if called on a request-like object with a cookie header rather than a set-cookie header - see #34, 36
    if (!sch && input.headers.cookie && !options.silent) {
      console.warn(
        "Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."
      );
    }
    input = sch;
  }
  if (!Array.isArray(input)) {
    input = [input];
  }

  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  if (!options.map) {
    return input.filter(isNonEmptyString).map(function (str) {
      return parseString(str, options);
    });
  } else {
    var cookies = {};
    return input.filter(isNonEmptyString).reduce(function (cookies, str) {
      var cookie = parseString(str, options);
      cookies[cookie.name] = cookie;
      return cookies;
    }, cookies);
  }
}

/*
  Set-Cookie header field-values are sometimes comma joined in one string. This splits them without choking on commas
  that are within a single set-cookie field-value, such as in the Expires portion.

  This is uncommon, but explicitly allowed - see https://tools.ietf.org/html/rfc2616#section-4.2
  Node.js does this for every header *except* set-cookie - see https://github.com/nodejs/node/blob/d5e363b77ebaf1caf67cd7528224b651c86815c1/lib/_http_incoming.js#L128
  React Native's fetch does this for *every* header, including set-cookie.

  Based on: https://github.com/google/j2objc/commit/16820fdbc8f76ca0c33472810ce0cb03d20efe25
  Credits to: https://github.com/tomball for original and https://github.com/chrusart for JavaScript implementation
*/
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }
  if (typeof cookiesString !== "string") {
    return [];
  }

  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;

  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }

  function notSpecialChar() {
    ch = cookiesString.charAt(pos);

    return ch !== "=" && ch !== ";" && ch !== ",";
  }

  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;

    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        // ',' is a cookie separator if we have later first '=', not ';' or ','
        lastComma = pos;
        pos += 1;

        skipWhitespace();
        nextStart = pos;

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }

        // currently special character
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          // we found cookies separator
          cookiesSeparatorFound = true;
          // pos is inside the next cookie, so back up and return it.
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          // in param ',' or param separator ';',
          // we continue from that comma
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }

  return cookiesStrings;
}

var setCookie = parse;
var parse_1 = parse;
var parseString_1 = parseString;
var splitCookiesString_1 = splitCookiesString;
setCookie.parse = parse_1;
setCookie.parseString = parseString_1;
setCookie.splitCookiesString = splitCookiesString_1;

/**
 * @private
 * @param definition the definition
 */
function getEntriesFromWebarchive(definition) {
    if (definition.hasOwnProperty('log')) {
        return definition.log.entries;
    }
    if (definition.hasOwnProperty('entries')) {
        return definition.entries;
    }
    return [];
}
/**
 * @pivate
 * Create an instance of a request handler for the given request-response pair
 *
 * @param entry   the web-archive entry
 * @param options the provider options
 */
const createRequestHandler = (entry, options) => {
    const { request, response, time: processingTime } = entry;
    const { url } = request;
    const requestMethod = request.method.toLowerCase();
    const supportedMethods = Object.keys(msw.rest);
    const logger = (level, ...args) => {
        if (options === null || options === void 0 ? void 0 : options.quiet)
            return;
        const loglevels = ['warn', 'info', 'debug'];
        if (loglevels.includes(level)) {
            const log = console[level];
            log(...args);
        }
        else {
            console.log(...[level, ...args]);
        }
    };
    logger(`Registering route for ${entry.request.method} for ${entry.request.url}`);
    if (!supportedMethods.includes(requestMethod)) {
        return null;
    }
    const parsedUrl = new URL(url);
    const fullQualifiedUrl = parsedUrl.href.replace(parsedUrl.search, '');
    // check if we need to look some warnings to the Console or not
    const shouldLog = (options === null || options === void 0 ? void 0 : options.quiet) === false;
    const resolver = (req, res, ctx) => {
        const { content: responseBody, status: responseStatus, headers } = response;
        // If we strict query string is requested, we will only handle the request when it matches
        if (options === null || options === void 0 ? void 0 : options.strictQueryString) {
            const mockRequestUrlInfo = req.url;
            if (parsedUrl.search !== mockRequestUrlInfo.search) {
                if (shouldLog) {
                    logger('warn', '[WARNING] Query string did not match');
                }
                return;
            }
        }
        // Set the body of the response
        let responseData = responseBody.text;
        if (responseBody && responseBody.encoding === 'base64') {
            // Convert the base64 string to a byte array
            const responseBuffer = Uint8Array.from(atob(responseBody.text), (c) => c.charCodeAt(0));
            responseData = responseBuffer;
        }
        const responseContext = ctx.body(responseData);
        // If there are any Set-Cookie headers we should parse them and process them
        const cookieHeaders = headers.filter((item) => item.name.toLowerCase() === 'set-cookie');
        let responseCookies = [];
        if (cookieHeaders.length) {
            responseCookies = cookieHeaders
                .map(({ value: cookieString }) => {
                const [parsedCookie] = parse_1(cookieString);
                const { name, value, httpOnly, path, sameSite, secure, expires } = parsedCookie;
                return ctx.cookie(name, value, {
                    domain: parsedUrl.host,
                    path,
                    httpOnly,
                    sameSite: sameSite !== '',
                    expires,
                    secure,
                });
            })
                .filter(Boolean);
        }
        // Set the all headers for the response
        const responseHeaders = headers
            .map(({ name, value }) => {
            const headerName = name.toLowerCase();
            if (cookieHeaders.length && headerName === 'set-cookie') {
                return null;
            }
            if (headerName === 'access-control-allow-origin') {
                logger(`CORS header detected, requesting new origin for ${value}`);
                const newOrigin = (options === null || options === void 0 ? void 0 : options.resolveCrossOrigins) ? options === null || options === void 0 ? void 0 : options.resolveCrossOrigins(value) : value;
                value = newOrigin;
            }
            return ctx.set(name, value);
        })
            .filter(Boolean);
        // If the request-response pair has a `time`-property populated we use it as the delay for the mock response
        const responseDelayTime = processingTime ? processingTime : 0;
        if (responseDelayTime > 0) {
            if (shouldLog) {
                logger('warn', `Response will be delayed with ${responseDelayTime}ms`);
            }
        }
        const registerResolver = (options === null || options === void 0 ? void 0 : options.useUniqueRequests) ? res : res.once;
        return registerResolver(...[
            ...responseHeaders,
            ...responseCookies,
            responseContext,
            ctx.delay(responseDelayTime),
            ctx.status(responseStatus),
            ctx.json({ status: true }),
        ]);
    };
    // Ensure the right request route method is used for the registration
    const route = msw.rest[requestMethod](fullQualifiedUrl, resolver);
    if (!route) {
        return null;
    }
    return route;
};

function setRequestHandlersByWebarchive(serverInstance, definitions = {}, options) {
    const entries = getEntriesFromWebarchive(definitions);
    if (!entries.length) {
        if (!(options === null || options === void 0 ? void 0 : options.quiet)) {
            console.warn('Note: No request definitions found in passed web-archive file');
        }
    }
    const requestHandlers = entries.map((definitionEntry) => {
        return createRequestHandler(definitionEntry, options);
    });
    const filteredRequestHandlers = requestHandlers.filter(Boolean);
    serverInstance.use(...filteredRequestHandlers);
}

exports.setRequestHandlersByWebarchive = setRequestHandlersByWebarchive;
