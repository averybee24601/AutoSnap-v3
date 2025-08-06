import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [selectedSeconds, setSelectedSeconds] = useState(3);
  const [countdown, setCountdown] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('photo'); // 'photo' or 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [lastMediaUri, setLastMediaUri] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      await MediaLibrary.requestPermissionsAsync();
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  // Enhanced countdown with TTS
  useEffect(() => {
    let timer = null;
    if (isRunning && countdown > 0) {
      // Speak the countdown number
      Speech.speak(String(countdown), {
        language: 'en',
        pitch: 1,
        rate: 0.9,
      });
      
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isRunning && countdown === 0) {
      // Say "Cheese" and take picture/start recording
      Speech.speak('Cheese!', {
        language: 'en',
        pitch: 1.2,
        rate: 1,
      });
      
      if (mode === 'photo') {
        takePicture();
      } else {
        startVideoRecording();
      }
      setIsRunning(false);
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [isRunning, countdown, mode]);

  const startCountdown = () => {
    if (isRunning || isRecording) return;
    setCountdown(selectedSeconds);
    setIsRunning(true);
  };

  const takePicture = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        const asset = await MediaLibrary.saveToLibraryAsync(photo.uri);
        setLastMediaUri(asset.uri);
        Speech.speak('Photo captured');
      } catch (error) {
        console.log('Error taking picture:', error);
        Speech.speak('Failed to capture photo');
      }
    }
  };

  const startVideoRecording = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync();
        const asset = await MediaLibrary.saveToLibraryAsync(video.uri);
        setLastMediaUri(asset.uri);
        Speech.speak('Video saved');
      } catch (error) {
        console.log('Error recording video:', error);
        Speech.speak('Failed to record video');
        setIsRecording(false);
      }
    }
  };

  const stopVideoRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
        setIsRecording(false);
      } catch (error) {
        console.log('Error stopping recording:', error);
      }
    }
  };

  const viewLastMedia = async () => {
    if (lastMediaUri) {
      try {
        // Try to open the media in the gallery
        await Linking.openURL(lastMediaUri);
      } catch (error) {
        // Fallback: Get the latest media from library
        const { assets } = await MediaLibrary.getAssetsAsync({
          first: 1,
          sortBy: MediaLibrary.SortBy.creationTime,
        });
        
        if (assets.length > 0) {
          Speech.speak('Opening gallery');
          // This will open the default gallery app
          Alert.alert('View Media', 'Please check your gallery app for the latest media.');
        } else {
          Speech.speak('No media found');
        }
      }
    } else {
      Speech.speak('No recent media to view');
    }
  };

  const handleQuickTimer = (seconds) => {
    setSelectedSeconds(seconds);
    Speech.speak(`Timer set to ${seconds} seconds`);
    setTimeout(() => startCountdown(), 500);
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.captureButton} onPress={requestPermission}>
          <Text style={styles.captureText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
        mode={mode}
      >
        {/* Top Controls Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse" size={28} color="white" />
          </TouchableOpacity>

          {/* Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'photo' && styles.modeActive]}
              onPress={() => setMode('photo')}
            >
              <Text style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>
                PHOTO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'video' && styles.modeActive]}
              onPress={() => setMode('video')}
            >
              <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>
                VIDEO
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.topButton}
            onPress={() => Alert.alert(
              'Voice Commands', 
              'Voice commands coming soon!\n\nFor now, use the timer buttons below.',
              [{ text: 'OK' }]
            )}
          >
            <Ionicons name="mic-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Countdown Display Overlay */}
        {isRunning && countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownDisplayLarge}>{countdown}</Text>
          </View>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}
      </CameraView>
      
      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Timer Options */}
        {mode === 'photo' && (
          <View style={styles.timerOptions}>
            <Text style={styles.timerLabel}>Timer:</Text>
            {[3, 5, 10, 20].map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.timerButton,
                  selectedSeconds === sec && styles.timerButtonSelected,
                ]}
                onPress={() => setSelectedSeconds(sec)}
                onLongPress={() => handleQuickTimer(sec)}
                disabled={isRunning || isRecording}
              >
                <Text style={[
                  styles.timerText,
                  selectedSeconds === sec && styles.timerTextSelected
                ]}>
                  {sec}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Main Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Gallery Button */}
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={viewLastMedia}
          >
            <Ionicons name="images-outline" size={30} color="white" />
          </TouchableOpacity>

          {/* Capture/Record Button */}
          {mode === 'photo' ? (
            <TouchableOpacity
              style={[styles.captureButton, isRunning && styles.disabled]}
              onPress={startCountdown}
              disabled={isRunning}
            >
              <View style={styles.captureButtonInner}>
                {isRunning && <Text style={styles.captureCountdown}>{countdown}</Text>}
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.captureButton, styles.videoButton]}
              onPress={isRecording ? stopVideoRecording : startCountdown}
            >
              <View style={[
                styles.videoButtonInner,
                isRecording && styles.videoButtonRecording
              ]} />
            </TouchableOpacity>
          )}

          {/* Quick Actions */}
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              if (mode === 'photo') {
                takePicture();
              } else {
                if (isRecording) {
                  stopVideoRecording();
                } else {
                  startVideoRecording();
                }
              }
            }}
          >
            <Ionicons 
              name={mode === 'photo' ? "camera" : (isRecording ? "stop-circle" : "videocam")} 
              size={30} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 2,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  modeActive: {
    backgroundColor: 'white',
  },
  modeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modeTextActive: {
    color: 'black',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  countdownDisplayLarge: {
    fontSize: 120,
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -2, height: 2 },
    textShadowRadius: 10,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.8)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingBottom: 30,
    paddingTop: 20,
  },
  timerOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  timerLabel: {
    color: 'white',
    fontSize: 16,
    marginRight: 10,
  },
  timerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  timerButtonSelected: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  timerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  timerTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    padding: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    padding: 3,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureCountdown: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  videoButton: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: 'white',
  },
  videoButtonInner: {
    flex: 1,
    margin: 5,
    borderRadius: 25,
    backgroundColor: 'red',
  },
  videoButtonRecording: {
    backgroundColor: 'white',
    borderRadius: 5,
  },
  quickActionButton: {
    padding: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 18,
    color: 'white',
  },
  captureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
