var neo4j = require('./neo4j-connection');
var aylien = require('../lib/aylien');
var shortid = require('shortid');

var hash = require('password-hash');
var util = require('util');
var async = require('async');
var urlencode = require('urlencode');

exports.getSummaries = getSummaries;		// ({userName, email})
exports.addSummary = addSummary;
exports.deleteSummary = deleteSummary;

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function getSummaries(user, cb){
	var query = 'Match (n:User '+util.inspect(user)+')-[:hasSummary]->(s) return {title: s.title, summary: s.summary, id: s.id}';
	neo4j.query(query, function(err, response){
		err ? cb(err) : null;
		response ? cb(null, response.data) : null
	});
}
/*getSummaries({userName:'shawn'}, function(err, response){
	console.log(response);
})
*/

function addSummary(user, summary, cb){
	var url = summary.flag === 'URL' ? true : false;
	
	if(!url){
		var id = shortid.generate();
		async.waterfall([
			function(callback){
				summarizeText(summary, function(err, response){
					err ? callback(err) : callback(null, response);
				});
			},
			function(sum, callback){
				var query = 'Match (n:User '+util.inspect(user)+') Merge (s:Summary '+Object.assign(util.inspect(summary), {id:id})+') merge (n)-[:hasSummary]->(s) return s'
				neo4j.query(query, function(err, response){
					err ? cb(err) : cb(null, sum);
				});
			}
		]);
	}
	else{
		async.waterfall([
		//check if a summary from that url already exists
			function(callback){
				var query = 'Match (s:Summary) where s.url="'+urlencode.decode(summary.url)+'" return s';
				neo4j.query(query, function(err, response){
					err ? callback(err) : null;
					response.data.length > 0 ? callback(null, true) : callback(null, false);
				});
			},
			function(exists, callback){
				var query;
				//if a summary from that url exists, then just give the user access to it
				if(exists){
					console.log('exists')
					query = 'Match (n:User '+util.inspect(user)+') match (s:Summary { url:"'+urlencode.decode(summary.url)+'"}) Merge (n)-[:hasSummary]->(s) return s'
					neo4j.query(query, function(err, response){
						err ? callback(err) : callback(null, {exists: true, summary: response.data[0]});
					});
				}
				//*******************if the summary doesnt exist, then make a new one
				else{
					console.log('does not exist');
					summarizeUrl(summary, function(err, response){
						err ? callback(err) : callback(null, Object.assign({},summary, response));
					});
				}
			},
			function(sum, callback){
				if(sum.exists){
					console.log('is not new')
					// why am i passing just the summary?
					callback(null, sum.summary)
				}
				else{
					var id = shortid.generate();
					query = 'Match (n:User '+util.inspect(user)+') Merge (s:Summary '+Object.assign(util.inspect(sum), {id:id})+') Merge (n)-[:hasSummary]->(s) return s'
					neo4j.query(query, function(err, response){
						err ? cb(err) : callback(null, response.data[0]);
					});
				}
			}
		],
		function(err, response){
			err ? cb(err) : cb(null, response);
		});
	}
}
/*
addSummary({userName:'shawn'}, {title:'hey', summary:'ho', id:'URLletsgo', url:'test'}, function(err, response){
	err ? console.log(err) : console.log(response);
})
*/

function deleteSummary(user, summaryId, cb){
	var text = summaryId.substring(0,4) === 'TEXT' ? true : false ;
	var query = '';
	if(text){
		query = 'match (n:User '+util.inspect(user)+')-[r]->(s:Summary {id:"'+summaryId+'"}) delete r,s';
	}
	else{
		query = 'match (n:User '+util.inspect(user)+')-[r]->(s:Summary {id:"'+summaryId+'"}) delete r';
	}
	neo4j.query(query, function(err, response){
		err ? cb(err) : null;
		response ? cb(null, "Summary deleted from User's list") : null;
	});
}
/*
deleteSummary({userName:'shawn'}, 'TEXTletsgo', function(err, response){
	err ? console.log(err) : console.log(response);
})
*/


//
//**helper functions**
//
function summarizeText(sum, cb){
	var text = urlencode.decode(sum.text);
	aylien.summarize({title:sum.title ,text: text}, function(err, response){
		if(err){
			console.log('error');
			console.log(err);
			cb('error in analysis process');
		}
		else{
			var summ = '';
			for(var i = 0; i<response.sentences.length; i++){
				i > 0 ? summ += " " + response.sentences[i] : summ += response.sentences[i];
			}
			cb(null, {summary: summ, title: sum.title,});
		}
	});
}

function summarizeUrl(sum, cb){
	var url = urlencode.decode(sum.url);
	async.waterfall([
   		function (callback) {
			aylien.summarize({url: url}, function(err, response){
				if(err){
					console.log('error');
					console.log(err);
					callback(err);
				}
				else{	
					var summ = '';
					for(var i = 0; i<response.sentences.length; i++){
						i > 0 ? summ += " " + response.sentences[i].replaceAll('\\n\\n','') : summ += response.sentences[i].replaceAll('\\n\\n','');
					}
					callback(null, Object.assign({},sum, {summary: summ}));
				}
			});
		},
		function(sum, callback){
			aylien.extract({
				url: url,
			}, function(err, response){
				if(err){
					console.log('error');
					console.log(err);
					callback(err);
				}
				else{
					callback(null, Object.assign({}, sum, {title: response.title, url: url}));
				}
			});
		}	
		//res.send('url summary');
	],
	function(err, response){
		if(err){
			cb('error in analysis process');
		}
		else{
			cb(null, response);
		}
	});
}

//var sum = {url:'https%3A%2F%2Fscotch.io%2Ftutorials%2Fauthenticate-a-node-js-api-with-json-web-tokens', id: 'URL1xyeasdf'}

//var sum = {id:'asdf23qefa', title: 'test', text: "One reason is security - if (haha! when) a hacker gains access to your front-end webserver, he gets access to everything it has access to. If you've placed your middle tier in the web server, then he has access to everything it has - ie your DB, and next thing you know, he's just run 'select * from users' on your DB and taken it away from offline password cracking. Another reason is scaling - the web tier where the pages are constructed and mangled and XML processed and all that takes a lot more resource than the middle tier which is often an efficient method of getting data from the DB to the web tier. Not to mention transferring all that static data that resides (or is cached) on the web server. Adding more web servers is a simple task once you've got past 1. There shouldn't be a 1:1 ratio between web and logic tiers - I've seen 8:1 before now (and a 4:1 ratio between logic tier and DB). It depends what your tiers do however and how much caching goes on in them. Websites don't really care about single-user performance as they're built to scale, it doesn't matter that there is an extra call slowing things down a little if it means you can serve more users. Another reason it can be good to have these layers is that it forces more discipline in development where an API is developed (and easily tested as it is standalone) and then the UI developed to consume it. I worked at a place that did this - different teams developed different layers and it worked well as they had specialists for each tier who could crank out changes really quickly because they didn't have to worry about the other tiers - ie a UI javscript dev could add a new section to the site by simply consuming a new webservice someone else had developed."}
/*
addSummary({userName:'shawn'}, sum, function(err, result){
	err ? console.log(err) : console.log(result);
})*/