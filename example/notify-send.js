const notifier = require('../index');
const path = require('path');

notifier.on('activate', function (notifierObject, options, event) {
  console.log(
    'clicked:',
    JSON.stringify(notifierObject, null, 2),
    JSON.stringify(options, null, 2),
    JSON.stringify(event, null, 2)
  );
});

notifier.on('timeout', function (notifierObject, options) {
  // does not work for notify-send
  console.log(
    'timeout:',
    JSON.stringify(notifierObject, null, 2),
    JSON.stringify(options, null, 2)
  );
});

notifier.on('yes', (nn, options, x) => {
  console.log(
    'YES',
    JSON.stringify(options, null, 2),
    JSON.stringify(x, null, 2)
  );
});
notifier.on('no', (nn, options) => {
  console.log('NO', JSON.stringify(options, null, 2));
});
notifier.on('ok', (nn, options) => {
  console.log('OK', JSON.stringify(options, null, 2));
});

const testNotificationWithoutActions = () => {
  notifier.notify(
    {
      title: 'My awesome title',
      message: 'Hello from node, Mr. User!',
      icon: path.resolve(path.join(__dirname, 'coulson.jpg')), // Absolute path (doesn't work on balloons)
      sound: true, // Only Notification Center or Windows Toasters
      wait: true // Wait with callback, until user action is taken against notification, does not apply to Windows Toasters as they always wait or notify-send as it does not support the wait option
      // actions: ['OK']
    },
    function (err, response, metadata) {
      // Response (is response from notification
      // Metadata contains activationType, activationAt, deliveredAt
      console.log(
        'cb:',
        JSON.stringify(err, null, 2),
        JSON.stringify(response, null, 2),
        JSON.stringify(metadata, null, 2)
      );
    }
  );
};

const testNotificationWithActions = () => {
  notifier.notify(
    {
      title: 'My awesome title',
      message: 'Hello from node, Mr. User!',
      icon: path.resolve(path.join(__dirname, 'coulson.jpg')), // Absolute path (doesn't work on balloons)
      sound: true, // Only Notification Center or Windows Toasters
      actions: ['Yes', 'No']
    },
    function (err, response, metadata) {
      // Response is response from notification
      // Metadata contains activationType, activationAt, deliveredAt
      console.log(
        'cb:',
        JSON.stringify(err, null, 2),
        JSON.stringify(response, null, 2),
        JSON.stringify(metadata, null, 2)
      );
    }
  );
};

if (require.main === module) {
  setTimeout(testNotificationWithActions, 10);
  setTimeout(testNotificationWithoutActions, 10000);
}
