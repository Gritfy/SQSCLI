// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const AWS = require('@aws-sdk/client-sqs');
const AWS_EC2 = require('@aws-sdk/client-ec2');
const { StaleIpPermission } = require('@aws-sdk/client-ec2');
//const { GetQueueUrlResult } = require('@aws-sdk/client-sqs');

let mainWindow;
let QURL;

function startTimer() {
  timer.start();
  setTimeout(stopTimer, 60);
}

function stopTimer() {
  timer.stop();
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Open URLS external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // config.fileProtocol is my custom file protocol
    if (url.startsWith(config.fileProtocol)) {
      return { action: 'allow' };
    }
    // open url in a browser and prevent default
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function onLoad() {
  console.log('server process is ready');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  onLoad();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
ipcMain.on('connectivity', function (event, region, profile) {
  try {
    const sqs = new AWS.SQS({ region: region, profile: profile });
    var params = {
      MaxResults: 1,
    };
    sqs.listQueues(params, function (err, data) {
      if (err) {
        console.log('Error in SQS Connection Establishment');
        mainWindow.webContents.send('exception', err); // Send the response to the renderer
      } // an error occurred
      else {
        console.log(data.$metadata);
        mainWindow.webContents.send('connectivity', data.$metadata);
      } // successful response
    });
  } catch (error) {
    mainWindow.webContents.send('exception', err); // Send the response to the renderer
  }
});

ipcMain.on('getqueueslist', function (event, region, profile) {
  try {
    const sqs = new AWS.SQS({ region: region, profile: profile });
    var params = {
      MaxResults: 1000,
    };
    sqs.listQueues(params, function (err, data) {
      if (err) {
        console.log('Error in SQS GetQueueURL');
        mainWindow.webContents.send('exception', err); // Send the response to the renderer
      } // an error occurred
      else {
        //console.log(data);
        mainWindow.webContents.send('getqueueslist', data.QueueUrls);
      } // successful response
    });
  } catch (error) {
    console.log('Inside getqueueslist Catch');
    mainWindow.webContents.send('exception', err); // Send the response to the renderer
  }
});

ipcMain.on('listqueue', function (event, msgno, sqsqueue, region, profile) {
  // console.log("Messages",msgno)
  // console.log("SQSQueue",sqsqueue.replace(/\s+/g,' ').trim())
  //Performaing AWS SQS Task
  var NoOfMessages;
  var payload;
  try {
    console.log(sqsqueue);

    const sqs = new AWS.SQS({ region: region, profile: profile });

    var queuename = sqsqueue.replace(/\s+/g, ' ').trim();

    // First we need to get the URL based on the Name

    var params = {
      QueueName: queuename,
    };
    sqs.getQueueUrl(params, function (err, data) {
      if (err) {
        console.log('Error in SQS GetQueueURL');
        mainWindow.webContents.send('exception', err); // Send the response to the renderer
      } else {
        console.log(data.QueueUrl); // successful response
        QURL = data.QueueUrl;
        // Once the URL is ready we can get messages
        var para = {
          AttributeNames: ['All'],
          MaxNumberOfMessages: parseInt(msgno),
          MessageAttributeNames: ['All'],
          QueueUrl: QURL,
          WaitTimeSeconds: 20,
        };

        console.log('ParamsToSQS' + JSON.stringify(para));

        try {
          sqs.getQueueAttributes(para, async function (err, data) {
            if (err) {
              console.log('Error Getting Queue Attributes');
              mainWindow.webContents.send('exception', err); // Send the response to the renderer
            } else {
              NoOfMessages = data.Attributes.ApproximateNumberOfMessages;
              approx_notvisible = data.Attributes.ApproximateNumberOfMessagesNotVisible;
              message = 'Approximate Messages Can be read/Visible:' + NoOfMessages + '\nApproximate Messages In Transite/Not Visible:' + approx_notvisible;
              mainWindow.webContents.send('queueinfo', message); // Send the response to the renderer
              // console.log('=TOTALRECEIVED=' + TotalReceivedCount);
              console.log('=Total No Of Messages in Queue=' + NoOfMessages);
              console.log('=Requested no of Messages' + msgno);
              // console.log(typeof(parseInt(NoOfMessages)));
              // console.log(typeof(parseInt(msgno)));
              if (parseInt(NoOfMessages) == 0) {
                message = 'Sinec, Approximate Messages Can be read/Visible:' + NoOfMessages + '\n\nYou need to wait till the Default visibility timeout is done';
                mainWindow.webContents.send('noMessages', message);
              }
              else if (parseInt(NoOfMessages) < parseInt(msgno)) {
                var TotalReceivedCount = 0;
                payload = [];
                var barWidth = 'width: 0%';
                while (parseInt(TotalReceivedCount) < parseInt(NoOfMessages)) {
                  console.log('=TOTALRECEIVED-INSIDELOOP=' + TotalReceivedCount);
                  TotalReceivedCount += 1;
                  console.log('When first loop starts: ' + payload.length);
                  try {
                    const data = await sqs.receiveMessage(para);
                    if (data) {
                      barWidth = 'width: ' + (payload.length / msgno) * 100 + '%';
                      mainWindow.webContents.send('barProgress', barWidth);
                      console.log(data.Messages.length);
                      data.Messages.forEach((e, index) => {
                          payload.push(data.Messages[index]);
                        });
                      if (payload.length == parseInt(NoOfMessages)) {
                        message = 'Queue has less messages than you asked, So pinting all the messages it had.';
                        mainWindow.webContents.send('finalList', message);
                        barWidth = 'width: 100%';
                        mainWindow.webContents.send('barProgress', barWidth);
                        mainWindow.webContents.send('listqueue', payload);
                        console.log('Ends at 1st');
                        //successFlag = true;
                        TotalReceivedCount = 10;
                        return;
                      } else {
                        console.log('Enters Else');
                        //payload.push(payload);
                      }
                      console.log('While first loop exiting: ' + payload.length);
                    }
                  } catch (error) {
                    console.log('Error has come');
                    mainWindow.webContents.send('exception', err); // Send the response to the renderer
                    console.log(err, err.stack); // an error occurred
                    //}
                    break;
                  }
                }
              } else {
                var TotalReceivedCount = 0;
                payload = [];
                var barWidth = 'width: 0%';
                while (parseInt(TotalReceivedCount) < parseInt(NoOfMessages)) {
                  console.log('=TOTALRECEIVED-INSIDELOOP=' + TotalReceivedCount);
                  TotalReceivedCount += 1;
                  console.log('When loop starts: ' + payload.length);
                  try {
                    const data = await sqs.receiveMessage(para);
                    if (data) {
                      barWidth = 'width: ' + (payload.length / msgno) * 100 + '%';
                      mainWindow.webContents.send('barProgress', barWidth);
                      console.log(data.Messages.length);
                      data.Messages.forEach((e, index) => {
                        payload.push(data.Messages[index]);
                      });
                      if (payload.length >= msgno) {
                        //console.log("Payload to Send",payload)
                        barWidth = 'width: 100%';
                        mainWindow.webContents.send('barProgress', barWidth);
                        mainWindow.webContents.send('listqueue', payload);
                        console.log('Ends Here');
                        TotalReceivedCount = 10;
                        return;
                      } else {
                        console.log('Enters Else');
                      }
                      console.log('While exiting: ' + payload.length);
                    }
                  } catch (error) {
                    console.log('Error has come');
                    mainWindow.webContents.send('exception', err); // Send the response to the renderer
                    console.log(err, err.stack); // an error occurred
                    break;
                  }
                } //Close While loop
              }
            }
          });
        } catch (error) {
          console.log('Error has come  while Getting Queue Attributes');
          mainWindow.webContents.send('exception', err); // Send the response to the renderer
          console.log(err, err.stack); // an error occurred
        }
        console.log();
      }
    });
  } catch (error) {
    mainWindow.webContents.send('exception', err); // Send the response to the renderer
  }
});
