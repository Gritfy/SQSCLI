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
var HOLDFLAG = false;

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
  console.log(region,profile)
}

form.addEventListener('submit',submitform);

function submitform(e){
  e.preventDefault();
  const msgno = document.querySelector("#msgno").value
  const sqsqueue = document.querySelector("#sqsqueue").value
  const region = document.querySelector("#region").value
  const profile = document.querySelector("#profile").value
  console.log(msgno,sqsqueue,region,profile)
  ipc.send('listqueue', msgno, sqsqueue, region, profile)  
}

// ipc.on("zones", function(event, data){
//     console.log(data);
//     // data.forEach((e,index) => {
//     //     $("#region").append(
//     //         '<option class="region">Select Queue</option>'
//     //     );
//     //     $(".region").last().text(e.toString());
//     //     //console.log(e.RegionName)
//     //   });
// })


const shell = require('electron').shell;

$(document).on('click', 'a[href^="http"]', function(event) {
  event.preventDefault();
  shell.openExternal(this.href);
});

$( document ).ready(function() {
    console.log( "Renderer is ready!" );
    const regions=['us-east-1','us-east-2','us-west-1','us-west-2','af-south-1','ap-east-1','ap-south-1','ap-northeast-3','ap-northeast-2','ap-southeast-1','ap-southeast-2','ap-northeast-1','ca-central-1','eu-central-1','eu-west-1','eu-west-2','eu-south-1','eu-west-3','eu-north-1','me-south-1','sa-east-1']
    regions.forEach((e,index) => {
        $("#region").append(
            '<option class="region">Select Queue</option>'
        );
        $(".region").last().text(e.toString());
      });
});

ipc.on('exception',function(event, data){
    if(data == "Error: Could not load credentials from any providers")
    {
        $("#alertsection").append(
            '<div class="alert alert-danger alert-dismissible" id="exception"><button type="button" class="close" data-dismiss="alert" id="closealert">&times;</button><strong>Error!</strong> <span class="alerttext"></span></div>'
            );
            $(".alerttext").last().text("No profile exists with the given name");
    }
    else if(data == "Error: The security token included in the request is invalid.")
    {
        $("#alertsection").append(
            '<div class="alert alert-danger alert-dismissible" id="exception"><button type="button" class="close" data-dismiss="alert" id="closealert">&times;</button><strong>Error!</strong> <span class="alerttext"></span></div>'
            );  
            $(".alerttext").last().text("Security token in invalid. Please select another Region.");
    }
    else
    {
        $("#alertsection").append(
            '<div class="alert alert-danger alert-dismissible" id="exception"><button type="button" class="close" data-dismiss="alert" id="closealert">&times;</button><strong>Error!</strong> <span class="alerttext"></span></div>'
            );  
            $(".alerttext").last().text(data.toString());
    }
    
    //$(".alerttext").last().text(data.toString());

})

ipc.on("connectivity", function(event, data){
    if(data.httpStatusCode == 200)
    {
        $("#getqueues").removeAttr('hidden');
        $("#alertsection").append(
            '<div class="alert alert-primary alert-dismissible" id="exception"><button type="button" class="close" data-dismiss="alert" id="closealert">&times;</button><strong>Hurray!</strong> <span class="alerttext">sometext</span></div>'
            );
        $(".alerttext").last().text("Connection Established");
    }
})

ipc.on("queueinfo", function(event, data){
    console.log("QueueInfo has come",data)
    $("#alertsection").append(
        '<div class="alert alert-success alert-dismissible" id="exception"><button type="button" class="close" data-dismiss="alert" id="closealert">&times;</button><strong>Queue Stats!</strong> <span class="alerttext">sometext</span></div>'
        );
    $(".alerttext").last().text(data);
})

ipc.on("getqueueslist", function(event, data){
    $("#sqsqueue").empty();
    data.forEach((e,index) => {
      $("#sqsqueue").append(
        '<option class="queue">Select Queue</option>'
      );
      $(".queue").last().text(e.slice(e.lastIndexOf("/") + 1).toString());
    });
    $("#selectqueue").removeAttr('hidden');
    $("#noofmessages").removeAttr('hidden');
    $("#actionbtn").removeAttr('hidden');
})

ipc.on('listqueue', function(event, response){

            console.log(response);  
            let stringbuffer = '';
            outbox.textContent = '';
            stringbuffer+="\n-----------------------------------"
            stringbuffer+="\nQueue Name :"+document.querySelector("#sqsqueue").value
            stringbuffer+="\nRegion     :"+document.querySelector("#region").value
            stringbuffer+="\nprofile    :"+document.querySelector("#profile").value
            stringbuffer+="\n-----------------------------------"

            //Reset Values
            form.reset()
            $("#sqsqueue").html('<option selected>Select Queue</option>')
            $("#getqueues").attr('hidden', true)
            $("#selectqueue").attr('hidden', true)
            $("#noofmessages").attr('hidden', true);
            $("#actionbtn").attr('hidden', true);

            if(typeof response.Messages === 'undefined')
            {
            stringbuffer+="\n There are no messages to show."
            }
            else
            {
                let data = response.Messages;
                console.log(data)
                data.forEach((e, index) => {
                    msgcount=index+1
                    console.log("Message Count:"+msgcount)
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
                        console.log(e.Body)
                        stringbuffer+=e.Body
                        stringbuffer+="\n-----------------------------------"
                        stringbuffer+="\n\n"
                    }
                
                });
            }   

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