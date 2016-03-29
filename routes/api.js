var express = require('express');
var urlencode = require('urlencode');
var async = require('async');
var user = require('../db/user');
var hash = require('password-hash');
var jwt = require('jsonwebtoken')
var app = require('../app');
var apiRoutes = express.Router();
var summary = require('../db/summaries');

//authentication route
apiRoutes.post('/authenticate', function(req, res){
	user.findUser({username: req.body.username}, function(err, user){
		console.log(req.body.username);
		err ? res.json({success:false, message:'API error'}) : null;
		if(!user){
			res.json({success:false, message: 'Authentication failed. User not found.'});
		} else if(user){
			if(hash.verify(req.body.password, user.password) === false){
				res.json({success: false, message:'Authentication failed. Wrong password.' });
			} else{
				var token = jwt.sign(user, app.get('secret'), {
					expiresIn: 7200
				});
				
				res.json({
					success: true,
					message: 'Authentication successful.',
					token: token
				});
			}
		}
	});
})
//authentication middleware
apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, app.get('secret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;  
        next();
      }
    });

  } else {
    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });
  }
});

apiRoutes.get('/summarizeURL/:url', function(req, res, next){
	summary.addSummary({username: req.decoded.username},{url:req.params.url, flag: 'URL'}, function(err, response){
		err ? res.json({success: true, message: 'API error'}) : res.json(response);
	})
});

apiRoutes.get('/summarizeText/:title/:text', function(req, res, next){
	var text = urlencode.decode(req.params.text);
	var title = urlencode.decode(req.params.title);
	summary.addSummary({username: req.decoded.username}, {text: text, title: title, flag: "TEXT"}, function(err, response){
		err ? res.json({success: true, message: 'API error'}) : res.json(response);
	});
});

apiRoutes.get('/summaries', function(req, res, next){
	var token = req.body.token || req.query.token || req.headers['x-access-token'];
	var token = jwt.decode(token);
	var user = {username: token.username};
	summary.getSummaries(user, function(err, response){
		err ? res.json({success: false, message: 'API error'}) : res.json(response);
	});
});

module.exports = apiRoutes;

