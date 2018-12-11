import connect from 'can-connect';
import ajax from 'can-ajax';
import decode from 'jwt-decode';

const STORAGE_KEY = 'session-jwt';

const sessionBehavior = connect.behavior('data/session', function (base) {
	return {
		// optional - useful for one-time setup and configuration
		init() {
			base.init.apply(this, arguments);
		},

		// loads and validates an existing session
		getData() {
			// check if token exists
			try {
				const token = sessionStorage.getItem(STORAGE_KEY);
				if(!token) {
					throw new Error('No token found');
				}
			
				// check if token is valid or expired
				const payload = decode(JSON.parse(token));
				if(!payload || payload.exp * 1000 > Date.now()) {
					throw new Error('Invalid token');
				}
			} catch(ex) {
				return Promise.reject(ex);
			}
			
			// success, resolve with the payload
			return Promise.resolve(payload);
		},

		// creates a new session
		createData(data) {
			return ajax({ 
				type: 'POST', 
				url: '/api/login', 
				data: {
					username: data.username,
					password: data.password
				}
			}).then(jwt => {
				// store the result JWT for later
				sessionStorage.setItem(STORAGE_KEY, jwt);
				
				// return the decoded payload
				return decode(jwt);
			});
		},

		// destroys an existing session
		destroyData() {
			sessionStorage.removeItem(STORAGE_KEY);
			return Promise.resolve(true);
		}
	};
});

export default sessionBehavior;
