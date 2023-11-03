import React from 'react';
import { StyleSheet, Text, View ,TouchableOpacity,Platform, Dimensions, } from 'react-native';
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';
import { FontAwesome, Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default class CameraComponent extends React.Component {
  state = {
    hasPermission: null,
    cameraType: Camera.Constants.Type.back,
    isRatioSet: false,
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
    screenRatio: Dimensions.get('window').height / Dimensions.get('window').width,
    ratio: '4:3',
    imagePadding: 10
  }


    prepareRatio = async () => {
        let desiredRatio = '4:3';  // Start with the system default
        // This issue only affects Android
        if (Platform.OS === 'android') {
          const ratios = await this.camera.getSupportedRatiosAsync();
    
          // Calculate the width/height of each of the supported camera ratios
          // These width/height are measured in landscape mode
          // find the ratio that is closest to the screen ratio without going over
          let distances = {};
          let realRatios = {};
          let minDistance = null;
          for (const ratio of ratios) {
            const parts = ratio.split(':');
            const realRatio = parseInt(parts[0]) / parseInt(parts[1]);
            realRatios[ratio] = realRatio;
            // ratio can't be taller than screen, so we don't want an abs()
            const distance = this.state.screenRatio - realRatio; 
            distances[ratio] = realRatio;
            if (minDistance == null) {
              minDistance = ratio;
            } else {
              if (distance >= 0 && distance < distances[minDistance]) {
                minDistance = ratio;
              }
            }
          }
          // set the best match
          desiredRatio = minDistance;
          //  calculate the difference between the camera width and the screen height
          const remainder = Math.floor(
            (this.state.height - realRatios[desiredRatio] * this.state.width) / 2
          );
          // set the preview padding and preview ratio
          this.setState({imagePadding: remainder});
          this.setState({ratio: desiredRatio});
          // Set a flag so we don't do this 
          // calculation each time the screen refreshes
          this.setState({isRatioSet: true});
        }
  }

  setCameraReady = async() => {
    if (!this.state.isRatioSet) {
      await this.prepareRatio();
    }
  };

  async componentDidMount() {
        this.getPermissionAsync()
  }

  getPermissionAsync = async () => {
    // Camera roll Permission 
    if (Platform.OS === 'ios') {
      const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
      }
    }
    // Camera Permission
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasPermission: status === 'granted' });
  }

  handleCameraType=()=>{
    const { cameraType } = this.state

    this.setState({cameraType:
      cameraType === Camera.Constants.Type.back
      ? Camera.Constants.Type.front
      : Camera.Constants.Type.back
    })
  }

  takePicture = async () => {
    if (this.camera) {
      let photo = await this.camera.takePictureAsync();

    }
  }

  pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });
  }
  

  render(){
    const { hasPermission } = this.state
    if (hasPermission === null) {
      return <View />;
    } else if (hasPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
          <View style={{ flex: 1 }}>
            <Camera onCameraReady={this.setCameraReady} style={[{flex: 1,marginTop: this.state.imagePadding*2, marginBottom: this.state.imagePadding*2}]} type={this.state.cameraType}  ref={ref => {this.camera = ref}}>
              <View style={{flex:1, flexDirection:"row",justifyContent:"space-between",margin:30}}>
                <TouchableOpacity
                  style={{
                    alignSelf: 'flex-end',
                    alignItems: 'center',
                    backgroundColor: 'transparent'                 
                  }}
                  onPress={()=>this.pickImage()}>
                  <Ionicons
                      name="ios-photos"
                      style={{ color: "#fff", fontSize: 40}}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    alignSelf: 'flex-end',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                  onPress={()=>this.takePicture()}
                  >
                  <FontAwesome
                      name="camera"
                      style={{ color: "#fff", fontSize: 40}}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    alignSelf: 'flex-end',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                  onPress={()=>this.handleCameraType()}
                  >
                  <MaterialCommunityIcons
                      name="camera-switch"
                      style={{ color: "#fff", fontSize: 40}}
                  />
                </TouchableOpacity>
              </View>
            </Camera>
        </View>
      );
    }
  }
}
