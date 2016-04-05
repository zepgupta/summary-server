var neo4j = require('./neo4j-connection');
var aylien = require('../lib/aylien');
var shortid = require('shortid');
var moment = require('moment');

var hash = require('password-hash');
var util = require('util');
var async = require('async');
var urlencode = require('urlencode');

exports.getSummaries = getSummaries;		// ({userName, email})
exports.addSummary = addSummary;
exports.deleteSummary = deleteSummary;
exports.getFullText = getFullText;

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function getSummaries(user, cb){
	var query = 'Match (n:User '+util.inspect(user)+')-[:hasSummary]->(s) return {title: s.title, summary: s.summary, id: s.id, summaryDate: s.summaryDate}';
	neo4j.query(query, function(err, response){
		err ? cb(err) : cb(null, response.data);
	});
}
/*getSummaries({userName:'shawn'}, function(err, response){
	console.log(response);
})
*/

function addSummary(user, summary, cb){
	var url = summary.flag === 'URL' ? true : false;
	
	summary.summaryDate = moment().format('MMMM Do YYYY');

	if(!url){
		summary.author = "not applicable";
		summary.publishDate = "not applicable";
		summary.url = "not applicable";

		var id = shortid.generate();
		async.waterfall([
			function(callback){
				summarizeText(summary, function(err, response){
					err ? callback(err) : callback(null, response);
				});
			},
			function(sum, callback){
				var query = 'Match (n:User '+util.inspect(user)+') Merge (s:Summary '+util.inspect(Object.assign({}, sum, summary, {id:id}))+') merge (n)-[:hasSummary]->(s) return {title: s.title, summary: s.summary, id: s.id, summaryDate: s.summaryDate}';
				neo4j.query(query, function(err, response){
					err ? cb(err) : cb(null, response.data[0]);
				});
			}
		],
		function(err, response){
			err ? cb(err) : cb(null, response)
		});
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
					query = 'Match (n:User '+util.inspect(user)+') match (s:Summary { url:"'+urlencode.decode(summary.url)+'"}) Merge (n)-[:hasSummary]->(s) return {title: s.title, summary: s.summary, id: s.id, summaryDate: s.summaryDate}';
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
					query = 'Match (n:User '+util.inspect(user)+') Merge (s:Summary '+util.inspect(Object.assign({},sum,{id:id}))+') Merge (n)-[:hasSummary]->(s) return {title: s.title, summary: s.summary, id: s.id, summaryDate: s.summaryDate}';
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

function deleteSummary(user, id, cb){
	var query = '';
	async.waterfall([
		function(callback){
			query = 'Match n where n.id="'+id+'" return n';
			neo4j.query(query, function(err, response){
				if (err) {
					callback(err);
				}
				else {
					callback(null, response.data[0]);
				}
			});
		},
		function(summary, callback) {
			if (summary.flag === "URL") {
				query =  'Match (n)-[r]-(m:User '+util.inspect(user)+') where n.id="'+id+'" delete r';
				neo4j.query(query, function(err, response){
					if(err){
						callback(err);
					}
					else{
						callback(null, response);
					}
				});
			}
			else {
				query =  'Match (n)-[r]-(m:User '+util.inspect(user)+') where n.id="'+id+'" delete r, n';
				neo4j.query(query, function(err, response){
					if(err){
						callback(err);
					}
					else{
						callback(null, response);
					}
				});
			}
		}
	],
	function(err, response){
		err ? cb(err) : cb(null, response);
	});
}

/*deleteSummary({userName:'shawn'}, '41LiFeECe', function(err, response){
	err ? console.log(err) : console.log(response);
})
*/

function getFullText(id, cb) {
	var query = 'match n where n.id="'+id+'" return {article: n.article, title: n.title, publishDate: n.publishDate, summaryDate: n.summaryDate, url: n.url, author: n.author}';
	neo4j.query(query, function(err, response){
		if (err){
			cb(err);
		}
		else{
			cb(null, response.data[0]);
		}
	});
}
/*
getFullText('EkWTTk4Cg', function(err, response){
	err ? console.log(err) : console.log(response);
});
*/

//
//**helper functions**
//
function summarizeText(sum, cb){
	var text = urlencode.decode(sum.article);
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
					callback(null, Object.assign({}, sum, {title: response.title, article: response.article, url: url, author: response.author, publishDate: response.publishDate}));
				}
			});
		}	
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
/*
var sum = {url:'http%3A%2F%2Fwww.cnn.com%2F2016%2F04%2F03%2Fpolitics%2Fnorth-dakota-gop-delegates-donald-trump-ted-cruz-john-kasich%2Findex.html', flag: 'URL'}
summarizeUrl(sum, function(err, response){
	
})
*/

//var sum = {id:'asdf23qefa', title: 'test', text: "One reason is security - if (haha! when) a hacker gains access to your front-end webserver, he gets access to everything it has access to. If you've placed your middle tier in the web server, then he has access to everything it has - ie your DB, and next thing you know, he's just run 'select * from users' on your DB and taken it away from offline password cracking. Another reason is scaling - the web tier where the pages are constructed and mangled and XML processed and all that takes a lot more resource than the middle tier which is often an efficient method of getting data from the DB to the web tier. Not to mention transferring all that static data that resides (or is cached) on the web server. Adding more web servers is a simple task once you've got past 1. There shouldn't be a 1:1 ratio between web and logic tiers - I've seen 8:1 before now (and a 4:1 ratio between logic tier and DB). It depends what your tiers do however and how much caching goes on in them. Websites don't really care about single-user performance as they're built to scale, it doesn't matter that there is an extra call slowing things down a little if it means you can serve more users. Another reason it can be good to have these layers is that it forces more discipline in development where an API is developed (and easily tested as it is standalone) and then the UI developed to consume it. I worked at a place that did this - different teams developed different layers and it worked well as they had specialists for each tier who could crank out changes really quickly because they didn't have to worry about the other tiers - ie a UI javscript dev could add a new section to the site by simply consuming a new webservice someone else had developed."}
/*
addSummary({userName:'shawn'}, sum, function(err, result){
	err ? console.log(err) : console.log(result);
})*/