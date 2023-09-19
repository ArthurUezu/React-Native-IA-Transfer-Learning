const status = document.getElementById('status')
const video = document.getElementById('webcam')
const enableCam = document.getElementById('enableWebcam')
const reset = document.getElementById('reset')
const train = document.getElementById('train')
const mobilenetwidth = 224
const mobilenetheight = 224
let stopDataGather = -1
const classNames = []
let mobilenet = undefined
let gatherDataState = stopDataGather
let videoPlaying = false
let trainingDataInputs = []
let trainingDataOutputs = []
let examplesCount = []
let predict = false


enableCam.addEventListener('click',()=>{
    console.log();
})

train.addEventListener('click',trainAndPredict)

reset.addEventListener('click',resetF)

let dataCollectors = document.querySelectorAll('.dataCollector');
for(let button of dataCollectors){
    button.addEventListener('mousedown',gatherDataForClass)
    button.addEventListener('mouseup',()=>{
        stopDataGather = -1
    })
    classNames.push(button.getAttribute('data-name'))
}

const doInit = async () => {
    mobilenet = await tf.loadGraphModel(
      "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1",
        { fromTFHub: true }
      );
      console.lo
      tf.tidy(()=>{
          let answer = mobilenet.predict(tf.zeros([1,mobilenetheight,mobilenetwidth,3]))
          console.log('answer',answer)
      })
};
doInit();
let model = tf.sequential()
model.add(tf.layers.dense({inputShape: [1024],units: 128, activation: 'relu'}))
model.add(tf.layers.dense({units: classNames.length, activation: 'softmax'}))
model.summary()
model.compile({
    optimizer:'adam',
    loss: (classNames.length == 2) ? 'binaryCrossentropy' : 'categoricalCrossentropy',
    metrics: ['accuracy']
})

function hasGetUserMedia(){
    return (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

function enableWebCam(){
    if (!hasGetUserMedia()){
        return
    }
    const constraints = {
        video: true,
        width: 640,
        height: 480
    }
    navigator.mediaDevices.getUserMedia(constraints).then((stream)=>{
        video.srcObject = stream
        video.addEventListener('loadeddata',()=>{
            videoPlaying = true
            enableCam.classList.add('removed')
        })
    })
}
enableWebCam();

function gatherDataForClass(){
    let classNumber = parseInt(this.getAttribute('data-1hot'))
    gatherDataState = (gatherDataState == stopDataGather) ? classNumber : stopDataGather
    dataGatherLoop()
}

function dataGatherLoop(){
    if(videoPlaying && gatherDataState !== stopDataGather){
        let imageFeatures = tf.tidy(()=>{
            let videoFrameAsTensor = tf.browser.fromPixels(video)
            let resizedTensorFrame = tf.image.resizeBilinear(videoFrameAsTensor,[mobilenetwidth,mobilenetheight],true)
            let normalizedTensorFrame = resizedTensorFrame.div(255)
            return mobilenet.predict(normalizedTensorFrame.expandDims()).squeeze();
        })
        trainingDataInputs.push(imageFeatures)
        trainingDataOutputs.push(gatherDataState)

        if(examplesCount[gatherDataState] === undefined){
            examplesCount[gatherDataState] = 0
        }
        examplesCount[gatherDataState]++
        status.innerText = ''
        for(let classIndex = 0;classIndex <  classNames.length;classIndex++){
            status.innerText += classNames[classIndex]+ ' data count: '+examplesCount[classIndex]+'.'
        
        }
        window.requestAnimationFrame(dataGatherLoop);
    }

}

async function trainAndPredict(){
    predict = false
    tf.util.shuffleCombo(trainingDataInputs,trainingDataOutputs)
    let outputAsTensor = tf.tensor1d(trainingDataOutputs, 'int32')
    let oneHotOutputs = tf.oneHot(outputAsTensor,classNames.length)
    let inputAsTensor = tf.stack(trainingDataInputs)
    let results = await model.fit(inputAsTensor,oneHotOutputs,{shuffle: true, batchSize: 5, epochs: 10, callbacks: {onEpochEnd:logProgress}})
    outputAsTensor.dispose()
    oneHotOutputs.dispose()
    inputAsTensor.dispose()
    predict = true
    predictLoop()
}

function logProgress(epoch,log){
    console.log('data for epoch '+epoch, log)
}

function predictLoop(){
    if(!predict) return;
    tf.tidy(()=>{
        let videoFrameAsTensor = tf.browser.fromPixels(video).div(255)
        let resizedTensorFrame = tf.image.resizeBilinear(videoFrameAsTensor,[mobilenetwidth,mobilenetheight],true)
        let imageFeatures = mobilenet.predict(resizedTensorFrame.expandDims())
        let prediction = model.predict(imageFeatures).squeeze()
        let highestIndex = prediction.argMax().arraySync()
        let predictionArray = prediction.arraySync()
        status.innerText = 'Predição: '+ classNames[highestIndex] + ' com '+ Math.floor(predictionArray[highestIndex]*100)+'% de certeza'
        window.requestAnimationFrame(predictLoop)
    })
}

function resetF() {
    predict = false
    examplesCount.splice(0)
    for(let trainingDataInput of trainingDataInputs){
        trainingDataInput.dispose()
    }
    trainingDataInputs.splice(0)
    trainingDataOutputs.splice(0)
    status.innerText = 'resetado'
}