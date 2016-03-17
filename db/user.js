var neo4j = require('./neo4j-connection');

var hash = require('password-hash');
var util = require('util');
var async = require('async');

exports.newUser = newUser; 					// (userName, email, password, admin, cb)
exports.findUser = findUser;				// ({userName, email}, cb)
exports.verifyPassword = verifyPassword;	// ({userName, email}, password, cb)
exports.changePassword = changePassword;	// ({userName, email}, oldPW, newPW, cb)
exports.modifyUser = modifyUser;			// ({userName, email}, {..props}, cb)


function newUser(userName, email, password, admin, cb){
	async.waterfall([
		function(callback){
			neo4j.query('match (n:User) where n.userName="'+userName+'" or n.email="'+email+'" return n', function(err, response){
				if(err){
					callback(err);
				}
				else{
					response.data.length === 0 ? callback(null) : callback('Username or email address is already registered')
				}
			});
		},
		function(callback){
			var user = {
				userName: userName,
				email: email,
				password: hash.generate(password),
				admin: admin
			}
			var query = 'Create (n:User '+util.inspect(user)+')';
			
			neo4j.query(query, function(err, response){
				if(err){
					callback(err);
				}
				else{
					callback(null, response.data);
				}
			});
		}
	],
	function(err, res){
		if(typeof err === 'string'){
			cb(err);
		}
		else if(err){
			console.log(err);
			cb('db error');
		}
		else{
			cb('User created successfully');
		}
	});
}
/*newUser('shawn', 'shawn@gmail.com', 'pw', 'false', function(res){
	console.log(res);
});
*/
function findUser(user, cb){
	var query = 'Match (n:User) where '
		query += user.userName ? 'n.userName="'+user.userName+'" ' : 'n.email="'+user.email+'" ';
		query += 'return n';
	
	neo4j.query(query, function(err, response){
		if(err){
			cb(err);
		}
		else{
			cb(null, response.data);
		}
	})
}
/*findUser({user:'shawn', email:'shawn@gmail.com'}, function(err, response){
	console.log(response);
});
*/

function verifyPassword(user, password, cb){
	var param = '';
	param = user.userName ? 'n.userName="'+user.userName+'" ' : 'n.email="'+user.email+'" ';
	neo4j.query('Match (n:User) where '+param+' return n', function(err, response){
		if(response.data.length===0){
			cb('Invalid username or email address');
		}
		else if(err){
			cb(err);
		}
		else{
			if(hash.verify(password, response.data[0].password)){
				cb(null, true);
			}
			else{
				cb('incorrect password');
			}
		}
	});
}
/*verifyPassword({userName:'shawn'},'pw', function(err, res){
	err ? console.log(err) : null;
	res ? console.log('pw verified') : null;
});
*/
function changePassword(user, oldPW, newPW, cb){
	var param = '';
	param = user.userName ? 'n.userName="'+user.userName+'" ' : 'n.email="'+user.email+'" ';
	
	async.waterfall([
		function(callback){
			verifyPassword(user, oldPW, function(err, response){
				err ? callback(err) : null;
				response ? callback(null) : null;
			});
		},
		function(callback){
			var hashedPW = hash.generate(newPW)
			neo4j.query('Match (n:User) where '+ param +'set n.password="'+ hashedPW +'" return n', function(err, response){
				if(err){
					callback('Db error on password change.');
				}
				else if(response.data.length === 0){
					callback('Invalid username or email.');
				}
				else{
					neo4j.query('Match (n:User) where ' +param+ 'AND n.password="'+hashedPW+'" return n', function(err, response){
						if(err){
							callback('Db error on verification of password change.');
						}
						else{
							if(response.data.length > 0){
								callback(null, 'Password changed successfully.');
							}
							else{
								callback('Unknown error. Password may or may not have been changed successfully.');
							}
						}
					});
				}
			});
		}
	],
	function(err, response){
		err ? cb(err) : null;
		response ? cb(response) : null;
	});
}
/*changePassword({userName:'shawn'}, 'pw', 'password', function(err, response){
	err ? console.log(err) : console.log(response);
})
*/
function modifyUser(user, newProps, cb){
	var param = '';
	param = user.userName ? 'n.userName="'+user.userName+'" ' : 'n.email="'+user.email+'" ';
	
	var setProps = '';
	for (var key in newProps) {
	  if (newProps.hasOwnProperty(key)) {
		setProps += 'set n.'+key+'="'+newProps[key]+'" ';
	  }
	}
	neo4j.query('Match (n:User) where ' + param + setProps + 'return n', function(err, response){
		err ? cb('Db error when updating profile') : null;
		response ? cb(null, 'User profile updated successfully') : null;
	})
}
/*modifyUser({userName:'shawn'},{date:'12-10-15', hair:'brown'}, function(err, response){
	err ? console.log(err) : null;
	response ? console.log(response) : null;
});
*/
