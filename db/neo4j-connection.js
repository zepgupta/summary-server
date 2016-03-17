// This module connects to the neo4j database and makes 5 functions available when 'required'

var neo4j = require("node-neo4j");

//url below is for graphene cloud database
var db = new neo4j("http://SummaryApp:SODczSdS6jVoYE963nLA@summaryapp.sb02.stations.graphenedb.com:24789");

//for local instance of neo4j, insert password below
//var localhost = '';
//var db = new neo4j('neo4j:' +localpassword+'@localhost:7474'); 

//
// - 1. query - runs the provided query and returns the results
//



function query(query, callback){

	db.cypherQuery(query, function(err, result){
		if(err){
			callback(err);
		}
		else{
			callback(null, result);
		}
	});
};


exports.query = query;
