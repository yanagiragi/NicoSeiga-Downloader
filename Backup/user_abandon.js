const request = require('request');
const cookie = require('cookie');
const cheerio = require('cheerio');
const fs = require('fs');
const sanitize = require("sanitize-filename");

const login = require('./data.js').getUrl();
const options = require('./data.js').getAuth();
const logoutURL = require('./data.js').getOut();

var id;
var jar; // cookie jar to hold session
var container,tcontainer; // list to store ids

const _this = this;
const maxerror = 50;

var errcount = 0, count = 0, max = 0;
var type = null, mode = null;


start(); // Main

function preprocess(){
	return new Promise(function(resolve, reject){
		if(process.argv.length == 3){
			resolve(process.argv[2])
		}
		else{
			console.log('usage : node user.js id');
			process.exit();
		}
	});	
}

function start(){
	preprocess()
	.then(id => storeID(id))
	.then(() => relogin())
	.then(jar => {		
		fetchRankingXml(_this.id, jar)
			.then((container) => {
				if(container[0] == null){
					console.log('fetchRanking failed! Abort...');
					logout().then(() => {process.exit()} );
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


function fetchRankingXml(id){
	return new Promise(function(resolve, reject){
		
		var url = 'http://seiga.nicovideo.jp/api/user/data?id=' + id;
		
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
				console.log(body.length);
				if(body.length == 109) resolve(null);
				var $ = cheerio.load(body, {xmlMode : true})

				var data = $("image");
				var length = data.length;
				console.log(length);
				process.exit();
				var container = [];
				var tcontainer = [];	
				
				for(var a = 0; a < length; ++a){					
					if(typeof data[a].children != 'undefined' && typeof data[a].children[1] != 'undefined'){
						container.push(data[a].children[1].children[0].data);
						
						var title = data[a].children[5].children[0].data;
						title = title.substring(title.indexOf(' ')+1,title.length);
						tcontainer.push(title);
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
		resolve(jar);
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
		auth(login, options).then(jar => storecookie(jar).then(jar => {resolve(jar)}));
		//resolve();
	});
}

function storeID(container){
	return new Promise(function(resolve, reject){
		_this.id = container;
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
					console.log('login');
					resolve(null);
				}
				else{
					
					var $ = cheerio.load(body);
					if( typeof $('title') == 'undefined' || typeof $('title')[0] == 'undefined'){
						var title = '';
					}
					else {
						var title = $('title')[0].children[0].data;
						title = title.substring(0,title.lastIndexOf('-')-1);
					}
					
					if(typeof $('img')[1] != 'undefined'){
						var url = 'http://' + res.socket._host + $('img')[1].attribs.src;
					} else {
						var url = 'http://' + res.socket._host + res.client['_httpMessage'].path;
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

function storecontainer(container){
	return new Promise(function(resolve, reject){
		_this.container = container[0];
		_this.tcontainer = container[1];
		resolve();
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