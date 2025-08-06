import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Linking, Platform, AppState } from 'react-native';
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

  // Initialize TTS every time component mounts or app becomes active
  useEffect(() => {
    const initializeTTS = async () => {
      try {
        await MediaLibrary.requestPermissionsAsync();
        await Audio.requestPermissionsAsync();
        
        // Stop any existing speech
        await Speech.stop();
        
        // Check if TTS is available
        const isAvailable = await Speech.getAvailableVoicesAsync();
        console.log('TTS voices available:', isAvailable.length);
        
        // Small delay to ensure TTS is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Test TTS on app start with platform-specific settings
        const ttsOptions = {
          language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
          pitch: 1,
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          onDone: () => console.log('TTS test completed'),
          onError: (error) => {
            console.error('TTS initialization error:', error);
            // Don't show alert on every initialization
          },
        };
        
        if (Platform.OS === 'android') {
          // Don't specify voice on Android, let it use default
          delete ttsOptions.voice;
        }
        
        Speech.speak('AutoSnap ready', ttsOptions);
      } catch (error) {
        console.error('Error initializing TTS:', error);
      }
    };

    initializeTTS();

    // Re-initialize TTS when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App became active, reinitializing TTS');
        initializeTTS();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Enhanced countdown with TTS
  useEffect(() => {
    let timer = null;
    if (isRunning && countdown > 0) {
      // Platform-specific TTS options
      const ttsOptions = {
        language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
        pitch: 1,
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        onDone: () => console.log(`Spoke: ${countdown}`),
        onError: (error) => {
          console.error('TTS countdown error:', error);
          // Don't show alert repeatedly, just log the error
        },
      };
      
      // Stop any ongoing speech before speaking new number
      Speech.stop();
      Speech.speak(String(countdown), ttsOptions);
      
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isRunning && countdown === 0) {
      // Say different messages for photo vs video
      const message = mode === 'photo' ? 'Cheese!' : 'Video recording';
      const actionTtsOptions = {
        language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
        pitch: 1.2,
        rate: Platform.OS === 'ios' ? 0.6 : 1,
        onDone: () => console.log(`Spoke: ${message}`),
        onError: (error) => console.error('TTS action error:', error),
      };
      
      Speech.stop();
      Speech.speak(message, actionTtsOptions);
      
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
        console.log('Taking picture...');
        const photo = await cameraRef.current.takePictureAsync();
        console.log('Photo taken:', photo);
        
        if (photo && photo.uri) {
          // Save to library with better error handling
          try {
            const asset = await MediaLibrary.saveToLibraryAsync(photo.uri);
            setLastMediaUri(asset.uri);
            console.log('Photo saved to library:', asset.uri);
          } catch (saveError) {
            console.warn('Could not save to media library:', saveError);
            // Photo was still taken successfully, just couldn't save to library
          }
          
          // Always announce success if photo was taken
          const ttsOptions = {
            language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
            rate: Platform.OS === 'ios' ? 0.5 : 0.8,
            pitch: 1.1,
            onError: (error) => console.error('TTS photo success error:', error),
          };
          await Speech.stop();
          Speech.speak('Photo captured. Looks great!', ttsOptions);
        } else {
          throw new Error('No photo URI returned');
        }
      } catch (error) {
        console.error('Error in takePicture:', error);
        // Only announce failure if photo capture actually failed
        const ttsOptions = {
          language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          onError: (error) => console.error('TTS error message:', error),
        };
        await Speech.stop();
        Speech.speak('Failed to capture photo', ttsOptions);
      }
    }
  };

  const startVideoRecording = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync();

        // Save to library with graceful handling
        try {
          const asset = await MediaLibrary.saveToLibraryAsync(video.uri);
          setLastMediaUri(asset.uri);
          console.log('Video saved to library:', asset.uri);
        } catch (saveError) {
          console.warn('Could not save video to media library:', saveError);
          // Continue, as video capture succeeded
        }

        // Announce successful video capture regardless of save outcome
        const ttsOptions = {
          language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          onError: (error) => console.error('TTS video success error:', error),
        };
        Speech.stop();
        Speech.speak('Video captured', ttsOptions);
        // Reset recording state after successful capture
        setIsRecording(false);
      } catch (error) {
        console.error('Error during video capture:', error);
        const ttsOptions = {
          language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          onError: (error) => console.error('TTS video failure error:', error),
        };
        Speech.stop();
        Speech.speak('Failed to capture video', ttsOptions);
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
          const ttsOptions = {
            language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
            rate: Platform.OS === 'ios' ? 0.5 : 0.8,
            onError: (error) => console.error('TTS gallery error:', error),
          };
          Speech.stop();
          Speech.speak('Opening gallery', ttsOptions);
          // This will open the default gallery app
          Alert.alert('View Media', 'Please check your gallery app for the latest media.');
        } else {
          const ttsOptions = {
            language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
            rate: Platform.OS === 'ios' ? 0.5 : 0.8,
            onError: (error) => console.error('TTS no media error:', error),
          };
          Speech.stop();
          Speech.speak('No media found', ttsOptions);
        }
      }
    } else {
      const ttsOptions = {
        language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        onError: (error) => console.error('TTS no recent media error:', error),
      };
      Speech.stop();
      Speech.speak('No recent media to view', ttsOptions);
    }
  };

  const handleQuickTimer = (seconds) => {
    setSelectedSeconds(seconds);
    const ttsOptions = {
      language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
      rate: Platform.OS === 'ios' ? 0.5 : 0.8,
      onError: (error) => console.error('TTS timer error:', error),
    };
    Speech.stop();
    Speech.speak(`Timer set to ${seconds} seconds`, ttsOptions);
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
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Text style={styles.appTitle}>AutoSnap</Text>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="white" />
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
        {/* Mode Selector */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'photo' && styles.modeTabActive]}
            onPress={() => setMode('photo')}
          >
            <Ionicons 
              name="camera" 
              size={24} 
              color={mode === 'photo' ? '#1e90ff' : 'rgba(255,255,255,0.6)'} 
            />
            <Text style={[styles.modeTabText, mode === 'photo' && styles.modeTabTextActive]}>
              Photo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeTab, mode === 'video' && styles.modeTabActive]}
            onPress={() => setMode('video')}
          >
            <Ionicons 
              name="videocam" 
              size={24} 
              color={mode === 'video' ? '#1e90ff' : 'rgba(255,255,255,0.6)'} 
            />
            <Text style={[styles.modeTabText, mode === 'video' && styles.modeTabTextActive]}>
              Video
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timer Options - Available for both photo and video modes */}
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

        {/* Main Action Button - Center Only */}
        <View style={styles.actionButtons}>
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
              style={[styles.captureButton, styles.videoButton, isRunning && styles.disabled]}
              onPress={isRecording ? stopVideoRecording : startCountdown}
              disabled={isRunning}
            >
              <View style={[
                styles.videoButtonInner,
                isRecording && styles.videoButtonRecording
              ]}>
                {isRunning && !isRecording && (
                  <Text style={styles.videoCountdown}>{countdown}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e90ff',
    letterSpacing: 1,
  },
  flipButton: {
    padding: 12,
    backgroundColor: 'rgba(30,144,255,0.2)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(30,144,255,0.5)',
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 30,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 15,
    marginHorizontal: 50,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 2,
  },
  modeTabActive: {
    backgroundColor: 'rgba(30,144,255,0.3)',
  },
  modeTabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modeTabTextActive: {
    color: '#1e90ff',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countdownDisplayLarge: {
    fontSize: 160,
    color: '#1e90ff',
    fontWeight: '900',
    textShadowColor: 'rgba(30,144,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
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
    backgroundColor: 'rgba(10,10,10,0.95)',
    paddingBottom: 30,
    paddingTop: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,144,255,0.3)',
  },
  timerOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(30,144,255,0.1)',
    marginHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timerLabel: {
    color: '#1e90ff',
    fontSize: 16,
    marginRight: 10,
    fontWeight: '600',
  },
  timerButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timerButtonSelected: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
    transform: [{ scale: 1.1 }],
  },
  timerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  timerTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    padding: 12,
    backgroundColor: 'rgba(30,144,255,0.1)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(30,144,255,0.3)',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30,144,255,0.2)',
    padding: 4,
    borderWidth: 3,
    borderColor: '#1e90ff',
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 35,
    backgroundColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureCountdown: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  videoButton: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderWidth: 3,
    borderColor: '#ff4444',
  },
  videoButtonInner: {
    flex: 1,
    margin: 8,
    borderRadius: 30,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoButtonRecording: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 12,
  },
  videoCountdown: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
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
