var request = require('request');
const cookie = require('cookie');
const cheerio = require('cheerio');
const fs = require('fs');
var sanitize = require("sanitize-filename");

const login = require('./data.js').getUrl();
const options = require('./data.js').getAuth();

var jar; // cookie jar to hold session
var container; // list to store ids

const _this = this;
const maxerror = 100;

var errcount = 0, count = 0, max = 0;
var type = null, mode = null;


start(); // Main

function start(){	
	fetchRanking(type, mode)
		.then(res => {
			if(res == null){
				console.log('fetchRanking failed! Abort...');
				process.exit();
			}
			else{
				storecontainer(res)
					.then(() => {
						_this.max = _this.container.length;
						controll(0);
					});
			}
		});
}

function controll(count){
	if(count >= _this.max) return;
	
	decodeUrl('http://seiga.nicovideo.jp/image/source/' + _this.container[count]).then(res => {
		if(res){
			storeImg(res.url, res.title);
			controll(count+1);
		}
		else{
			relogin().then(() => controll(count));
		}
	})
}

function trydecode(count){
	console.log('count = ' + count);
	var url = 'http://seiga.nicovideo.jp/image/source/' + _this.container[count];
	decodeUrl(url)
			.then(res => {
				if(res){
					storeImg(res.url, res.title);
				}
				else{
					console.log('Pending...' + url);
				}
			})	
}

/*
 *  @method fetchRanking
 *	@params type, mode
		#	type
		 		新着	: 	fresh
		 		毎時	: 	hourly
		 		デイリー: 	daily
		 		週間	: 	weekly
		 		月間	: 	monthly
		 		合計	: 	total
 	
 		#	mode
 				創作		: 	g_creation
 				オリジナル	: 	original
 				似顔絵 		: 	portrait
 				ファンアート: 	g_fanart
 				アニメ		: 	anime
 				ゲーム 		: 	game
 				キャラクター: 	character
 				殿堂入り 	: 	g_popular
 				東方		: 	toho
 				VOCALOID 	: 	vocaloid
 				艦これ 		: 	kancolle
*/
function fetchRanking(type=null,mode=null){	
	return new Promise(function(resolve,rejecte){
		if(type == null) type = 'daily';
		if(mode == null) mode = 'g_popular';
		var url = 'http://seiga.nicovideo.jp/illust/ranking/point/' + type + '/' + mode;
		
		request(url, (err,res,body) => {
			if(err){
				console.log(err);
				resolve(null);
			}
			else{
				var $ = cheerio.load(body);
				var href = $('.center_img_inner');
				var length = (href.length < 100) ? href.length : 100;
				var container = [];

				for(var a = 0 ; a < length; ++a){
					if(typeof href[a].attribs == 'undefined' || typeof href[a].attribs.href == 'undefined'){
						continue; // skip _this content
					}
					var illustid = href[a].attribs.href;
					illustid = illustid.substring(illustid.lastIndexOf('/')+1+2,illustid.lastIndexOf('?'));
					// +2 for cuting 'im' , aka. im602000 -> 602000
					container.push(illustid);
				}
				resolve(container);
			}
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
		_this.jar = jar;
		resolve();
	});
}

function relogin(){
	// why _this.errcount & _this.maxerror won't work???
	return new Promise(function(resolve,reject){
		console.log('err = '+errcount);
		errcount++;
		if(errcount > maxerror){
			console.log('Too Many Error When Getting Cookie');
			process.exit();
		}
		auth(login, options).then(jar => storecookie(jar));
		resolve();
	});
}

function storecontainer(container){
	return new Promise(function(resolve, reject){
		_this.container = container;
		resolve();
	});
}

function decodeUrl(url){
	return new Promise(function(resolve,reject){
		var option = {
			headers : {
				Cookie : _this.jar
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
		  		if(tmptitle == "ログイン" || tmptitle == ''){
		  			resolve(null) ; // error occurs, needs to retry
		  		}

		  		var url = 'http://' + res.socket._host + $('img')[1].attribs.src;
		  		resolve({url: url, title : title});
			}
		});
	});
}

function storeImg(url, title){	
	request({url : url, encoding : 'binary'}, (err,res,body) => {		
		if(!err){			
			var type = res.headers['content-type'];
			type = type.substring(type.lastIndexOf('/')+1, type.length);
			var filename = __dirname + '/Storage/' + sanitize(title) + '.' + type;
			
			fs.writeFile(filename, body, 'binary', err => {
				if(err) console.log('Error to Store : '+ url + ',' + err);
			});
		} 
		else {
			console.log('err : ' + err + ', Skip ' + url );
		}
	});
}