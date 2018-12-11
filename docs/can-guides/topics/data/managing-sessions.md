@page guides/data-managing-sessions Managing Sessions
@parent guides/data-extreme
@outline 3

@description Learn how to manage sessions with [can-connect]

@body

## Overview

This section describes how to manage user sessions using [can-connect]. Every application is different and will have different requirements for working with session data. The examples below describe how to use a [JWT](https://jwt.io/) and [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) to manage a user's session. The same techniques can be applied to other session strategies as well. 

> The examples below will use the following file structure. This file structure is arbitrary and the reader is encouraged to change the structure to suit their needs:
> 
> ```
> your-app
> ├── app.js
> ├── components
>     ├── sign-in-form.js
>     ├── logout-button.js
> ├── models
>     ├── session.js
>     ├── session-behavior.js
> ```

## Building the session behavior

Before we start, let's think about the steps involved with managing a user session. User sessions are generally created and managed by an external source such as a server or [OAuth](http://oauth.net/) provider. The client application must be able to communicate with this external source to do the following:

1. get and validate a user session (if it exists)
2. create a user session
3. destroy a user session

Knowing this information, we can begin to create our session behavior. Since we are communicating with an external data source, we will want to implement the [can-connect/DataInterface] methods for loading, creating, and destroying the session data. Here is the basic structure for our session behavior:

**./models/session-behavior.js**

```js
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
		getData() { ... },

		// creates a new session
		createData(data) { ... },

		// destroys an existing session
		destroyData() { ... }
	};
});

export default sessionBehavior;
```

## Building the session model/connection

The session behavior is responsible for loading data from an external source. Therefore, we want to build a connection which uses the above session behavior instead of the [can-connect/data/url/url data-url behavior] for fetching data from the external source:

**./models/session.js**

```js
// import the core behaviors needed by the connection
import connect from 'can-connect';
import dataParse from 'can-connect/data/parse/parse';
import construct from 'can-connect/constructor/constructor';
import constructStore from 'can-connect/constructor/store/store';
import canMap from 'can-connect/can/map/map';
import canRef from 'can-connect/can/ref/ref';
import callbacksOnce from 'can-connect/constructor/callbacks-once/callbacks-once';
import dataCallbacks from 'can-connect/data/callbacks/callbacks';
import realtime from 'can-connect/real-time/real-time';

// import the observable class factories
import DefineMap from 'can-define/map/map';
import DefineList from 'can-define/list/list';

// import the session behavior 
import sessionBehavior from './session-behavior';

// define the Session class
const Session = DefineMap.extend('Session', {
  exp: { type: 'any', identity: true }
});

Session.List = DefineList.extend({ 
  '#': Session 
});

// create the session connection
Session.connection = connect(
	[
	   // use the session behavior
		sessionBehavior,
		construct,
		canMap,
		canRef,
		constructStore,
		dataCallbacks,
		dataParse,
		realtime,
		callbacksOnce
	],
	{
		Map: Session,
		List: Session.List,
		name: 'session'
	}
);

export default Session;
```

## Loading session data

When a user first loads the app, we must first check to see if a session exists. In this case we check for a [JWT](https://jwt.io/) in `sessionStorage` and validate it. If the JWT does not exist or is invalid, we must return an error. This is all done inside the `getData` method for the session behavior:

**./models/session-behavior.js**

@sourceref ./code/session.js
@highlight 14-34,only

During our main application startup, we can check to see if the user session exists. If the session exists, the app can continue loading data. If the session does not exist or is invalid, the app should redirect to the login screen. Since every app is different, it is up to the reader to load application content or redirect the user accordingly.

**./app.js**

```js
import Session from './models/session';

// during app startup
Session.get().then(payload => {
  // the session was valid - load the app content
}).catch(err => {
  // session not valid - redirect to sign in page
});
```

## Creating a new session

At some point a user must be able to sign in to your application. During the sign in process you generally send user data to an external data source and retrieve the new session information (or an error). In the following example, we show how to `POST` a username and password to an external server:

**./models/session-behavior.js**

@sourceref ./code/session.js
@highlight 36-52,only

Within the application the user will sign in by entering their credentials into a sign in form. When the user clicks `SUBMIT` on the form, we will take the form values and create the user session. Since every application is different, it is up to the reader to get the values from the form. It is also the reader's responsiblity to redirect the user or display an error message accordingly:

**./components/sign-in-form.js**

```js
import Session from './models/session';

// handle form "submit" event
handleSubmit(ev) {
  ev.preventDefault();
  
  // get the username and password values
  const { username, password } = this.state;
  
  // instantiate a new session
  const session = new Session({ username, password });
  
  // save the new session and handle the response
  session.save().then(payload => {
    // success - redirect to your application
  }).catch(err => {
    // failure - display error message
  });
}
```

## Destroying a session

At some point a user must be able to log out of your application. Upon logging out, the session information is deleted by deleting the JWT from `sessionStorage`. Some applications might require more complex functionality, and it is up to the reader to implement such functionality:

**./models/session-behavior.js**

@sourceref ./code/session.js
@highlight 54-58,only

Within our application, the user can click a "Log Out" button to end their session. When the button is clicked, we will destroy the session. Since every app is different, it is up to the reader to redirect the user accordingly:

**./components/logout-button.js**

```js
import Session from './models/session';

// handle button "click" event
handleClick(ev) {
  ev.preventDefault();
  
  // destroy the current session
  Session.connection.destroy().then(() => {
    // redirect the user
  });
}
```