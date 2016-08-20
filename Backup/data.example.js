const login = 'https://account.nicovideo.jp/api/v1/login?show_button_twitter=1&site=seiga&show_button_facebook=1&next_url=%2Fimage%2Fsource%2F6017171';
//const login = 'https://secure.nicovideo.jp/secure/login?site=niconico';
const options = {
	mail_tel : 'your_account',
	password : 'your_passwd'
};

module.exports.getUrl = function(){
	return login;
}
module.exports.getAuth = function(){
	return options;
}