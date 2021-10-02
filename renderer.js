// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const ipc = require('electron').ipcRenderer

const outbox = document.getElementById("outbox")

var outputdata = [];

var stringbuffer = "";

const form = document.querySelector('form')
form.addEventListener('submit',submitform);

function submitform(e){
  e.preventDefault();
  const msgno = document.querySelector("#msgno").value
  const sqsqueue = document.querySelector("#sqsqueue").value
  console.log("=>",msgno,"=>",sqsqueue)
  ipc.send('listqueue', msgno, sqsqueue)  
}

ipc.on('listqueue', function(event, data){
    console.log("data return",data.join("\n"))
    

    data.forEach((e, index) => {
        msgcount=index++
        stringbuffer+="\n-----------------------------------"
        stringbuffer+="\nMessage Number => "+msgcount
        stringbuffer+="\n-----------------------------------\n"
        outputdata.push(JSON.parse(e.Body).Message);
        stringbuffer+=JSON.stringify(outputdata);
        stringbuffer+="\n-----------------------------------"
        stringbuffer+="\n\n"
    });
    
    outbox.innerHTML=stringbuffer 
})

console.log(ipc.sendSync('synchronous-message', 'ping')) // prints "pong"

ipc.on('asynchronous-reply', (event, arg) => {
  console.log(arg) // prints "pong"
})
ipc.send('asynchronous-message', 'ping')

