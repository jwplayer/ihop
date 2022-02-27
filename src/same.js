/**
 * Transform an URL to a valid origin value.
 *
 * @param {String|Object} url URL to transform to its origin.
 * @returns {String} The origin.
 * @api public
 */
function origin(url) {
  if ('string' === typeof url) url = new URL(url);

  //
  // 6.2.  ASCII Serialization of an Origin
  // http://tools.ietf.org/html/rfc6454#section-6.2
  //
  if (!url.protocol || !url.hostname) return 'null';

  //
  // 4. Origin of a URI
  // http://tools.ietf.org/html/rfc6454#section-4
  //
  // States that url.scheme, host should be converted to lower case. This also
  // makes it easier to match origins as everything is just lower case.
  //
  return (url.protocol +'//'+ url.host).toLowerCase();
}

/**
 * Check if the origins are the same.
 *
 * @param {String} a URL or origin of a.
 * @param {String} b URL or origin of b.
 * @returns {Boolean}
 * @api public
 */
const same = (a, b) => origin(a) === origin(b);

export default same;
