var request = require('request'),
    cachedRequest = require('cached-request')(request),
    cheerio = require('cheerio'),
    async = require('async'),
    express = require('express'),
    app = express(),
    env = require('dotenv').config(),
    firebase = require('firebase');

var cacheDirectory = "cache";
cachedRequest.setCacheDirectory(cacheDirectory);



  var config = {
    apiKey: process.env.FB_API_KEY,
    authDomain: process.env.FB_PROJECT_ID+".firebaseapp.com",
    databaseURL: "https://"+ process.env.FB_DB_NAME +".firebaseio.com",
    storageBucket: process.env.FB_BUCKET + ".appspot.com"
  };
  firebase.initializeApp(config);

  // Get a reference to the database service
  var database = firebase.database();


function writeList(item) {
  firebase.database().ref('list/' + item.id).set(item);
}


function createDate(dateText) {
  if (dateText) {
    var seperate = dateText.split(" ");
    var date = seperate[0].split(".");
    var hour = seperate[1].substring(0, 2);
    var minute = seperate[1].substring(2, 4);
    return new Date(date[2], date[1], date[0], hour, minute).getTime();
  }else{
    return null
  }
}

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
          var $ = cheerio.load(body, {decodeEntities: false});
          var html = $(".il-details").html();
          item.html = html;
          item.text = html.replace(/(<([^>]+)>)/ig,"");
          item.published_date = createDate(item.published_time);
          item.removed_date = createDate(item.retracted_time);
          item.due_date = createDate(item.due_time);
          item.version = 2;
          done(null, item);
          writeList(item);
        })
      },fn)
    }
  ],function(err, data){
    res.json(data);
  })
});

app.listen(3003)
console.log("Serving at http://localhost:3003")
