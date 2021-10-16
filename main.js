// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const AWS = require("@aws-sdk/client-sqs");
const AWS_EC2 = require("@aws-sdk/client-ec2");
//const { GetQueueUrlResult } = require('@aws-sdk/client-sqs');

let mainWindow;
let QURL;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

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

function onLoad () {
  try {
    const ec2 = new AWS_EC2.EC2({ region: 'us-east-1', profile: 'dev' });
    var params = {
      AllRegions: true,
    }
    ec2.describeRegions(params, function(err, data) {
      if (err){
        mainWindow.webContents.send('exception', err); // Send the response to the renderer
      } // an error occurred
      else{
        //console.log(data);
        mainWindow.webContents.send('zones', data.Regions);
      }// successful response
    })
  } catch (error) {
    console.log(error)
    mainWindow.webContents.send('exception', error); // Send the response to the renderer
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  onLoad()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
ipcMain.on("connectivity",function(event, region, profile){
  try {
    const sqs = new AWS.SQS({ region: region, profile: profile })
    var params = {
      MaxResults: 1,
    }
    sqs.listQueues(params, function(err, data) {
      if (err){
        console.log("Error in SQS Connection Establishment")
        mainWindow.webContents.send('exception', err); // Send the response to the renderer
      } // an error occurred
      else{
        console.log(data.$metadata);
        mainWindow.webContents.send('connectivity', data.$metadata);
      }// successful response
    })
  } catch (error) {
    mainWindow.webContents.send('exception', err); // Send the response to the renderer
  }
})

ipcMain.on("getqueueslist",function(event, region, profile){
  try {
    const sqs = new AWS.SQS({ region: region, profile: profile })
    var params = {
      MaxResults: 1000,
    }
    sqs.listQueues(params, function(err, data) {
      if (err){
        console.log("Error in SQS GetQueueURL")
        mainWindow.webContents.send('exception', err); // Send the response to the renderer
      } // an error occurred
      else{
        //console.log(data);
        mainWindow.webContents.send('getqueueslist', data.QueueUrls);
      }// successful response
    })
  } catch (error) {
    mainWindow.webContents.send('exception', err); // Send the response to the renderer
  }
})

ipcMain.on("listqueue",function(event, msgno, sqsqueue, region, profile){
  // console.log("Messages",msgno)
  // console.log("SQSQueue",sqsqueue.replace(/\s+/g,' ').trim())
  //Performaing AWS SQS Task
  try {
    console.log(sqsqueue)

    const sqs = new AWS.SQS({ region: region, profile: profile });

    var queuename = sqsqueue.replace(/\s+/g,' ').trim();
  
    // First we need to get the URL based on the Name
    
    var params = {
      QueueName: queuename
    }
    sqs.getQueueUrl(params, function(err, data) {
      if (err){
        console.log("Error in SQS GetQueueURL")
        mainWindow.webContents.send('exception', err); // Send the response to the renderer
      }
      else{
        console.log(data.QueueUrl); // successful response
        QURL=data.QueueUrl
          // Once the URL is ready we can get messages
          var para = {
              AttributeNames: 
              [
                "All"
              ],
              MaxNumberOfMessages: msgno,
              MessageAttributeNames: 
              [
                "All"
              ],
              QueueUrl: QURL
            };

            // console.log("ParamsToSQS"+JSON.stringify(para))
            try {
              sqs.receiveMessage(para, function(err, data) {
                if (err) 
                {
                  console.log("Error in SQS Receive Message")
                  mainWindow.webContents.send('exception', err); // Send the response to the renderer
                }
                else {
                  mainWindow.webContents.send('listqueue', data); // Send the response to the renderer
                }     
              });
            } catch (error) {
              console.log("Error has come")
              mainWindow.webContents.send('exception', err); // Send the response to the renderer
              console.log(err, err.stack); // an error occurred
            }
            
          }  
        });
    
  } catch (error) {
      mainWindow.webContents.send('exception', err); // Send the response to the renderer
  }
  

})



// ipcMain.on('asynchronous-message', (event, arg) => {
//   console.log(arg) // prints "ping"
//   event.reply('asynchronous-reply', 'pong')
// })

// ipcMain.on('synchronous-message', (event, arg) => {
//   console.log(arg) // prints "ping"
//   event.returnValue = 'pong'
// })


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
