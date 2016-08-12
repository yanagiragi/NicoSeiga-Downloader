var request = require('request');
const cookie = require('cookie');
const cheerio = require('cheerio');
const fs = require('fs');
const querystring = require('querystring');
const login = require('./data.js').getUrl();
const options = require('./data.js').getAuth();

var jar; // cookie jar to hold session

start(); // Main

function start(){
	auth(login, options)
		.then(jar => storecookie(jar))
		.then((str) => {
			test(str);
		});
}

function auth(login, options){
	return new Promise(function(resolve, reject){
		var optionData = querystring.stringify(options);
		var contentLength = optionData.length;
		var n = {
				url : login,
				form : options
			};
		request.post(
			n,
			(err,res,body) => {
				console.log(err);
				if(err){
					console.log(err);
				}
				else{
					var vanilla = cookie.serialize(res.headers['set-cookie']);
					console.log(vanilla)
					resolve(vanilla);
				}
			}
		);
	});
}

function storecookie(jar){
	return new Promise(function(resolve, reject){
		this.jar = jar;
		//console.log(jar);
		resolve(jar);
	});
}

function test(str){

	var thx = 'http://live.nicovideo.jp/api/getplayerstatus/nsen/vocaloid';
	var thx2 = 'http://seiga.nicovideo.jp/image/source/6020286';
		
	request({
		uri : thx2,
		method : 'get',
		headers : {
			Cookie : this.jar
		}
	} , function (err,res,body) {
		console.log(body);
		
		if(!err){
			var $ = cheerio.load(body);
	  		var title = $('title')[0].children[0].data;
	  		title = title.substring(0,title.lastIndexOf('-')-1);
	  		var url = 'http://' + res.socket._host + $('img')[1].attribs.src;
	  		storeImg(url,title);
		}

	});
}

function storeImg(url, title){	
	request({url : url, encoding : 'binary'}, (err,res,body) => {		
		if(!err){			
			var type = res.headers['content-type'];
			type = type.substring(type.lastIndexOf('/')+1, type.length);
			var filename = __dirname + '/Storage/' + title + '.' + type
			
			fs.writeFile(filename, body, 'binary', err => {
				console.log(err);
			});
		} 
		else {
			console.log('err : ' + err + ', Skip ' + url );
		}
	});
}