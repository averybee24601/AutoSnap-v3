import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Linking, Platform, AppState } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import Slider from '@react-native-community/slider';
 
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
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [flashVisible, setFlashVisible] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);
  const [showSilentModeWarning, setShowSilentModeWarning] = useState(false);
  const cameraRef = useRef(null);
  const isPad = Platform.OS === 'ios' && Platform.isPad;

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
    } catch {}
  };

  // Direct speak function for initialization (no dependencies)
  const speakDirect = (text, options = {}) => {
    console.log(`speakDirect called with: "${text}"`);
    try {
      Speech.stop();
      Speech.speak(text, {
        language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
        pitch: 1,
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        volume: ttsVolume,
        ...options,
      });
      console.log('Speech.speak called successfully');
    } catch (error) {
      console.error('Error in speakDirect:', error);
    }
  };

  const speak = useCallback((text, options = {}) => {
    console.log(`speak called, volume: ${ttsVolume}, text: "${text}"`);
    if (ttsVolume === 0) {
      console.log('TTS volume is 0, not speaking');
      return;
    }
    try {
      Speech.stop();
      Speech.speak(text, {
        language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
        pitch: 1,
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        volume: ttsVolume,
        ...options,
      });
    } catch (error) {
      console.error('Error in speak:', error);
    }
  }, [ttsVolume]);

  // Track if this is the first app launch
  const isFirstLaunch = useRef(true);
  const hasSpokenWelcome = useRef(false);

  // Initialize TTS system (no dependencies - runs once)
  useEffect(() => {
    const initializeTTSSystem = async () => {
      console.log('Starting TTS system initialization...');
      console.log('Platform:', Platform.OS, 'Version:', Platform.Version);
      try {
        // Request permissions
        console.log('Requesting permissions...');
        await MediaLibrary.requestPermissionsAsync();
        const audioPermission = await Audio.requestPermissionsAsync();
        console.log('Audio permission status:', audioPermission.status);
        
        // Set audio mode with more comprehensive settings for iOS devices
        console.log('Setting audio mode...');
        try {
          // Detect if we're on iPhone vs iPad
          const isIPhone = Platform.OS === 'ios' && !Platform.isPad;
          console.log('Device type:', isIPhone ? 'iPhone' : (Platform.isPad ? 'iPad' : 'Other'));
          
          if (Platform.OS === 'ios') {
            // Try with safe numeric values that work across all iOS devices
            const audioConfig = {
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              interruptionModeIOS: InterruptionModeIOS?.DoNotMix || 3, // Use constant or fallback to numeric
              shouldDuckAndroid: false,
              interruptionModeAndroid: InterruptionModeAndroid?.DoNotMix || 3,
              playThroughEarpieceAndroid: false,
            };
            
            console.log('Setting iOS audio mode with config:', audioConfig);
            await Audio.setAudioModeAsync(audioConfig);
          } else {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              interruptionModeIOS: 1,
              shouldDuckAndroid: true,
              interruptionModeAndroid: 1,
              playThroughEarpieceAndroid: false,
            });
          }
          console.log('Audio mode set successfully');
        } catch (audioModeErr) {
          console.warn('Failed to set audio mode:', audioModeErr);
          // Try multiple fallback configurations
          const fallbackConfigs = [
            { playsInSilentModeIOS: true, allowsRecordingIOS: false },
            { playsInSilentModeIOS: true },
            {} // Empty config as last resort
          ];
          
          for (const config of fallbackConfigs) {
            try {
              console.log('Trying fallback config:', config);
              await Audio.setAudioModeAsync(config);
              console.log('Fallback audio mode set successfully');
              break;
            } catch (fallbackErr) {
              console.warn('Fallback failed:', fallbackErr);
            }
          }
        }
        
        // Stop any existing speech
        await Speech.stop();
        
        // Check if TTS is available
        const voices = await Speech.getAvailableVoicesAsync();
        console.log('TTS voices available:', voices.length);
        
        // On iOS, we need to "prime" the audio system differently for iPhone vs iPad
        if (Platform.OS === 'ios' && voices.length > 0) {
          try {
            console.log('Priming iOS audio system...');
            // First attempt: speak empty string
            await Speech.speak('', { 
              volume: 0.01,
              rate: 10,
              onDone: () => console.log('Audio system primed (empty)'),
              onError: (err) => console.log('Prime error (empty):', err)
            });
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Second attempt: speak a space with different settings
            await Speech.speak(' ', { 
              volume: 0.1,
              rate: 1,
              language: 'en-US',
              onDone: () => console.log('Audio system primed (space)'),
              onError: (err) => console.log('Prime error (space):', err)
            });
            
            await Speech.stop();
            console.log('Audio priming complete');
          } catch (primeErr) {
            console.log('Audio prime error:', primeErr);
          }
        }
        
        // Mark TTS as ready
        setTtsReady(true);
        console.log('TTS system initialization complete');
        
      } catch (error) {
        console.error('Error initializing TTS system:', error);
      }
    };

    initializeTTSSystem();
  }, []); // No dependencies - runs once

  // Handle welcome message separately
  useEffect(() => {
    if (ttsReady && ttsVolume > 0 && !hasSpokenWelcome.current) {
      hasSpokenWelcome.current = true;
      console.log('TTS ready and volume > 0, speaking welcome message...');
      
      // Small delay to ensure everything is ready
      setTimeout(() => {
        const welcomeMessage = 'Welcome to AutoSnap. Set a timer using the buttons at the bottom, then press the capture button to start the countdown. I will count down and announce when your photo or video is captured.';
        speakDirect(welcomeMessage, {
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          volume: ttsVolume,
          onDone: () => console.log('Welcome message completed'),
          onError: (error) => {
            console.error('TTS welcome error:', error);
            // Reset so it can try again on user interaction
            hasSpokenWelcome.current = false;
            // Check if silent mode might be the issue
            if (Platform.OS === 'ios' && error.message?.includes('AVAudioSession')) {
              setShowSilentModeWarning(true);
            }
          },
        });
      }, 1000);
    }
  }, [ttsReady, ttsVolume]);

  // Fallback: Play welcome message on first user interaction if it hasn't played yet
  const handleFirstInteraction = useCallback(() => {
    if (ttsReady && ttsVolume > 0 && !hasSpokenWelcome.current) {
      console.log('Playing welcome message on first interaction...');
      hasSpokenWelcome.current = true;
      const welcomeMessage = 'Welcome to AutoSnap. Set a timer using the buttons at the bottom, then press the capture button to start the countdown. I will count down and announce when your photo or video is captured.';
      speakDirect(welcomeMessage, {
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        volume: ttsVolume,
        onDone: () => console.log('Welcome message completed (interaction)'),
        onError: (error) => {
          console.error('TTS welcome error (interaction):', error);
        },
      });
    }
  }, [ttsReady, ttsVolume]);

  // Re-initialize when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App became active, reinitializing TTS');
        setTtsReady(false);
        setTimeout(() => setTtsReady(true), 500);
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
      // Speak countdown number if enabled
      speak(String(countdown), {
        onDone: () => console.log(`Spoke: ${countdown}`),
        onError: (error) => {
          console.error('TTS countdown error:', error);
        },
      });
      
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isRunning && countdown === 0) {
      // Say different messages for photo vs video
      const message = mode === 'photo' ? 'Cheese!' : 'Video recording';
      speak(message, {
        pitch: 1.2,
        rate: Platform.OS === 'ios' ? 0.6 : 1,
        onDone: () => console.log(`Spoke: ${message}`),
        onError: (error) => console.error('TTS action error:', error),
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
  }, [isRunning, countdown, mode, speak, takePicture, startVideoRecording]);

  const takePicture = useCallback(async () => {
    if (cameraRef.current && !isRecording) {
      try {
        console.log('Taking picture...');
        // Visual and audible snapshot indicators
        setFlashVisible(true);
        setTimeout(() => setFlashVisible(false), 140);
        speak('Snap!', { rate: Platform.OS === 'ios' ? 0.55 : 0.95, pitch: 1.2 });
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
          
          // Announce success if enabled
          speak('Photo captured. Looks great!', {
            rate: Platform.OS === 'ios' ? 0.5 : 0.8,
            pitch: 1.1,
            onError: (error) => console.error('TTS photo success error:', error),
          });
        } else {
          throw new Error('No photo URI returned');
        }
      } catch (error) {
        console.error('Error in takePicture:', error);
        // Only announce failure if photo capture actually failed
        speak('Failed to capture photo', {
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          onError: (error) => console.error('TTS error message:', error),
        });
      }
    }
  }, [isRecording, speak]);

  const startVideoRecording = useCallback(async () => {
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
        speak('Video captured', {
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          onError: (error) => console.error('TTS video success error:', error),
        });
        // Reset recording state after successful capture
        setIsRecording(false);
      } catch (error) {
        console.error('Error during video capture:', error);
        speak('Failed to capture video', {
          rate: Platform.OS === 'ios' ? 0.5 : 0.8,
          onError: (error) => console.error('TTS video failure error:', error),
        });
        setIsRecording(false);
      }
    }
  }, [isRecording, speak]);

  const startCountdown = () => {
    if (isRunning || isRecording) return;
    setCountdown(selectedSeconds);
    setIsRunning(true);
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
          speak('Opening gallery', {
            rate: Platform.OS === 'ios' ? 0.5 : 0.8,
            onError: (error) => console.error('TTS gallery error:', error),
          });
          // This will open the default gallery app
          Alert.alert('View Media', 'Please check your gallery app for the latest media.');
        } else {
          speak('No media found', {
            rate: Platform.OS === 'ios' ? 0.5 : 0.8,
            onError: (error) => console.error('TTS no media error:', error),
          });
        }
      }
    } else {
      speak('No recent media to view', {
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        onError: (error) => console.error('TTS no recent media error:', error),
      });
    }
  };

  const handleQuickTimer = (seconds) => {
    setSelectedSeconds(seconds);
    speak(`Timer set to ${seconds} seconds`, {
      rate: Platform.OS === 'ios' ? 0.5 : 0.8,
      onError: (error) => console.error('TTS timer error:', error),
    });
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
        <View style={[styles.topHeader, isPad && styles.topHeaderPad]}>
          <Text style={[styles.appTitle, isPad && styles.appTitlePad]}>AutoSnap</Text>
          <View style={styles.topControls}>
            <View style={[styles.volumeControl, isPad && styles.volumeControlPad]}>
              <TouchableOpacity
                onPress={() => {
                  const newVolume = ttsVolume > 0 ? 0 : 1.0;
                  setTtsVolume(newVolume);
                  if (newVolume === 0) {
                    stopSpeaking();
                  }
                  handleFirstInteraction();
                }}
                style={styles.volumeIcon}
              >
                <Ionicons 
                  name={ttsVolume > 0 ? 'volume-high-outline' : 'volume-mute-outline'} 
                  size={isPad ? 20 : 24} 
                  color={ttsVolume > 0 ? '#1e90ff' : 'rgba(255,255,255,0.6)'} 
                />
              </TouchableOpacity>
              <Slider
                style={[styles.volumeSlider, isPad && styles.volumeSliderPad]}
                minimumValue={0}
                maximumValue={1}
                value={ttsVolume}
                onValueChange={(value) => {
                  setTtsVolume(value);
                  if (value === 0) {
                    stopSpeaking();
                  }
                }}
                minimumTrackTintColor="#1e90ff"
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor="#1e90ff"
              />
            </View>
            <TouchableOpacity
              style={[styles.flipButton, isPad && styles.flipButtonPad]}
              onPress={() => {
                handleFirstInteraction();
                setFacing(facing === 'back' ? 'front' : 'back');
              }}
            >
              <Ionicons name="camera-reverse-outline" size={isPad ? 20 : 24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Silent Mode Warning for iPhone */}
        {showSilentModeWarning && Platform.OS === 'ios' && !Platform.isPad && (
          <View style={styles.silentModeWarning}>
            <Ionicons name="volume-mute" size={20} color="#ff6b6b" />
            <Text style={styles.silentModeWarningText}>
              Turn off Silent Mode (mute switch) to hear voice announcements
            </Text>
            <TouchableOpacity
              onPress={() => setShowSilentModeWarning(false)}
              style={styles.silentModeClose}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Countdown Display Overlay */}
        {isRunning && countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownDisplayLarge}>{countdown}</Text>
          </View>
        )}

        {/* Capture Flash Overlay */}
        {flashVisible && (
          <View style={styles.flashOverlay} />
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
      <View style={[styles.bottomControls, isPad && styles.bottomControlsPad]}>
        {/* Mode Selector */}
        <View style={[styles.modeContainer, isPad && styles.modeContainerPad]}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'photo' && styles.modeTabActive]}
            onPress={() => {
              handleFirstInteraction();
              setMode('photo');
            }}
          >
            <Ionicons 
              name="camera" 
              size={isPad ? 20 : 24} 
              color={mode === 'photo' ? '#1e90ff' : 'rgba(255,255,255,0.6)'} 
            />
            <Text style={[styles.modeTabText, mode === 'photo' && styles.modeTabTextActive, isPad && styles.modeTabTextPad]}>
              Photo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeTab, mode === 'video' && styles.modeTabActive]}
            onPress={() => {
              handleFirstInteraction();
              setMode('video');
            }}
          >
            <Ionicons 
              name="videocam" 
              size={isPad ? 20 : 24} 
              color={mode === 'video' ? '#1e90ff' : 'rgba(255,255,255,0.6)'} 
            />
            <Text style={[styles.modeTabText, mode === 'video' && styles.modeTabTextActive, isPad && styles.modeTabTextPad]}>
              Video
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timer Options - Available for both photo and video modes */}
        <View style={[styles.timerOptions, isPad && styles.timerOptionsPad]}>
          <Text style={[styles.timerLabel, isPad && styles.timerLabelPad]}>Timer:</Text>
          {[3, 5, 10, 20].map((sec) => (
            <TouchableOpacity
              key={sec}
              style={[
                styles.timerButton,
                selectedSeconds === sec && styles.timerButtonSelected,
                isPad && styles.timerButtonPad,
              ]}
              onPress={() => {
                handleFirstInteraction();
                setSelectedSeconds(sec);
              }}
              onLongPress={() => {
                handleFirstInteraction();
                handleQuickTimer(sec);
              }}
              disabled={isRunning || isRecording}
            >
              <Text style={[
                styles.timerText,
                selectedSeconds === sec && styles.timerTextSelected,
                isPad && styles.timerTextPad
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
              style={[styles.captureButton, isRunning && styles.disabled, isPad && styles.captureButtonPad]}
              onPress={() => {
                handleFirstInteraction();
                startCountdown();
              }}
              disabled={isRunning}
            >
              <View style={styles.captureButtonInner}>
                {isRunning && <Text style={styles.captureCountdown}>{countdown}</Text>}
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.captureButton, styles.videoButton, isRunning && styles.disabled, isPad && styles.captureButtonPad]}
              onPress={() => {
                handleFirstInteraction();
                isRecording ? stopVideoRecording() : startCountdown();
              }}
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
  ttsToggle: {
    padding: 12,
    backgroundColor: 'rgba(30,144,255,0.08)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(30,144,255,0.3)',
    marginRight: 8,
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
  modeTabPad: {
    paddingVertical: 8,
    paddingHorizontal: 15,
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
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    opacity: 0.8,
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
  // Volume control styles
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,144,255,0.08)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(30,144,255,0.3)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  volumeIcon: {
    marginRight: 8,
  },
  volumeSlider: {
    width: 100,
    height: 40,
  },
  // Silent mode warning
  silentModeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.9)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
  },
  silentModeWarningText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 10,
  },
  silentModeClose: {
    padding: 5,
  },
  // iPad specific styles - more compact
  topHeaderPad: {
    paddingTop: 35,
    paddingHorizontal: 12,
    paddingBottom: 5,
  },
  appTitlePad: {
    fontSize: 18,
  },
  volumeControlPad: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  volumeSliderPad: {
    width: 70,
    height: 30,
  },
  flipButtonPad: {
    padding: 8,
  },
  bottomControlsPad: {
    paddingBottom: 15,
    paddingTop: 10,
  },
  modeContainerPad: {
    padding: 3,
    marginBottom: 8,
    marginHorizontal: 120,
  },
  modeTabTextPad: {
    fontSize: 11,
  },
  timerOptionsPad: {
    marginBottom: 10,
    paddingVertical: 6,
    marginHorizontal: 80,
  },
  timerLabelPad: {
    fontSize: 12,
  },
  timerButtonPad: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  timerTextPad: {
    fontSize: 11,
  },
  captureButtonPad: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 2,
  },
});
