/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/* eslint-disable indent */
	// nativeB <3045064+nativeB@users.noreply.github.com>
	const EventEmitter = __webpack_require__(1).EventEmitter;
	const Ultron = __webpack_require__(2);
	const events = new EventEmitter();
	const ultron = new Ultron(events);
	class stream {
	  constructor ({ app_id, retries }) {
	    this.basePrefix = 'baseStateEvt';
	    this.baseEvtPrefix = 'baseEvt';
	    this.baseEventName = (eventName) => `${this.basePrefix}:${eventName}`;
	    this.eventName = (eventName) => `${this.baseEvtPrefix}:${eventName}`;
	    this.channelEventsName = (channelName, event) => `${channelName}:${event}`;
	    this.channelBaseEvent = (channelName, eventName) => `${this.basePrefix}:${channelName}:${eventName}`;
	    this.app = app_id;
	    this.events = [];
	    this.channels = {};
	    this.baseEvents = [];
	    this.trackBinding = [];
	    this.toBeBoundList = [];
	    this.connected = false;
	    this.retries = retries <= 10 ? retries : 10;
	    this.retriesCount = 0;
	    this.baseUrl = 'wss://live.aidahbot.com/ws';
	    this.state = 'connecting';
	    this.liveUrl = this.baseUrl + '?app=' + this.app;
	    this.logging = false;
	    // emit state
	    this.triggerBase('state_change', this.state);
	    // begin connection
	    this.socket = {};
	    this.connect();
	    // bindBase to ws events
	  }
	  connect () {
	    this.socket = new WebSocket(this.liveUrl);
	    this.socket.onopen = () => {
	        this.state = 'connected';
	        this.connected = true;
	        if (this.retriesCount === 0) {
	            this.continueBindingEvents();
	        } else {
	            this.retriesCount = 0;
	            this.continueBindingEvents(...this.trackBinding);
	        }
	        this.triggerBase('state_change', this.state);
	    };
	    this.socket.onclose = () => {
	        this.state = 'closed';
	        this.triggerBase('state_change', this.state);
	    };

	    this.socket.onerror = (e) => {
	        this.state = 'connection_error';
	        this.triggerBase('state_change', 'connection_error');
	        this.connectionRetries();
	        this.logError('error in connection', e);
	    };
	    this.socket.onmessage = (e) => {
	        console.log('ws instance', this.socket);
	        this.messageEngine(e.data);
	    };
	}
	  messageEngine (data) {
	    try {
	      const parsedData = stream.afterRecieve(data);
	      switch (!!parsedData.type) {
	      case true:
	        if (parsedData.channel) {
	          this.triggerChannelBase(parsedData.channel, parsedData.type, parsedData);
	        } else if (parsedData.event) {
	          this.triggerBase(parsedData.type, parsedData);
	        }
	        break;
	      case false:
	        if (parsedData.channel) {
	          this.triggerChannelEvent(parsedData.channel, parsedData.event, parsedData.data);
	        } else if (parsedData.event) {
	          this.triggerEvent(parsedData.event, parsedData.data);
	        }
	        break;
	      }
	    } catch (e) {
	      this.logError(e.message);
	    }
	  }

	  triggerBase (event, data) {
	    try {
	      events.emit(this.baseEventName(event), data);
	      this.log('ws event : ', data);
	    } catch (e) {
	      console.error(e);
	    }
	  }
	  triggerChannelBase (channel, event, data) {
	    try {
	      events.emit(this.channelBaseEvent(channel, event), data);
	      this.log('ws channel event : ', data);
	    } catch (e) {
	      console.error(e);
	    }
	  }
	  triggerEvent (event, data) {
	    events.emit(this.eventName(event), data);
	  }
	  triggerChannelEvent (channel, event, data) {
	    events.emit(this.channelEventsName(channel, event), data);
	  }

	  bindBase (event, cb) {
	    try {
	      stream.validateStrings(event);
	      stream.validateFunctions(cb);
	      ultron.on(this.baseEventName(event), cb);
	      this.log('binding to ws event: ', event);
	    } catch (e) {
	      this.logError(e.message);
	    }
	  }
	  continueBindingEvents () {
	    this.log('continue binding...');
	    const bounding = arguments.length > 0 ? arguments : this.toBeBoundList;
	    for (let i = 0; i < bounding.length; i++) {
	      this.socket.send(bounding[i]);
	    }
	  }

	  bindEvent (event, cb) {
	    try {
	      stream.validateStrings(event);
	      stream.validateFunctions(cb);
	      const evt = {
	        type: 'bind',
	        event: event
	      };

	      if (!this.events.includes(event)) this.events.push(event);

	      this.log('binding to event: ', event);
	      ultron.on(this.eventName(event), cb);
	      this.trackBinding.push(stream.beforeSend(evt));
	      if (!this.connected) {
	        this.log('waiting for connected event before binding: ', event);
	        return this.toBeBoundList.push(stream.beforeSend(evt));
	      }
	      this.socket.send(stream.beforeSend(evt));
	    } catch (e) {
	      this.logError(e.message);
	    }
	  }

	  bindChannelBase (channel, event, cb) {
	    try {
	      stream.validateStrings(event);
	      stream.validateStrings(channel);
	      stream.validateFunctions(cb);
	      ultron.on(this.channelBaseEvent(channel, event), cb);
	      this.log(`binding to base event for channel ${channel}: `, event);
	    } catch (e) {
	      this.logError(e.message);
	    }
	  }
	  bindChannelEvent (channel, event, cb) {
	    try {
	      stream.validateStrings(event);
	      stream.validateStrings(channel);
	      stream.validateFunctions(cb);
	      const evt = {
	        type: 'bind',
	        event: event,
	        channel: channel
	      };

	      if (!this.channels[channel]) { throw new Error('not not subscribed to channel yet'); }
	      if (!this.channels[channel].includes(event)) this.channels[channel].push(event);

	      this.log('binding to channel event: ', channel, event);
	      ultron.on(this.channelEventsName(channel, event), cb);

	      this.trackBinding.push(stream.beforeSend(evt));
	      if (!this.connected) {
	        this.log('waiting for connected event before binding: ', channel, event);
	        return this.toBeBoundList.push(stream.beforeSend(evt));
	      }
	      this.socket.send(stream.beforeSend(evt));
	    } catch (e) {
	      this.logError(e.message);
	    }
	  }

	  subscribeChannel (channel) {
	    try {
	      stream.validateStrings(channel);
	      const evt = {
	        type: 'subscribe',
	        channel: channel
	      };

	      if (!this.channels[channel]) { this.channels[channel] = []; }

	      this.log('subscribing to channel: ', channel);

	      this.trackBinding.push(stream.beforeSend(evt));
	      if (!this.connected) {
	        this.log('waiting for connected event before subscribing: ', channel);
	        return this.toBeBoundList.push(stream.beforeSend(evt));
	      }
	      this.socket.send(stream.beforeSend(evt));

	      return true;
	    } catch (e) {
	      this.logError(e.message);
	      return null;
	    }
	  }
	  unBindChannelEvent (channel, event) {
	    try {
	        if (!this.channels[channel]) return;
	        const eventIdx = this.channels[channel].findIndex((val) => {
	            return val === event;
	        });
	        if (eventIdx !== -1) {
	            const evt = {
	                type: 'unbind',
	                event: event,
	                channel: channel
	            };
	            this.log('Unbind  from  event:  ', channel, event);
	            ultron.remove(this.channelEventsName(channel, event));
	            this.trackBinding.push(stream.beforeSend(evt));
	            if (!this.connected) {
	                this.log('waiting for connected event before unbinding: ', channel, event);
	                return this.toBeBoundList.push(stream.beforeSend(evt));
	            }
	            this.socket.send(stream.beforeSend(evt));
	            return true;
	        }
	    } catch (e) {
	      this.logError(e.message);
	    }
	}
	  unBindEvent (eventName) {
	      const eventIdx = this.events.findIndex((val) => {
	          return val === eventName;
	      });
	      if (eventIdx !== -1) {
	          const evt = {
	              type: 'unbind',
	              event: eventName
	          };
	          this.log('Unbinding from event: ', eventName);
	          ultron.remove(this.eventName(eventName));
	          this.trackBinding.push(stream.beforeSend(evt));
	          if (!this.connected) {
	              this.log('waiting for connected event before unbinding: ', eventName);
	              return this.toBeBoundList.push(stream.beforeSend(evt));
	          }
	          this.socket.send(stream.beforeSend(evt));
	          return true;
	      }
	  }
	  unSubscribeChannel (channel) {
	          if (!this.channels[channel]) return;
	          this.channels[channel].forEach((event, idx) => {
	              ultron.remove(this.channelEventsName(channel, event), () => {
	                  this.channels[channel].splice(idx, 1);
	              });
	          });
	          const evt = {
	            type: 'unsubscribe',
	              channel: channel
	          };

	      this.trackBinding.push(stream.beforeSend(evt));
	      if (!this.connected) {
	          this.log('waiting for connected event before unsubscribing: ', channel);
	          return this.toBeBoundList.push(stream.beforeSend(evt));
	      }
	          this.socket.send(stream.beforeSend(evt));
	          delete this.channels[channel];
	          return true;
	      }
	  // bindEvent (event, cb) {
	  //   stream.validateStrings(event);
	  //   stream.validateFunctions(cb);
	  //   ultron.on(event, cb);
	  // }

	  static beforeSend (data) {
	    return JSON.stringify(data);
	  }
	  static afterRecieve (data) {
	    return JSON.parse(data);
	  }
	  static validateStrings (event) {
	    if (typeof event !== 'string') { throw new TypeError('event name should be a string'); }
	  }
	  static validateFunctions (cb) {
	    if (typeof cb !== 'function') {
	      throw new TypeError('callback should be a function');
	    }
	  }

	   logError () {
	    if (this.logging) { console.error(...arguments); }
	  }
	   logWarn () {
	    if (this.logging) { console.warn(...arguments); }
	  }
	   log () {
	    if (this.logging) { console.log(...arguments); }
	  }

	  connectionRetries () {
	    const reconn = Math.floor(Math.random() * 10);
	    this.logWarn('Critical error, reconnecting in', reconn, 'seconds');
	    if (this.retriesCount < this.retries) {
	        setTimeout(() => {
	            this.retriesCount++;
	            this.connect();
	        }, parseInt(reconn + '000'));
	     } else {
	      this.logError('Client was unable to connect after ', this.retriesCount, ' attempts exiting...');
	    }
	  }
	}

	global.AidahLive = class extends stream {
	  constructor (app_id, { retries }) {
	    super({ app_id: app_id, retries: retries || 10 });
	    // set defaults
	  }
	  // connection binding events stats
	  get connection () {
	    return {
	      bind: (event, cb) => { super.bindBase(event, cb); },
	      state: super.state
	    };
	  }
	  // bind events
	  bind (event, cb) {
	    // events binder
	    super.bindEvent(event, cb);
	  }
	  unbind (eventName) {
	    if (super.unBindEvent(eventName)) return true;
	      else return false;
	  }
	  subscribe (channelName) {
	      if (super.subscribeChannel(channelName)) {
	          return {
	              bind: (event, cb) => {
	                  super.bindChannelEvent(channelName, event, cb);
	              },
	              unbind: (event) => { super.unBindChannelEvent(channelName, event); },
	              connection: {
	                  bind: (event, cb) => {
	                      super.bindChannelBase(channelName, event, cb);
	                  }
	              }
	          };
	      } else return null;
	  }
	  unsubscribe (channelName) {
	      if (super.unSubscribeChannel(channelName)) { return true; } else return false;
	  }
	};

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }),
/* 1 */
/***/ (function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      } else {
	        // At least give some kind of context to the user
	        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
	        err.context = er;
	        throw err;
	      }
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ }),
/* 2 */
/***/ (function(module, exports) {

	'use strict';

	var has = Object.prototype.hasOwnProperty;

	/**
	 * An auto incrementing id which we can use to create "unique" Ultron instances
	 * so we can track the event emitters that are added through the Ultron
	 * interface.
	 *
	 * @type {Number}
	 * @private
	 */
	var id = 0;

	/**
	 * Ultron is high-intelligence robot. It gathers intelligence so it can start improving
	 * upon his rudimentary design. It will learn from your EventEmitting patterns
	 * and exterminate them.
	 *
	 * @constructor
	 * @param {EventEmitter} ee EventEmitter instance we need to wrap.
	 * @api public
	 */
	function Ultron(ee) {
	  if (!(this instanceof Ultron)) return new Ultron(ee);

	  this.id = id++;
	  this.ee = ee;
	}

	/**
	 * Register a new EventListener for the given event.
	 *
	 * @param {String} event Name of the event.
	 * @param {Functon} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @returns {Ultron}
	 * @api public
	 */
	Ultron.prototype.on = function on(event, fn, context) {
	  fn.__ultron = this.id;
	  this.ee.on(event, fn, context);

	  return this;
	};
	/**
	 * Add an EventListener that's only called once.
	 *
	 * @param {String} event Name of the event.
	 * @param {Function} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @returns {Ultron}
	 * @api public
	 */
	Ultron.prototype.once = function once(event, fn, context) {
	  fn.__ultron = this.id;
	  this.ee.once(event, fn, context);

	  return this;
	};

	/**
	 * Remove the listeners we assigned for the given event.
	 *
	 * @returns {Ultron}
	 * @api public
	 */
	Ultron.prototype.remove = function remove() {
	  var args = arguments
	    , ee = this.ee
	    , event;

	  //
	  // When no event names are provided we assume that we need to clear all the
	  // events that were assigned through us.
	  //
	  if (args.length === 1 && 'string' === typeof args[0]) {
	    args = args[0].split(/[, ]+/);
	  } else if (!args.length) {
	    if (ee.eventNames) {
	      args = ee.eventNames();
	    } else if (ee._events) {
	      args = [];

	      for (event in ee._events) {
	        if (has.call(ee._events, event)) args.push(event);
	      }

	      if (Object.getOwnPropertySymbols) {
	        args = args.concat(Object.getOwnPropertySymbols(ee._events));
	      }
	    }
	  }

	  for (var i = 0; i < args.length; i++) {
	    var listeners = ee.listeners(args[i]);

	    for (var j = 0; j < listeners.length; j++) {
	      event = listeners[j];

	      //
	      // Once listeners have a `listener` property that stores the real listener
	      // in the EventEmitter that ships with Node.js.
	      //
	      if (event.listener) {
	        if (event.listener.__ultron !== this.id) continue;
	      } else if (event.__ultron !== this.id) {
	        continue;
	      }

	      ee.removeListener(args[i], event);
	    }
	  }

	  return this;
	};

	/**
	 * Destroy the Ultron instance, remove all listeners and release all references.
	 *
	 * @returns {Boolean}
	 * @api public
	 */
	Ultron.prototype.destroy = function destroy() {
	  if (!this.ee) return false;

	  this.remove();
	  this.ee = null;

	  return true;
	};

	//
	// Expose the module.
	//
	module.exports = Ultron;


/***/ })
/******/ ]);