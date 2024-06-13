/**
 * Node.js wrapper for "notify-send".
 */
const os = require('os');
const which = require('which');
const utils = require('../lib/utils');

const EventEmitter = require('events').EventEmitter;
const util = require('util');

const notifier = 'notify-send';
let hasNotifier;

module.exports = NotifySend;

function NotifySend(options) {
  options = utils.clone(options || {});
  if (!(this instanceof NotifySend)) {
    return new NotifySend(options);
  }

  this.options = options;

  EventEmitter.call(this);
}
util.inherits(NotifySend, EventEmitter);

function noop() {}
function notifyRaw(options, callback) {
  options = utils.clone(options || {});
  callback = callback || noop;

  if (typeof callback !== 'function') {
    throw new TypeError(
      'The second argument must be a function callback. You have passed ' +
        typeof callback
    );
  }

  if (typeof options === 'string') {
    options = { title: 'node-notifier', message: options };
  }

  if (!options.message) {
    callback(new Error('Message is required.'));
    return this;
  }

  if (os.type() !== 'Linux' && !os.type().match(/BSD$/)) {
    callback(new Error('Only supported on Linux and *BSD systems'));
    return this;
  }

  if (hasNotifier === false) {
    callback(new Error('notify-send must be installed on the system.'));
    return this;
  }

  if (hasNotifier || !!this.options.suppressOsdCheck) {
    doNotification(options, callback);
    return this;
  }

  try {
    hasNotifier = !!which.sync(notifier);
    doNotification(options, callback);
  } catch (err) {
    hasNotifier = false;
    return callback(err);
  }

  return this;
}

Object.defineProperty(NotifySend.prototype, 'notify', {
  get: function () {
    if (!this._notify) this._notify = notifyRaw.bind(this);
    return this._notify;
  }
});

const NotifySendActionJackerDecorator = function (
  emitter,
  options,
  fn,
  mapper
) {
  options = utils.clone(options);
  fn = fn || noop;
  if (typeof fn !== 'function') {
    throw new TypeError(
      'The second argument must be a function callback. You have passed ' +
        typeof fn
    );
  }

  return function (err, data) {
    let resultantData = data;
    let metadata = {};
    // Allow for extra data if resultantData is an object
    if (resultantData && typeof resultantData === 'object') {
      metadata = resultantData;
      resultantData = resultantData.activationType;
    }

    // Sanitize the data
    if (resultantData) {
      resultantData = resultantData.trim();
      const index = Number(resultantData);
      resultantData = options.action[index].toLowerCase();
    }

    fn.apply(emitter, [err, resultantData, metadata]);
    if (!resultantData && !err) {
      emitter.emit('activate', emitter, options, metadata);
      return;
    }
    if (!err) {
      emitter.emit(resultantData, emitter, options, metadata);
      return;
    }
    if (err) {
      emitter.emit('error', emitter, options, err);
    }
  };
};

const allowedArguments = [
  'action',
  'urgency',
  'expire-time',
  'icon',
  'category',
  'hint',
  'app-name'
];

function doNotification(options, callback) {
  options = utils.mapToNotifySend(options);
  options.title = options.title || 'Node Notification:';

  const initial = [options.title, options.message];
  delete options.title;
  delete options.message;

  if ('actions' in options) {
    options.action = options.actions;
    delete options.actions;
  }

  const argsList = utils.constructArgumentList(options, {
    initial: initial,
    keyExtra: '-',
    arrayArgToMultipleArgs: true,
    allowedArguments: allowedArguments
  });

  const actionJackedCallback = NotifySendActionJackerDecorator(
    this,
    options,
    callback,
    null
  );

  utils.command(notifier, argsList, actionJackedCallback);
}
