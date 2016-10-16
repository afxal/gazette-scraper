var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var express = require('express');
var app = express()

var url = "http://www.gazette.gov.mv/v3/iulaan/search/all";

app.get('/scrap', function(req, res){
  var pagenum = req.query.page_num || 1;
  var recordsPerPage = req.query.limit || 10;
  var response;

  async.waterfall([
    function getPage(fn){
      request({
        url:url,
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
        var url = 'http://www.gazette.gov.mv/v3/iulaan/view/' + item.id;
        request(url, function(err, res, body){
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
console.log("running at http://localhost:3003")