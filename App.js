import { Camera } from 'expo-camera';
import React, {useEffect, useState} from 'react';
import * as tf from '@tensorflow/tfjs'
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import { Button, Image, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { fetch, bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native'
import * as ImagePicker from 'expo-image-picker';
import { View , Text} from 'react-native';
import { setdiff1dAsync } from '@tensorflow/tfjs';
import {useWindowDimensions} from 'react-native';
import * as FileSystem from 'expo-file-system';
const TensorCamera = cameraWithTensors(Camera);

export default function App(props){
  const [tfReady, setTfReady] = useState(false)
  const [model, setModel] = useState(false)
  
  const [displayText, setDisplayText] = useState("loading models")
  const windowWidth = 224;
  const windowHeight = 224;
  const [image, setImage] = useState(null);
  const [classNames, setClassNames] = useState(['class1', 'class2'])
  const [class2Train, setClass2Train] = useState('class1')
  const [classNumber, setClassNumber] = useState(-1);
  const [trainingDataInputs,setTrainingDataInputs] = useState([])
  const [trainingDataOutputs,setTrainingDataOutputs] = useState([])
  const [examplesCount,setExamplesCount] = useState([0,0])
  const [predict,setPredict] = useState(false)
  const [gatherDataState,setGatherDataState]  = useState(0)
  const [mobileNet, setMobileNet]  = useState(undefined);

  useEffect(()=>{
    let checkTf= async()=>{
      console.log("loading models")
      await tf.ready()
      console.log("tf ready loading, mobileNet")
      // const model = await mobilenet.load()
      console.log("modelnet loaded")
      // setModel(model)

      let mobileNet =  await tf.loadGraphModel(
        "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1",
          { fromTFHub: true }
        );
      setDisplayText("loaded Models")

        tf.tidy(()=>{
            let answer = mobileNet.predict(tf.zeros([1,224,224,3]))
            console.log('answer',answer)
        })
        
        let model = tf.sequential()
        model.add(tf.layers.dense({inputShape: [1024],units: 128, activation: 'relu'}))
        model.add(tf.layers.dense({units: classNames.length, activation: 'softmax'}))
        model.summary()
        model.compile({
          optimizer:'adam',
          loss: (classNames.length == 2) ? 'binaryCrossentropy' : 'categoricalCrossentropy',
          metrics: ['accuracy']
          
        })
        setModel(model);
        setMobileNet(mobileNet);
       setTfReady(true)

    }
    checkTf()
  },[])
  
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }
  let AUTORENDER = true
  async function handleCameraStream( images,updatePreview, gl) {
    const loop = async () => {
      if(!AUTORENDER) {
        updatePreview();
      }
      if(tfReady) {
        
        let imageTensor = images.next().value;
        if(imageTensor) {
          imageTensor = tf.cast( imageTensor,"float32");
          if(!predict) {
            // dataGatherLoop(imageTensor);
          }
          predictLoop(imageTensor);
        }
      }


      if(!AUTORENDER) {
        gl.endFrameEXP();
      }
      requestAnimationFrame(loop);
    };

    loop();
  }

  function predictLoop(imageTensor){
    console.log('predictLoop',predict)
    if(!predict) return;
    console.log('predictLoop')
    tf.tidy(()=>{
        let videoFrameAsTensor = imageTensor.div(255)
        let resizedTensorFrame = tf.image.resizeBilinear(videoFrameAsTensor,[224,224],true)
        let imageFeatures = mobileNet.predict(resizedTensorFrame.expandDims())
        let prediction = model.predict(imageFeatures).squeeze()
        let highestIndex = prediction.argMax().arraySync()
        let predictionArray = prediction.arraySync()
        setDisplayText( 'Prediction: '+ classNames[highestIndex] + ' com '+ Math.floor(predictionArray[highestIndex]*100)+'% de certeza')
    })
}


  function gatherDataForClass(classNumber){
    setGatherDataState ((gatherDataState == -1) ? classNumber : -1)

  }

  function dataGatherLoop(imageTensor){
    if(gatherDataState !== -1){
        let imageFeatures = tf.tidy(()=>{
            let videoFrameAsTensor = imageTensor

            let resizedTensorFrame = tf.image.resizeBilinear(videoFrameAsTensor,[224,224],true)
            let normalizedTensorFrame = resizedTensorFrame.div(255)
            
            return mobileNet.predict(normalizedTensorFrame.expandDims()).squeeze();
        })
        let exCount = examplesCount;
        console.log('exCount',exCount)

        setTrainingDataInputs([...trainingDataInputs,imageFeatures])
        setTrainingDataOutputs([...trainingDataOutputs,classNames.indexOf(class2Train)])
        exCount[classNames.indexOf(class2Train)]++
          

        // if(exCount[gatherDataState] === undefined){

        //   exCount[gatherDataState] = 0
        // }
        console.log('gatherDataState',gatherDataState)

        setExamplesCount(exCount);
        setDisplayText('')
        for(let classIndex = 0;classIndex <  classNames.length;classIndex++){
          setDisplayText(classNames[classIndex]+ ' data count: '+examplesCount[classIndex]+'.');
        
        }
        // requestAnimationFrame(dataGatherLoop);
    }

  }
  async function trainAndPredict(){
    setPredict(false)
    tf.util.shuffleCombo(trainingDataInputs,trainingDataOutputs)
    let outputAsTensor = tf.tensor1d(trainingDataOutputs, 'int32')
    let oneHotOutputs = tf.oneHot(outputAsTensor,classNames.length)
    let inputAsTensor = tf.stack(trainingDataInputs)
    console.log('model',model)
    let results = await model.fit(inputAsTensor,oneHotOutputs,{shuffle: true, batchSize: 5, epochs: 10, callbacks: {onEpochEnd:logProgress}})
    outputAsTensor.dispose()
    oneHotOutputs.dispose()
    inputAsTensor.dispose()
    setPredict(true)
  }

  
  function logProgress(epoch,log){
    console.log('data for epoch '+epoch, log)
}
    // Currently expo does not support automatically determining the
    // resolution of the camera texture used. So it must be determined
    // empirically for the supported devices and preview size.

    let textureDims;
    if (Platform.OS === 'ios') {
      textureDims = {
        height: 1920,
        width: 1080,
      };
    } else {
      textureDims = {
        height: 1200,
        width: 1600,
      };
    }

    const pickImage = async () => {
      // No permissions request is necessary for launching the image library
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      console.log(result);
  
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        const fileUri = result.assets[0].uri;      
        const imgB64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
        const raw = new Uint8Array(imgBuffer)  
        const imageTensor = decodeJpeg(raw);
        console.log('trained')
        dataGatherLoop(imageTensor);
        console.log('trained2')
      }
    };

    return (
      <View style={styles.container}>
              <Text style={{height: windowHeight*0.1}}>{displayText}, {class2Train}</Text>

        {tfReady && predict ? (<TensorCamera
          // Standard Camera props
          style={{
            zIndex: -10,
            width: windowWidth*0.7,
            height: windowHeight*0.7,
          }}
          type={Camera.Constants.Type.back}
          // Tensor related props
          cameraTextureHeight={textureDims.height}
          cameraTextureWidth={textureDims.width}
          resizeHeight={224}
          resizeWidth={224}
          resizeDepth={3}
          onReady={handleCameraStream}
          autorender={AUTORENDER}
        />) : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button title="Pick an image from camera roll" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={{ width: 200, height: 200 }} />}
    </View>}
      
        <View style={{
          flexDirection: 'row'
        }}>
          <Button onPress={()=>{setClass2Train('class1'); gatherDataForClass(0)}} title="Classe 1"></Button>
          <Button onPress={()=>{setClass2Train('class2'); gatherDataForClass(1)}} title="Classe 2"></Button>
          <Button onPress={()=>{setGatherDataState(-1)}} title="Parar"></Button>

          <Button onPress={()=>{trainAndPredict()}} title="Treinar e classificar"></Button>
          <Button onPress={()=>{}} title="Reset"></Button>
        </View>
      </View>
    );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#eaeaea", 
    flexDirection:'column',
    justifyContent: 'center',
    alignItems: 'center',

  },


})