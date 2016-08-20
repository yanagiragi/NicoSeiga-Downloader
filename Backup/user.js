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
var container = [],tcontainer = []; // list to store ids

const _this = this;
const maxerror = 50;
var errcount = 0, count = 0, max = 0;
var storeindex = '';

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
	.then(() => fetchAll(0))
	.then(() => { console.log('ready'); });//controll(0));
}

function fetchAll(page){
	return new Promise(function(resolve, reject){
		fetchRanking(_this.id, page)
			.then((container) => {
				if(container[0] == null){
					resolve();
				}
				else{					
					storecontainer(container)
						.then(() => {
							_this.max = _this.container.length;
							fetchAll(page+1);
						});
				}
			});
	});	
}
function storeID(container){
	return new Promise(function(resolve, reject){
		_this.id = container;
		resolve();
	});
}

function controll(count){
	if(count >= _this.max){
		logout();
		return;	
	}

	var title = _this.tcontainer[count];	
	
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

function fetchRanking(id, page){
	return new Promise(function(resolve,reject){

		var url = 'http://seiga.nicovideo.jp/user/illust/' + id + '?page=' + page;
		
		console.log('Fetching ' + url);
		
		request(url, (err,res,body) => {
			if(err){
				console.log(err);
				resolve(null);
			}
			else{
				var $ = cheerio.load(body);
				var container = [], tcontainer = [];

				var length = $('.thum').length;
				
				if(length == 0){
					resolve([null,null]);					
					createDir($('.nickname').text()).then(() => controll(0)); // call back hell ?
				}
				
				for(var a = 0; a < length; ++a){
					
					var data = $('.thum')[a].children[0];					
					var illustid = data.attribs.src;
					illustid = illustid.substring(illustid.lastIndexOf('/')+1,illustid.lastIndexOf('q?'));					
					var title = data.attribs.alt;
					
					container.push(illustid);
					tcontainer.push(title);					
				}		
				
				resolve([container,tcontainer]);
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
		
		if(!_this.container) _this.container = [];
		for(var a = 0; a < container[0].length; ++a){
			
			_this.container.push(container[0][a]);
		}

		if(!_this.tcontainer) _this.tcontainer = [];
		for(var a = 0; a < container[1].length; ++a)
			_this.tcontainer.push(container[1][a]);		

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
					var $ = cheerio.load(body);					
					var title = name;
					var url = 'http://' + res.socket._host + $('img')[1].attribs.src;
				}
		  		
		  		resolve({url: url, title : title});
			}
		});
	});
}

function createDir(nickname){
	return new Promise(function(resolve, reject){
		var store = __dirname + '/Storage/' + nickname;
		console.log(store);
		fs.stat( store , function(err, stats) {		
			if (err) {		  
				fs.mkdir(store , '0777', err => {
					if(!err){
						_this.storeindex = nickname;
						resolve();
					}
					else{
						console.log(err);
					} 
				});
			}
			else{
				resolve();
			}
		});
	});
}

function storeImg(url, title){

	request({url : url, encoding : 'binary'}, (err,res,body) => {		
		if(!err){
			var type = res.headers['content-type'];
			type = type.substring(type.lastIndexOf('/')+1, type.length);
			var filename = __dirname + '/Storage/' + _this.storeindex + '/' + sanitize(title) + '.' + type;
			
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