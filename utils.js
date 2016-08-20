const request = require('request');
const cheerio = require('cheerio');
const sanitize = require('sanitize-filename');
const fs = require('fs');

/*
 *  @method fetchRanking
 *	@params options [Object]
		#	options.mode.type
		 		新着	: 	fresh
		 		毎時	: 	hourly
		 		デイリー: 	daily
		 		週間	: 	weekly
		 		月間	: 	monthly
		 		合計	: 	total
 	
 		#	options.mode.mode
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
 				R15			: 	r15 
*/
exports.fetchRankingXml = (options) => {
	return new Promise( (resolve, reject) => {
		var type, mode;
		if(options.modes.type == null){
			type = 'daily';
			options.modes.type = type;	
		} 
		else type = options.modes.type;
		
		if(options.modes.mode == null){
			mode = 'g_popular'	
			options.modes.mode = mode;
		}
		else mode = options.modes.mode;
				

		var url = 'http://ext.seiga.nicovideo.jp/api/illust/blogparts?mode=ranking&key=' + type + '%2c' + mode;
		var target = {
			headers : {	Cookie : options.opts.jar },
			url : url,
			method : 'get'
		};

		request(target, (err,res,body) => {
			if(err){
				console.log(err);
				options.container.url = null;
				resolve(options);
			}
			else{				
				var $ = cheerio.load(body, {xmlMode : true});
				var data = $("image");
				var length = (data.length < 100) ? data.length : 100;
				var container = [], tcontainer = [];
				
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

				options.container.url = container;
				options.container.title = tcontainer; // return title due to r15 cannot fetch picture title with webpage
				resolve(options);
			}
		});	
	});
}

exports.decodeUrl = (options) => {
	return new Promise( (resolve,reject) => {
		var target = {
			headers : {	Cookie : options.opts.jar },
			url : 'http://seiga.nicovideo.jp/image/source/' + 
						options.container.url[options.container.now],
			method : 'get'
		};

		request(target , (err,res,body) => {
			if(!err){
				var url,title;
				if(res.socket._host == 'account.nicovideo.jp'){
					resolve([options,null]);
				}
				else{					
					if(options.modes.mode != 'r15'){
						// only load body to cheerio when it's mode is not r15!
						var $ = cheerio.load(body);
						if( typeof $('title') == 'undefined' || typeof $('title')[0] == 'undefined'){
							title = '';
						}
					  	else {
					  		title = $('title')[0].children[0].data;
					  		title = title.substring(0,title.lastIndexOf('-')-1);
					  	}
					  	url = 'http://' + res.socket._host + $('img')[1].attribs.src;
					}
					else {
					  	// r15 needs to deal differently!
						url = 'http://' + res.socket._host + res.client['_httpMessage'].path;

						var name = options.container.title[options.container.now];
						title = (name != null && typeof name != 'undefined')? name : url.substring(url.lastIndexOf('/'),url.length);
					}
					options.container.now++;
				}
		  		resolve([options,{url: url, title : title}]);
			}
			else{
				resolve([option,null]);
			}
		});
	});
}

exports.storeImg = (url, title, path) => {
	request({url : url, encoding : 'binary'}, (err,res,body) => {		
		if(!err){
			var type = res.headers['content-type'];
			type = type.substring(type.lastIndexOf('/')+1, type.length);
			var filename = path + sanitize(title) + '.' + type;
			
			fs.writeFile(filename, body, 'binary', err => {
				if(err) console.log('Error to Store : '+ url + ',' + err);
			});
		} 
		else {
			console.log('err : ' + err + ', Skip ' + url );
		}
	});
}