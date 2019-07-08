/* eslint-disable indent */
// nativeB <3045064+nativeB@users.noreply.github.com>
const EventEmitter = require('events').EventEmitter;
const Ultron = require('ultron');
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
