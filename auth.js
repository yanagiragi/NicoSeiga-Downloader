const request = require('request');
const cookie = require('cookie');
const cheerio = require('cheerio');

/*
	# Basic Data Structure
	options: { 
		opts: {
			err : errcount
			max : maxerror
			login : login
			logout : logout
			opts: acc&passwd		
			jar : cookie jar
		}
		modes : {
			// more details , check util.js fetchRankingXml()
			type : time_type
			mode : pic_type
		}
		container : {
			now: 0,
			url: [],
			title : []
		}
	}
*/

exports.instantiate = (opts, type=null, mode=null,maxerror=50) => {
	return new Promise((resolve, reject) => {
		resolve({
			opts : {
				err : 0,
				max : maxerror,
				login : 'https://account.nicovideo.jp/api/v1/login?show_button_twitter=1&site=seiga&show_button_facebook=1&next_url=%2Fimage%2Fsource%2F6017171',
				logout : 'https://secure.nicovideo.jp/secure/logout',
				auth: opts,
				jar : null
			},
			modes : {
				type : type,
				mode : mode
			},
			container : {
				now: 0,
				url: null,
				title : null
			}
		});
	});
} 

// this function should only called by exports.relogin() !
function login(options){
	return new Promise((resolve, reject) => {
		request.post({url : options.opts.login ,form : options.opts.auth},(err,res,body) => {
				if(err){
					console.log(err);
					options.opts.jar = null;
					resolve(options);
				}
				else{
					options.opts.jar = cookie.serialize(res.headers['set-cookie']);
					resolve(options);
				}
			}
		);
	});
}

exports.relogin = (options) => {
	return new Promise( (resolve,reject) => {
		console.log('err = ' + options.opts.err);
		options.opts.err++;
		if(options.opts.err >= options.opts.max){
			console.log('Too Many Error When Getting Cookie');
			this.logout(options).then(() => {process.exit()});
		}
		// this.login refers to 'login' in current Promise scope!
		login(options).then(options => resolve(options));
	});
}

exports.logout = (options) => {
	return new Promise((resolve, reject) => {
		var option = {
				headers : {	Cookie : options.opts.jar },
				url : options.opts.logout,
				method : 'get'
			};
		request(option,(err,res,body) => {
			if(!err){
				var $ = cheerio.load(body);
				var title = $('title')[0].children[0].data;		  		
				title = title.substring(0,title.lastIndexOf('-')-1);
				title = title.replace(/\ /g,'').replace('\n','');
				
				if(title != 'お探しのページは見つかりませんでした。'){
					resolve({msg : 'Successfully Logout.', log : null});
				}
				else {
					resolve({msg : 'Logout Failed.', log : res.headers});
				}
			} 
			else{
				resolve({msg : 'Logout Failed.', log : err});
			}
		});
	});
}