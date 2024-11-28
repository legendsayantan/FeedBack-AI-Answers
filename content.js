var enabled;
var geminiKey;
var geminiModel;
const imageFormat = "image/jpeg";
function updateSettings() {
    chrome.storage.sync.get(["isEnabled", "apiKey","selectedModel"], function (data) {
        enabled = data.isEnabled;
        geminiKey = data.apiKey;
        geminiModel = data.selectedModel;
    })
}
const requestTypes = {
    MCQ: "mcq",
    SAQ: "saq",
    IMAGE: "image",
    IMAGEDATA: "imagedata"
}
function makeRequestData(requestType, imageContent) {
    lastRequestType = requestType;
    var jsonStart = "{\"contents\":[{\"parts\":[{\"text\":\""
    var jsonEnd = "\"}]}]}"
    var bodyHtml = JSON.stringify(document.body.innerHTML)
    var formattedHtml = bodyHtml.substring(1, bodyHtml.length - 1).replace(" ", "");
    var mcqPrompt = "The following html content is supposed to render as a page with question and multiple choice answers. Find the probable question and answer elements, Understand the question to identify the correct answer, then reply ONLY with the selector of Html Element/Node containing the answer. If multiple questions are present, answer the first.";
    var saPrompt = "The following html content is supposed to render as a page with a question and a short answer. Find the probable question and answer elements, Understand the question and write the correct answer, then reply ONLY in this format : <selector of the answer field>\n<the answer>.";
    var imagePrompt = "The following html content is supposed to render as a page with a question in an image. Find the probable image element, then reply ONLY with selector of the image element.";
    var imageDataPrompt = "The attached image includes a question. Understand the question and reply with ONLY the correct answer.\"},\r\n{\r\n\"inline_data\":{\"mime_type\":\""+imageFormat+"\",\"data\": \"";
    switch (requestType) {
        case requestTypes.MCQ:
            return jsonStart + mcqPrompt + formattedHtml + jsonEnd;
        case requestTypes.SAQ:
            return jsonStart + saPrompt + formattedHtml + jsonEnd;
        case requestTypes.IMAGE:
            return jsonStart + imagePrompt + formattedHtml + jsonEnd;
        case requestTypes.IMAGEDATA:
            let imageJsonEnd = "\"}}]}]}"
            return jsonStart + imageDataPrompt + imageContent + imageJsonEnd;
    }
}
function sendRequest(request) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://generativelanguage.googleapis.com/v1beta/models/"+geminiModel+":generateContent?key=" + geminiKey, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(request);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            console.log(response);
            lastResponse = response;
            switch (lastRequestType) {
                case requestTypes.MCQ:
                    var mcq = response.candidates[0].content.parts[0].text;
                    document.querySelector(mcq).style.opacity = 0.7;
                    lastSelector = mcq;
                    lastResponse = undefined;
                    break;
                case requestTypes.SAQ:
                    var response = response.candidates[0].content.parts[0].text.split("\n");
                    document.querySelector(response[0]).innerText = response[1];
                    console.log(response);
                    lastSelector = response[0];
                    lastResponse = response[1];
                    showAnswer();
                    break;
                case requestTypes.IMAGE:
                    let imageSelector = response.candidates[0].content.parts[0].text;
                    let image = document.querySelector(imageSelector)
                    let canvas = document.createElement('canvas');
                    let ctx = canvas.getContext('2d');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    ctx.drawImage(image, 0, 0);
                    let dataURL = canvas.toDataURL(imageFormat);
                    let base64 = dataURL.split(',')[1];
                    sendRequest(makeRequestData(requestTypes.IMAGEDATA, base64));
                    break;
                case requestTypes.IMAGEDATA:
                    var response = response.candidates[0].content.parts[0].text;
                    lastSelector = undefined;
                    lastResponse = response;
                    showAnswer();
                    break;
            }
        }
    }
}
function showAnswer(){
    if(lastSelector && lastResponse){
        document.querySelector(lastSelector).value = lastResponse;
    }else if (lastSelector) {
        let ans = document.querySelector(lastSelector);
        if (ans) {
            ans.style.border = "2px solid yellow";
            ans.style.padding = "5px";
        } else {
            console.log("Element not found");
        }
    }else if(lastResponse){
        var newDiv = document.createElement("div");
        newDiv.id = "geminiResponse";
        newDiv.style = "bottom:0;left:0;position: absolute;background-color: grey;z-index: 999999;border: 1px solid black;padding: 10px;color: white;"
        newDiv.innerText = lastResponse;
        document.body.appendChild(newDiv);
    }
}
function hideAnswer(){
    if (lastSelector) {
        let ans = document.querySelector(lastSelector);
        if (ans) {
            ans.style.border = "none";
            ans.style.padding = "0px";
        } else {
            console.log("Element not found");
        }
    }
    document.getElementById("geminiResponse").remove();
}
//run every 10 secs
setInterval(function () {
    updateSettings();
}, 10000);
//detect keypresses without focusing anywhere
var mcqSequence = "mcq";
var saqSequence = "saq";
var imageSequence = "image";
var showSequence = "show";
var hideSequence = "hide";
var typed = "";
var lastRequestType;
var lastSelector;
var lastResponse;
document.addEventListener('keydown', function (event) {
    typed += event.key;
    let requestData = ""
    if (typed.includes(mcqSequence)) {
        typed = "";
        requestData = makeRequestData(requestTypes.MCQ);
    } else if (typed.includes(saqSequence)) {
        typed = "";
        requestData = makeRequestData(requestTypes.SAQ);
    } else if (typed.includes(imageSequence)) {
        typed = "";
        requestData = makeRequestData(requestTypes.IMAGE);
    } else if (typed.includes(showSequence)) {
        typed = "";
        showAnswer();
    }else if(typed.includes(hideSequence)){
        typed = "";
        hideAnswer();
    }
    if (requestData.length > 0 && enabled) {
        console.log("Sequence triggered");
        sendRequest(requestData);
    }
});
updateSettings();

console.log("Content Script loaded")