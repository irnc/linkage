'use strict';

var nock = require('nock');
var util = require('util');
var linkage = require('./index');

// These variables are initialized at setUp
var linkedin;
var accessToken;

exports.setUp = function (callback) {
  linkedin = nock('https://api.linkedin.com');
  accessToken = process.env.LI_ACCESS_TOKEN;

  if (!accessToken) {
    accessToken = 'here goes OAuth2 access token issues by LinkedIn';
  }

  callback();
};

exports['make successful request to LinkedIn, receive response body'] = function (test) {
  var expectedUri = util.format(
    '/v1/people/~?oauth2_access_token=%s&format=json',
    encodeURIComponent(accessToken)
  );

  var expectedBody = {
    firstName: 'Pavel',
    headline: 'Developer at Company Name',
    lastName: 'Zubkou',
    siteStandardProfileRequest:  {
      url: 'http://www.linkedin.com/profile/view?id=...'
    }
  };

  // configure nock scope
  linkedin
    // if `request` is called with string, linkage uses GET method
    .get(expectedUri)
    .reply(200, expectedBody);

  linkage(accessToken).request('/people/~', function (err, profile) {
    test.doesNotThrow(function () { linkedin.done(); });

    test.equal(err, null);
    test.deepEqual(profile, expectedBody);

    test.done();
  });
};

exports['pass in LinkedIn error as err to callback'] = function (test) {
  var expectedBody = {
    errorCode: 0,
    message: 'Empty oauth2_access_token',
    requestId: 'KDH3CX1C85',
    status: 401,
    timestamp: 1397220669839
  };

  linkedin
    .get('/v1/people/~?oauth2_access_token=&format=json')
    .reply(401, expectedBody);

  test.expect(4);

  // Lets simulate situation where we do not give access token to `linkage`
  linkage('').request('/people/~', function (err, body) {

    // request is sent to LinkedIn nonetheless
    test.doesNotThrow(function () { linkedin.done(); });

    // but in `err` we would receive a special `LinkedInError`
    test.equal(err.name, 'LinkedInError');

    // `err.message` contains message as received from LinkedIn
    test.equal(err.message, 'Empty oauth2_access_token');

    // on error, body does not contain actual entity, but rather an error
    // response body, in case somebody needs to log it.
    test.deepEqual(body, expectedBody);

    test.done();
  });
};

exports['request method accepts options similar to request module'] = function (test) {
  var expectedUri = util.format(
    '/v1/people/~/following/companies?oauth2_access_token=%s&format=json',
    encodeURIComponent(accessToken)
  );

  linkedin
    .post(expectedUri)
    // Start Following Company API endpoint response in 0 length
    .reply(201, undefined);

  var options = {
    // Only one option is new, `endpoint` is appended to /v1/ path to form `uri`
    endpoint: '/people/~/following/companies',

    // Familiar? It is options as used by `mikeal/request` module.
    method: 'POST',

    // Data that needs to be POSTed are stored under `json` option.
    json: {
      // `1337` is an ID of the LinkedIn company.
      id: 1337
    }
  };

  // If user already followed LinkedIn company, API will respond with status
  // code 500 and message 'Internal service error', which is a strange reply.
  linkage(accessToken).request(options, function (err, responseBody) {
    test.equal(err, null);
    test.equal(responseBody, undefined);

    test.done();
  });
};
