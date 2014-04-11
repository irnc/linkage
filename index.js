'use strict';

var request = require('request');
var util = require('util');
var apiBaseUrl = 'https://api.linkedin.com/v1';

function linkage (accessToken) {
  return {
    request: function (options, callback) {

      // `options` can be a relative API path, e.g. '/people/~'
      if (typeof options === 'string') {
        options = { endpoint: options };
      }

      options.uri = apiBaseUrl + options.endpoint;
      options.qs = options.qs || {};
      options.qs.oauth2_access_token = accessToken;
      options.qs.format = 'json';
      options.json = options.json || true;

      request(options, function (err, response, body) {
        if (err) {
          return callback(err);
        }

        // POST to Start Following Company responds with 201 on success, and
        // with 500 when user is already following the company.
        if (response.statusCode >= 400) {
          return callback(new linkage.LinkedInError(body.message), body);
        }

        callback(null, body);
      });
    }
  };
}

linkage.LinkedInError = function (message) {
  Error.call(this);

  this.name = 'LinkedInError';
  this.message = message;
};

util.inherits(linkage.LinkedInError, Error);

module.exports = linkage;
