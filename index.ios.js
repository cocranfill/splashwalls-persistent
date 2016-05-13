/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ActivityIndicatorIOS,
  Dimensions,
  PanResponder,
  CameraRoll,
  AlertIOS,
  AsyncStorage,
} from 'react-native';

var {width, height} = Dimensions.get('window');

var Q = require('q');
var RandManager = require('./randManager.js');
var Utils = require('./Utils.js');
var ProgressHUD = require('./ProgressHUD.js');
var Swiper = require('react-native-swiper');
var NetworkImage = require('react-native-image-progress');
var Progress = require('react-native-progress');
var ShakeEvent = require('react-native-shake-event-ios');


const NUM_WALLPAPERS = 5;
const DOUBLE_TAP_DELAY = 300; // milliseconds
const DOUBLE_TAP_RADIUS = 20;
const MILLISECONDS_PER_WEEK = 604800000;

class SplashWalls extends Component {
  constructor(props){
    super(props);

    this.state = {
      wallsJSON: [],
      isLoading: true,
      isHudVisible: false
    };

    this.imagePanResponder = {};
    this.wallpaperSource = [];
    this.wallpaperStored = false;

    this.prevTouchInfo = {
      prevTouchX: 0,
      prevTouchY: 0,
      prevTouchTimeStamp: 0
    };


    this.currentWallIndex = 0;

    this.handlePanResponderGrant = this.handlePanResponderGrant.bind(this);
    this.onMomentumScrollEnd = this.onMomentumScrollEnd.bind(this);
  }
  /*
  fetchWallsJSON(){
    var url = 'http://unsplash.it/list';

    fetch(url)
    .then( response => response.json() )
    .then( jsonData => {
      var randomIds = RandManager.uniqueRandomNumbers(NUM_WALLPAPERS, 0, jsonData.length);
      var walls = [];

      randomIds.forEach( randomId => {
        walls.push(jsonData[randomId]);
      });

      this.setState({
        isLoading: false,
        wallsJSON: [].concat(walls)
      });
    })
    .catch(error => console.log('Fetch error: ' + error));
  }
  */
  fetchWallsJSON(){
    var walls = [];

    this.fetchWallpaper()
    .then(wallpaperData => {
      if(wallpaperData){
        var randomIds = RandManager.uniqueRandomNumbers(NUM_WALLPAPERS, 0, wallpaperData.length);

        randomIds.forEach( randomId => {
          walls.push(wallpaperData[randomId]);
        });

        this.setState({
          isLoading: false,
          wallsJSON: [].concat(walls)
        });
      } else {
        console.log('Could not retrieve wallpaper data. Check the console log for more details.')
      }
    })
    .catch(error => console.log('Fetch error: ' + error));
  }
  componentWillMount() {
      this.imagePanResponder = PanResponder.create({
        onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder,
        onPanResponderGrant: this.handlePanResponderGrant,
        onPanResponderRelease: this.handlePanResponderEnd,
        onPanResponderTerminate: this.handlePanResponderEnd
      });

      // Fetch new wallpapers on shake
      ShakeEvent.addEventListener('shake', () => {
        this.initialize();
        this.fetchWallsJSON();
      });
  }
  componentDidMount(){
    this.canReadWallpaperFromStorage().then(result => {
      this.wallpaperStored = result;

      console.log('Wallpaper data stored on device? ' + result);
      console.log('Show loading screen? ' + !result);

      this.fetchWallsJSON();
      this.setState({isLoading: !result});
    })
    .catch(error => console.log('Error querying wallpaper data: ' + error));
  }
  renderLoadingMessage() {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicatorIOS
          animating={true}
          color={'#fff'}
          size={'small'}
          style={{margin: 15}} />
          <Text style={{color: '#fff'}}>Contacting Unsplash</Text>

      </View>
    );
  }
  renderResults(){
    var {wallsJSON, isHudVisible} = this.state;

    return(
      <View>
        <Swiper
        dot={<View style={{backgroundColor:'rgba(255,255,255,.4)', width: 8, height: 8,borderRadius: 10, marginLeft: 3, marginRight: 3, marginTop: 3, marginBottom: 3,}} />}
        activeDot={<View style={{backgroundColor: '#fff', width: 13, height: 13, borderRadius: 7, marginLeft: 7, marginRight: 7}} />}
        loop={false}
        onMomentumScrollEnd={this.onMomentumScrollEnd}
        index={this.currentWallIndex}>


        {wallsJSON.map((wallpaper, index) => {
          return(
            <View key={index}>
              <NetworkImage
                source={{uri: `https://unsplash.it/${wallpaper.width}/${wallpaper.height}?image=${wallpaper.id}`}}
                indicator={Progress.Circle}
                style={styles.wallpaperImage}
                indicatorProps={{color: 'rgba(255, 255, 255)',size: 60,thickness: 7 }}
                {...this.imagePanResponder.panHandlers}>

                <Text style={styles.label}>Photo by</Text>
                <Text style={styles.label_authorName}>{wallpaper.author}</Text>
              </NetworkImage>
            </View>
          );
        })}

        </Swiper>
        <ProgressHUD width={width} height={height} isVisible={isHudVisible}/>
      </View>
    );
  }
  render() {
    var {isLoading} = this.state;

    if(isLoading)
      return this.renderLoadingMessage();
    else
      return this.renderResults();
  }
  handleStartShouldSetPanResponder(e, gestureState) {
    return true;
  }
  handlePanResponderGrant(e, gestureState) {
    var currentTouchTimeStamp = Date.now();

    if( this.isDoubleTap(currentTouchTimeStamp, gestureState) )
      this.saveCurrentWallpaperToCameraRoll();

    this.prevTouchInfo = {
      prevTouchX: gestureState.x0,
      prevTouchY: gestureState.y0,
      prevTouchTimeStamp: currentTouchTimeStamp
    };
  }
  handlePanResponderEnd(e, gestureState) {
    console.log('Finger pulled up from the image');
  }
  isDoubleTap(currentTouchTimeStamp, {x0, y0}) {
    var {prevTouchX, prevTouchY, prevTouchTimeStamp} = this.prevTouchInfo;
    var dt = currentTouchTimeStamp - prevTouchTimeStamp;

    return (dt < DOUBLE_TAP_DELAY && Utils.distance(prevTouchX, prevTouchY, x0, y0) < DOUBLE_TAP_RADIUS);
  }
  onMomentumScrollEnd(e, state, context) {
    this.currentWallIndex = state.index;
  }
  saveCurrentWallpaperToCameraRoll() {
    // Make Progress HUD visible
    this.setState({isHudVisible: true});

    var {wallsJSON} = this.state;
    var currentWall = wallsJSON[this.currentWallIndex];
    var currentWallURL = `http://unsplash.it/${currentWall.width}/${currentWall.height}?image=${currentWall.id}`;

    CameraRoll.saveImageWithTag(currentWallURL)
    .then(data => {
      // Hide Progress HUD
      this.setState({isHudVisible: false});

      AlertIOS.alert(
        'Saved',
        'Wallpaper successfully saved to Camera Roll',
        [
          {text: 'High 5!', onPress: () => console.log('OK Pressed!')}
        ]
      );
    })
    .catch(err => {
      // Hide Progress HUD
      this.setState({isHudVisible: false});

      console.log('Error saving to camera roll: ' + err)
    });
  }
  initialize() {
    this.setState({
      wallsJSON: [],
      isLoading: true,
      isHudVisible: false
    });

    this.currentWallIndex = 0;
  }
  fetchWallpaper() {
    var promise;
    var url = 'http://unsplash.it/list';

    if(this.wallpaperStored)
      promise = this.fetchWallpaperFromStorage();
    else
      promise = this.fetchWallpaperFromNetwork(url);

    return promise;
  }
  fetchWallpaperFromNetwork(url) {
    var deferred = Q.defer();

    if(this.wallpaperSource && this.wallpaperSource.length){
      deferred.resolve(this.wallpaperSource);
      return deferred.promise;
    }

    fetch(url)
    .then( response => response.json() )
    .then( jsonData => {
      console.log('Wallpaper data fetched from network');
      //Store the wallpaper data so we don't have to fetch it across
      //the network again.
      this.saveWallpaperData(jsonData)
      .then(result => {
        this.wallpaperStored = true;
        this.wallpaperSource = jsonData;

        deferred.resolve(jsonData);
      })
      .catch(error => {
        console.log(error);
        deferred.reject(error);
      });
    })
    .catch(error => {
      console.log(error);
      deferred.reject(error);
    });

    return deferred.promise;
  }
  fetchWallpaperFromStorage() {
    var deferred = Q.defer();

    //If we don't have stored wallpaper, reject the promise.
    if(!this.wallpaperStored){
      deferred.reject('Cannot read wallpaper from storage.');
      return deferred.promise;
    }

    //If we have previously retrieved the wallpaper data, do not
    //do so again.
    if(this.wallpaperSource && this.wallpaperSource.length){
      deferred.resolve(this.wallpaperSource);
      return deferred.promise;
    }

    AsyncStorage.getItem("wallpapers")
    .then(wallsData => {
      console.log('Wallpaper data fetched from storage.');
      var object = JSON.parse(wallsData);

      this.wallpaperSource = object.data;

      deferred.resolve(object.data);
    })
    .catch(error => deferred.reject(error));

    return deferred.promise;
  }
  canReadWallpaperFromStorage() {
    var deferred = Q.defer();
    var today = Date.now();
    var result = false;

    AsyncStorage.getItem("wallpapers")
    .then(wallsData => {
      var object = JSON.parse(wallsData);
      if( object && (today < (object.retrieved + MILLISECONDS_PER_WEEK)) )
        deferred.resolve(true);
      else
        deferred.resolve(false);
    })
    .catch(error => deferred.resolve(false));

    return deferred.promise;
  }
  saveWallpaperData(data) {
    return AsyncStorage.setItem("wallpapers", JSON.stringify({retrieved: Date.now(), data: data}));
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  wallpaperImage: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#000'
  },
  label: {
  position: 'absolute',
  color: '#fff',
  fontSize: 13,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  padding: 2,
  paddingLeft: 5,
  top: 20,
  left: 20,
  width: width/2
},
label_authorName: {
  position: 'absolute',
  color: '#fff',
  fontSize: 15,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  padding: 2,
  paddingLeft: 5,
  top: 41,
  left: 20,
  fontWeight: 'bold',
  width: width/2
},
});

AppRegistry.registerComponent('SplashWalls', () => SplashWalls);
