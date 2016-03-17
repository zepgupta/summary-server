var neo4j = require('./neo4j-connection');

var hash = require('password-hash');
var util = require('util');
var async = require('async');

exports.getSummaries = getSummaries;		// ({userName, email})
exports.addSummary = addSummary;
exports.deleteSummary = deleteSummary;


function getSummaries(user, cb){
	var query = 'Match (n:User '+util.inspect(user)+')-[:hasSummary]->(s) return s.title, s.summary, s.id';
	neo4j.query(query, function(err, response){
		err ? cb(err) : null;
		response ? cb(null, response.data) : null
	});
}
/*getSummaries({userName:'shawn'}, function(err, response){
	console.log(response);
})
*/
//add check and see if a urlSummary already exists with that url
function addSummary(user, summary, cb){
	var url = summary.id.substring(0,3) === 'URL' ? true : false;
	
	if(!url){
		var query = 'Match (n:User '+util.inspect(user)+') Create (s:Summary '+util.inspect(summary)+'), (n)-[:hasSummary]->(s)'
		neo4j.query(query, function(err, response){
			err ? cb(err) : null;
			response ? cb(null, "Summary added to User's list") : null;
		});
	}
	else{
		async.waterfall([
			function(callback){
				var query = 'Match (s:Summary) where s.url="'+summary.url+'" return s';
				neo4j.query(query, function(err, response){
					err ? callback(err) : null;
					response.data.length > 0 ? callback(null, true) : callback(null, false);
				});
			},
			function(exists, callback){
				var query;
				if(exists){
					query = 'Match (n:User '+util.inspect(user)+') match (s:Summary { id:"'+summary.id+'"}) Merge (n)-[:hasSummary]->(s)'
					neo4j.query(query, function(err, response){
						err ? callback(err) : callback(null, response);
					});
				}
				else{
					console.log('does not exist');
					query = 'Match (n:User '+util.inspect(user)+') Create (s:Summary '+util.inspect(summary)+'), (n)-[:hasSummary]->(s)'
					neo4j.query(query, function(err, response){
						err ? cb(err) : callback(null, response);
					});
				}
			}
		],
		function(err, response){
			err ? cb(err) : cb(null, "Summary added to User's list");
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