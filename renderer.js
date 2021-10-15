// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


const ipc = require('electron').ipcRenderer

const outbox = document.getElementById("outbox")

// var outputdata = [];

var stringbuffer = "";

const form = document.querySelector('form')
const list = document.getElementById('getqueues')
const check = document.getElementById('connection')
const alertboxbtn=document.querySelector('#closealert')

check.addEventListener('click',checkconnection);

function checkconnection(c){
    c.preventDefault();
    const region = document.querySelector("#region").value
    const profile = document.querySelector("#profile").value
    ipc.send('connectivity', region, profile)
  }

list.addEventListener('click',getallqueues);

function getallqueues(q){
  q.preventDefault();
  const region = document.querySelector("#region").value
  const profile = document.querySelector("#profile").value
  ipc.send('getqueueslist', region, profile)
}

form.addEventListener('submit',submitform);

function submitform(e){
  e.preventDefault();
  const msgno = document.querySelector("#msgno").value
  const sqsqueue = document.querySelector("#sqsqueue").value
  const region = document.querySelector("#region").value
  const profile = document.querySelector("#profile").value
  ipc.send('listqueue', msgno, sqsqueue, region, profile)  
}
ipc.on('exception',function(event, data){
    $("#footersection").append(
    '<div class="alert alert-danger alert-dismissible" id="exception"><button type="button" class="close" data-dismiss="alert" id="closealert">&times;</button><strong>Error!</strong> <span class="alerttext">sometext</span></div>'
    );
    
    $(".alerttext").last().text(data.toString());

})

ipc.on("connectivity", function(event, data){
    if(data.httpStatusCode == 200)
    {
        $("#footersection").append(
            '<div class="alert alert-primary alert-dismissible" id="exception"><button type="button" class="close" data-dismiss="alert" id="closealert">&times;</button><strong>Hurray!</strong> <span class="alerttext">sometext</span></div>'
            );
        $(".alerttext").last().text("Connection Established");
    }
})

ipc.on("getqueueslist", function(event, data){
    var queues = []
    $("#sqsqueue").empty();
    data.forEach((e,index) => {
      $("#sqsqueue").append(
        '<option class="queue">Select Queue</option>'
      );
      $(".queue").last().text(e.slice(e.lastIndexOf("/") + 1).toString());
    });
})

ipc.on('listqueue', function(event, data){


    stringbuffer+="\n-----------------------------------"
    stringbuffer+="\nQueue Name :"+document.querySelector("#sqsqueue").value
    stringbuffer+="\nRegion     :"+document.querySelector("#region").value
    stringbuffer+="\nprofile    :"+document.querySelector("#profile").value
    stringbuffer+="\n-----------------------------------"

    //Reset Values
    form.reset()
    $("#sqsqueue").html('<option selected>Select Queue</option>')

    data.forEach((e, index) => {
        msgcount=index+1
        stringbuffer+="\n-----------------------------------"
        stringbuffer+="\nMessage Number => "+msgcount
        stringbuffer+="\n-----------------------------------\n"
        // outputdata.push(JSON.parse(e.Body).Message);
        //console.log(JSON.stringify(outputdata, replacer))
        console.log(typeof(e.Body)); // it is always a String

        if (IsJsonString(e.Body) || typeof(e.Body) == 'object'){
            console.log(JSON.stringify(JSON.parse(e.Body), undefined, 2))
            stringbuffer+=JSON.stringify(JSON.parse(e.Body), undefined, 2)
            stringbuffer+="\n-----------------------------------"
            stringbuffer+="\n\n"
        }
        else{
            stringbuffer+=e.Body
            stringbuffer+="\n-----------------------------------"
            stringbuffer+="\n\n"
        }
        
    });
    
    outbox.textContent=stringbuffer 
})



//To validate if Message is a JSON data
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function replacer(key, value) {
    console.log(value.toString())
    return value.toString()
    //return value.toString().replace(/[^\w\s]/gi, '');
}


// console.log(ipc.sendSync('synchronous-message', 'ping')) // prints "pong"

// ipc.on('asynchronous-reply', (event, arg) => {
//   console.log(arg) // prints "pong"
// })
// ipc.send('asynchronous-message', 'ping')

$('div.alert.close').on('click', function() {
    console.log("clicked")
    $(this).parent().alert('close'); 
 });