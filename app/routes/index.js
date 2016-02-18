var express = require('express');
var router = express.Router();
var aylien = require('../lib/aylien')
var urlencode = require('urlencode');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/summarizeURL/:url', function(req, res, next){
	var url = urlencode.decode(req.params.url);
	//commented out to preserve the api hits
	/*aylien.summarize({url: url}, function(err, response){
		if(err){
			console.log(err);
			res.send(err);
		}
		else{
			var summ = '';
			for(var i = 0; i<response.sentences.length; i++){
				i > 0 ? summ += " " + response.sentences[i] : summ += response.sentences[i];
			}
			res.send(summ);
		}
	})*/
	res.send('the summary');
});

router.get('/summarizeText/:title/:text', function(req, res, next){
	var text = urlencode.decode(req.params.text);
	aylien.summarize({title:req.params.title ,text: text}, function(err, response){
		if(err){
			console.log(err);
			res.send(err);
		}
		else{
			res.send(response);
		}
	})
});

module.exports = router;
