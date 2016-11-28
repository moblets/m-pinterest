describe('Feed', function() {
  var Feed = require('../server/feed.js'),
    CryptoJS = require('crypto-js'),
    data = {
      data: "RAW data from the moblet logic"
    },
    responseData = {};

  beforeEach(function() {
    responseData = Feed(data);
    salt = responseData.salt;
  });

  it('should return data', function() {
    var testData = {
      data: "RAW data from the moblet logic"
    };
    expect(responseData).toEqual(testData);
  });
});
