var AYLIENTextAPI = require('aylien_textapi');


var aylien = new AYLIENTextAPI({
	application_id: '5cc7ea06',
	application_key: '853be2b40099bad7a08199e4f7a4d3cf'
});

//obj will contain either a "url" key with a url as a value
//or a "text" key with the body of text to be summarized

function summarize(obj, callback) {
	aylien.summarize(obj, function(err, response){
		if(err){
			callback(err);
		}
		else{
			callback(null, response);
		}
	});
}

function extract(obj, callback) {
	aylien.extract(obj, function(err, response){
		if(err){
			callback(err);
		}
		else{
			callback(null, response);
		}
	});
}

exports.summarize = summarize;
exports.extract   = extract;