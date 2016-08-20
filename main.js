const utils = require('./utils.js');
const auth = require('./auth.js');
const options = require('./data.js').getAuth();
const _this = this;

start(); // Main

function preprocess(){
	return new Promise(function(resolve, reject){
	auth.instantiate(options).then(opts => {		
			if(process.argv.length >= 3){
				opts.modes.type = process.argv[2];
			}
			if(process.argv.length >= 4){
				opts.modes.mode = process.argv[3];
			}
			resolve(opts);
		});	
	});	
}

function start(){
	preprocess()
	.then( opts => utils.fetchRankingXml(opts))
	.then( opts => {
		if(opts.container.url == null){
			console.log('fetchRanking failed! Abort...');
			logout().then( () => { process.exit(); });
		}
		else{
			controll(opts);
		}
	});
}

function controll(options){
	console.log(options.container.now + ' / ' 
		+ options.container.url.length + ', id = ' 
		+ options.container.url[options.container.now] + 
		', pre-title = ' + options.container.title[options.container.now]);

	// Tasks All Done
	if(options.container.now >= options.container.url.length){
		auth.logout(options).then(msgs => {
			console.log('Message : ' + msgs.msg+ ' / ' + msgs.log);
			process.exit();
		});
		return ;
	}

	utils.decodeUrl(options).then(res => {
		if(res[1]){
			// Success !
			console.log('title = ' + res[1].title);
			utils.storeImg(res[1].url, res[1].title, __dirname + '/Storage/');

			// Call For next task
			controll(options);
		}
		else{
			// Failed
			auth.relogin(options).then(options => controll(options));
		}
	})
}