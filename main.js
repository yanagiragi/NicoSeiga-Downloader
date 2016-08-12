var request = require('request');
const cookie = require('cookie');
const cheerio = require('cheerio');
const fs = require('fs');

const login = require('./data.js').getUrl();
const options = require('./data.js').getAuth();

var jar; // cookie jar to hold session

start(); // Main

function start(){
	auth(login, options)
		.then(jar => storecookie(jar))
		.then(() => {
			var thx = 'http://live.nicovideo.jp/api/getplayerstatus/nsen/vocaloid';
			var thx2 = 'http://seiga.nicovideo.jp/image/source/6020286';
			var thx3 = 'http://seiga.nicovideo.jp/image/source/6019149';
			var thx4 = 'http://seiga.nicovideo.jp/image/source/5866228';
			test(thx2,function(){
				test(thx3,function(){
					test(thx4)
				})
			});
			
		});
}

function auth(login, options){
	return new Promise(function(resolve, reject){
		request.post({url : login ,form : options},(err,res,body) => {
				if(err){
					console.log(err);
				}
				else{
					var vanilla = cookie.serialize(res.headers['set-cookie']);
					resolve(vanilla);
				}
			}
		);
	});
}

function storecookie(jar){
	return new Promise(function(resolve, reject){
		this.jar = jar;
		resolve();
	});
}

function test(url,next=null){
	var option = {
		headers : {
			Cookie : this.jar
		},
		url : url,
		method : 'get'
	};
	request(option , (err,res,body) => {

		if(!err){
			var $ = cheerio.load(body);
	  		var title = $('title')[0].children[0].data;
	  		
	  		title = title.substring(0,title.lastIndexOf('-')-1);

	  		var tmptitle = title.replace(/\ /g,'').replace('\n','');
	  		console.log('['+tmptitle+']');
	  		if(tmptitle == "ログイン"){
	  			return ; // error occurs
	  			// needs to retry
	  		}

	  		var url = 'http://' + res.socket._host + $('img')[1].attribs.src;	  		
	  		storeImg(url,title);
	  		if(next) next();
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
				if(err) console.log('Error to Store : '+ url + ',' + err);
			});
		} 
		else {
			console.log('err : ' + err + ', Skip ' + url );
		}
	});
}