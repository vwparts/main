"use strict";

var logger = require('./../common/apputils').logger;
var util = require('util');
var cfenv = require('cfenv');
var config = require('./config'); 
var passport = require('passport');


var Authentication = function(){

	var appEnv = cfenv.getAppEnv();
	

	passport.serializeUser(function(user, done) {
	   done(null, user);
	}); 

	passport.deserializeUser(function(obj, done) {
	   done(null, obj);
	});

	var services;
	if(process.env.VCAP_SERVICES)
		services = JSON.parse(process.env.VCAP_SERVICES || "{}");
	else
		services = JSON.parse(config.vcap);

	var ssoConfig = services.SingleSignOn[0]; 
	var client_id = ssoConfig.credentials.clientId;
	var client_secret = ssoConfig.credentials.secret;
	var authorization_url = ssoConfig.credentials.authorizationEndpointUrl;
	var token_url = ssoConfig.credentials.tokenEndpointUrl;
	var issuer_id = ssoConfig.credentials.issuerIdentifier;
	var callback_url = appEnv.url + '/auth/sso/callback'; 

	var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;
	var Strategy = new OpenIDConnectStrategy({
	                 authorizationURL : authorization_url,
	                 tokenURL : token_url,
	                 clientID : client_id,
	                 scope: 'openid',
	                 response_type: 'code',
	                 clientSecret : client_secret,
	                 callbackURL : callback_url,
	                 skipUserProfile: true,
	                 issuer: issuer_id}, 
	  function(iss, sub, profile, accessToken, refreshToken, params, done)  {
	            process.nextTick(function() {
	    profile.accessToken = accessToken;
	    profile.refreshToken = refreshToken;
	    done(null, profile);
	          })
	}); 

	passport.use(Strategy); 


	var handleLoginContext = function(req, res, next) {
		logger.debug('[Authentication.handleLoginContext] IN');
		req.session.originalUrl = req.query.path;
		logger.info(util.format('[Authentication.handleLoginContext] setting originalUrl: %s', req.query.path));
		logger.debug('[Authentication.handleLoginContext] OUT');
	    return next();
	};

	var requestAuth = function(req, res, next) {
		logger.debug('[Authentication.requestAuth] IN');
		if (process.env.MODE == 'TEST' || process.env.MODE == 'DEV')
		  return next();

		if(!req.isAuthenticated()) {
			req.session.originalUrl = req.originalUrl;
	  		res.redirect('/auth/login');
		} 
		else
			return next();

		logger.debug('[Authentication.requestAuth] OUT');
	};

	var verifyAuth = function(req, res, next) {
		logger.debug('[Authentication.verifyAuth] IN');
	  if (process.env.MODE == 'TEST' || process.env.MODE == 'DEV')
	      return next();

	  if(!req.isAuthenticated())
	  		res.status(401).end();
	  else
	  	return next();

	  logger.debug('[Authentication.verifyAuth] OUT');
	};

	var logout = function(req, res) {
		req.logout();
		res.redirect('https://' + issuer_id + '/idaas/mtfim/sps/idaas/logout');
	};

	var session = function(req, res) {
		logger.debug('[Authentication.session] IN');
		var r = {};
		
		if (process.env.MODE == 'TEST' || process.env.MODE == 'DEV'){
	     	 r.user = {
					id: '******DUMMY*********'
					, groups: ['DUMMYGROUP', 'admin']
					, firstName: 'TEST'
				};
		}
		else{
			if(req.isAuthenticated()){
				console.log('session %s', JSON.stringify(req.session));
			 	var u = req.session.passport.user;
				r.user = {
					id: u.id
					, groups: u.groups
					, firstName: u._json.firstName
				};
			}
		}

		res.status(200).json(r);
        res.end();
		logger.debug('[Authentication.session] OUT');
	};

	var loginCallback = function(req,res,next) {               
		var redirect_url = req.session.originalUrl;     
		logger.info(util.format('[auth.route.router.get] if successful login, we are going to redirect to: %s', redirect_url));       
		passport.authenticate('openidconnect', {
		     successRedirect: redirect_url,                                
		     failureRedirect: '/auth/failure',                        
		})(req,res,next);
	};

	var loginFail = function(req, res) {  res.send('login failed'); };

/*	var login = function(){
		logger.debug('[Authentication.login] IN');
		passport.authenticate('openidconnect', {});
		logger.debug('[Authentication.login] OUT');
	};*/

	return {
		passport: passport
		, issuerId: issuer_id
		, handleLoginContext: handleLoginContext
		, requestAuth: requestAuth
		, verifyAuth: verifyAuth
		, logout: logout
		, loginCallback: loginCallback
		, loginFail: loginFail
		, session: session
	};
}();

module.exports = Authentication;