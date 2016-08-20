const request = require('request');
const cookie = require('cookie');
const cheerio = require('cheerio');
const fs = require('fs');
const sanitize = require("sanitize-filename");

const login = require('./data.js').getUrl();
const options = require('./data.js').getAuth();
const logoutURL = require('./data.js').getOut();

var jar; // cookie jar to hold session
var container,tcontainer; // list to store ids

const _this = this;
const maxerror = 50;

var errcount = 0, count = 0, max = 0;
var type = null, mode = null;


start(); // Main

function preprocess(){
	return new Promise(function(resolve, reject){
		if(process.argv.length >= 3){
			type = process.argv[2];
		}
		if(process.argv.length >= 4){
			mode = process.argv[3];
		}
		resolve();
	});	
}

function start(){
	preprocess()
	.then(() => relogin())
	.then(() => {
		fetchRankingXml(type, mode)
			.then((container) => {
				if(container[0] == null){
					console.log('fetchRanking failed! Abort...');
					logout().then(() => { process.exit()} );;
				}
				else{					
					storecontainer(container)
						.then(() => {
							_this.max = _this.container.length;
							controll(0);							
						});
				}
			});
		});
}

function controll(count){
	if(count >= _this.max){
		logout();
		return;	
	}

	var title = null;
	if(mode == 'r15'){ // not _this.mode ?
		title = _this.tcontainer[count];
	}
	
	
	decodeUrl('http://seiga.nicovideo.jp/image/source/' + _this.container[count], title).then(res => {
		if(res){
			storeImg(res.url, res.title);
			controll(count+1);
			return;
		}
		else{
			console.log('Pending...' + 'http://seiga.nicovideo.jp/image/source/' + _this.container[count]);
			relogin().then(() => controll(count));
			return;
		}
	})
}

function trydecode(count){
	
	console.log('count = ' + count);	
	var url = 'http://seiga.nicovideo.jp/image/source/' + _this.container[count];

	decodeUrl(url,null)
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
 				カテゴリ合算: 	all
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
 				R15			: 	r15 (Xml Only)
*/
function fetchRanking(type=null,mode=null){
	return new Promise(function(resolve,rejecte){
		if(type == null) type = 'daily';
		if(mode == null) mode = 'g_popular';
		var url = 'http://seiga.nicovideo.jp/illust/ranking/point/' + type + '/' + mode;
		
		console.log('Fetching ' + url);
		
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

function fetchRankingXml(type=null,mode=null){
	return new Promise(function(resolve, reject){
		if(type == null) type = 'daily';
		if(mode == null) mode = 'g_popular';

		var url = 'http://ext.seiga.nicovideo.jp/api/illust/blogparts?mode=ranking&key=' + type + '%2c' + mode;
		var option = {
			headers : {
				Cookie : _this.jar
			},
			url : url,
			method : 'get'
		};
		request(option, (err,res,body) => {
			if(err){
				console.log(err);
				resolve(null);
			}
			else{				
				var $ = cheerio.load(body, {xmlMode : true})
				var data = $("image");
				var length = (data.length < 100) ? data.length : 100;
				var container = [];
				var tcontainer = [];
				
				for(var a = 0; a < length; ++a){					
					if(typeof data[a].children != 'undefined' && typeof data[a].children[1] != 'undefined'){
						container.push(data[a].children[1].children[0].data);
						if(mode == 'r15'){
							var title = data[a].children[5].children[0].data;
							title = title.substring(title.indexOf(' ')+1,title.length);
							tcontainer.push(title);
						}
					}
				}
				resolve([container, tcontainer]);
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
			logout().then(() => { process.exit()} );;
		}
		auth(login, options).then(jar => storecookie(jar));
		resolve();
	});
}

function storecontainer(container){
	return new Promise(function(resolve, reject){
		_this.container = container[0];
		_this.tcontainer = container[1];
		resolve();
	});
}

function decodeUrl(url, name){
	console.log('url = ' + url)
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
				if(res.socket._host == 'account.nicovideo.jp'){
					resolve(null);
				}
				else{
					if(mode != 'r15'){
						// avoid to load body of response to mode:r15 to cheerio!
						var $ = cheerio.load(body);
						if( typeof $('title') == 'undefined' || typeof $('title')[0] == 'undefined'){
							var title = '';
						}
					  	else {
					  		var title = $('title')[0].children[0].data;
					  		title = title.substring(0,title.lastIndexOf('-')-1);
					  	}
					  	var url = 'http://' + res.socket._host + $('img')[1].attribs.src;		
					}
					else {
					  	// r15 needs to deal differently!
						var url = 'http://' + res.socket._host + res.client['_httpMessage'].path;
						
						title = (name != null)? name : url.substring(url.lastIndexOf('/'),url.length);
					}
				}
		  		
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

function logout(){
	return new Promise(function(resolve, reject){
		var option = {
				headers : {
					Cookie : _this.jar
				},
				url : logoutURL,
				method : 'get'
			};
		request(option,(err,res,body) => {
			if(!err){
				var $ = cheerio.load(body);
				var title = $('title')[0].children[0].data;		  		
				title = title.substring(0,title.lastIndexOf('-')-1);
				var tmptitle = title.replace(/\ /g,'').replace('\n','');
				
				if(tmptitle != 'お探しのページは見つかりませんでした。'){
					console.log('Successfully Logout.');
				}
				else {
					console.log('Logout Failed.');
					console.log(res.headers);
				}
			} 
			else{
				console.log(err);
			}
		});
	});
}