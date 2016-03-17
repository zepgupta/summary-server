var express = require('express');
var router = express.Router();
var aylien = require('../lib/aylien')
var urlencode = require('urlencode');
var async = require('async');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/summarizeURL/:url', function(req, res, next){
	var url = urlencode.decode(req.params.url);
	//commented out to preserve the api hits
	async.waterfall([
   		function (callback) {
			aylien.summarize({url: url}, function(err, response){
				if(err){
					console.log(err);
					callback(err);
				}
				else{	
					var summ = '';
					for(var i = 0; i<response.sentences.length; i++){
						i > 0 ? summ += " " + response.sentences[i] : summ += response.sentences[i];
					}
					callback(null, summ);
				}
			});
		},
		function(summ, callback){
			aylien.extract({
				url: url,
			}, function(err, response){
				if(err){
					console.log(err);
					callback(err);
				}
				else{
					callback(null, {summary: summ, title: response.title}, callback);
				}
			});
		}	
		//res.send('url summary');
	],
	function(err, response){
		if(err){
			res.send('error in analysis process');
		}
		else{
			res.json(response);
		}
	});
});

router.get('/summarizeText/:title/:text', function(req, res, next){
	var text = urlencode.decode(req.params.text);
	aylien.summarize({title:req.params.title ,text: text}, function(err, response){
		if(err){
			console.log(err);
			res.send('error in analysis process');
		}
		else{
			var summ = '';
			for(var i = 0; i<response.sentences.length; i++){
				i > 0 ? summ += " " + response.sentences[i] : summ += response.sentences[i];
			}
			res.json({summary: summ, title: req.params.title});
		}
	});
});

module.exports = router;
