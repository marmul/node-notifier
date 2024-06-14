/**
 * Node.js wrapper for "notify-send".
 */
const os = require('os');
const which = require('which');
const utils = require('../lib/utils');
const EventEmitter = require('events').EventEmitter;
const execSync = require('child_process').execSync;
const semver = require('semver');

const notifier = 'notify-send';
let hasNotifier;
let hasActionsCapability;

function noop() {}

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

class NotifySend extends EventEmitter {
  constructor(options) {
    super();
    this.options = utils.clone(options || {});
    this.checkActionCapability();
  }

  notify(options, callback) {
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
      this._doNotification(options, callback);
      return this;
    }

    try {
      this._doNotification(options, callback);
    } catch (err) {
      hasNotifier = false;
      return callback(err);
    }

    return this;
  }

  checkActionCapability() {
    hasActionsCapability = false;
    hasNotifier = !!which.sync(notifier);

    if (!hasNotifier) return;

    const notifierVersion = execSync(notifier + ' --version');
    const notifierVersionNumber = notifierVersion
      .toString()
      .trim()
      .split(' ')[1];

    if (
      semver.satisfies(
        utils.garanteeSemverFormat(notifierVersionNumber),
        '>=0.8.2'
      )
    ) {
      hasActionsCapability = true;
    } else {
      // throw new Error('notify-send version ' + notifierVersionNumber + ' does not support "actions". Upgrade to a newer version >=0.8.2');
    }
  }

  _doNotification(options, callback) {
    if ('actions' in options) {
      // rename actions to action
      options.action = options.actions;
      delete options.actions;
    }
    const originalOptions = utils.clone(options); // nearly original options
    options = utils.mapToNotifySend(options);
    options.title = options.title || 'Node Notification:';

    const initial = [options.title, options.message];
    delete options.title;
    delete options.message;

    const allowedArguments = [
      'urgency',
      'expire-time',
      'icon',
      'category',
      'hint',
      'app-name'
    ];
    if (hasActionsCapability) {
      allowedArguments.push('action');
      allowedArguments.push('wait');
    }

    const argsList = utils.constructArgumentList(options, {
      initial: initial,
      keyExtra: '-',
      arrayArgToMultipleArgs: hasActionsCapability,
      explicitTrue: true,
      allowedArguments: allowedArguments
    });

    if (!hasActionsCapability) {
      return utils.command(notifier, argsList, callback);
    }

    const actionJackedCallback = NotifySendActionJackerDecorator(
      this,
      originalOptions,
      callback,
      null
    );

    utils.command(notifier, argsList, actionJackedCallback);
  }
}

module.exports = NotifySend;
