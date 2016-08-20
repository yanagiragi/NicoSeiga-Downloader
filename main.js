const utils = require('./utils.js');
const auth = require('./auth.js');
const options = require('./data.js').getAuth();
const _this = this;

start(); // Main

function preprocess(){
	return new Promise( (resolve, reject) => {
		auth.instantiate(options).then(opts => {		
				if(process.argv.length >= 3){
					if(process.argv.length >= 3){
						if(process.argv[2] != '-user')
							opts.modes.type = process.argv[2];
					}
					if(process.argv.length >= 4){
						if(process.argv[2] == '-user'){
							opts.container.now = {
								id : process.argv[3],
								page : 0
							};
						}
						else
							opts.modes.mode = process.argv[3];
					}
				}
				resolve(opts);
		});	
	});	
}

function start(){
	if(process.argv.length == 4 & process.argv[2] == '-user'){
		preprocess()
		.then( opts => utils.fetchUser(opts))
		.then( opts => {
			if(opts.container.id.length == 0){
				console.log('fetchUser failed! Abort...');
				logout().then( () => { process.exit(); });
			}
			else{
				controll(opts);
			}
		});
	}
	else{
		preprocess()
		.then( opts => utils.fetchRankingXml(opts))
		.then( opts => {
			if(opts.container.id.length == 0){
				console.log('fetchRanking failed! Abort...');
				logout().then( () => { process.exit(); });
			}
			else{
				controll(opts);
			}
		});
	}	
}

function controll(options){
	console.log(options.container.now + ' / ' 
		+ options.container.id.length + ', id = ' 
		+ options.container.id[options.container.now] + 
		', pre-title = ' + options.container.title[options.container.now]);

	// Tasks All Done
	if(options.container.now >= options.container.id.length){
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
			console.log(options.container.path);
			utils.storeImg(res[1].url, res[1].title, options.container.path);

			// Call For next task
			controll(options);
		}
		else{
			// Failed
			auth.relogin(options).then(options => controll(options));
		}
	})
}