var request = require('request')
var cachedRequest = require('cached-request')(request);
var cheerio = require('cheerio');
var async = require('async');
var express = require('express');
var app = express()

var cacheDirectory = "cache";
cachedRequest.setCacheDirectory(cacheDirectory);

var url = 'http://www.gazette.gov.mv/v3/iulaan/';


app.get('/', function(req, res){
  var pagenum = req.query.page_num || 1;
  var recordsPerPage = req.query.limit || 10;
  var response;

  async.waterfall([
    function getPage(fn){
      cachedRequest({
        url:url+'search/all',
        ttl: 900000,
        method:'POST',
        formData:{
          jobCategory:'all',
          officeName:'',
          openedOnly:0,
          sortOrderList:'published-time:desc,iulaan-date:desc,due-time:desc',
          pagenum:pagenum,
          recordsPerPage:recordsPerPage
        }
      }, function(err, res, body){
        response = JSON.parse(body);
        fn();
     })
    },
    function getDetails(fn){
      async.map(response.iulaans, function retrieveItem(item, done){
        cachedRequest({
          url:url+'view/'+item.id,
          ttl: 900000,
        }, function(err, res, body){
          var $ = cheerio.load(body);
          var html = $(".il-details").html();
          item.html = html;
          done(null, item);
        })
      },fn)
    }
  ],function(err, data){
    res.json(data);
  })
});

app.listen(3003)
console.log("Serving at http://localhost:3003")