import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

import Header from './components/Header';
import Timer from './components/Timer';
import CameraControls from './components/CameraControls';
import { styles } from './styles';

import { useTTS } from './hooks/useTTS';
import { useCamera } from './hooks/useCamera';
import { useCountdown } from './hooks/useCountdown';

const isPad = Platform.OS === 'ios' && Platform.isPad;

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const {
    ttsVolume,
    setTtsVolume,
    ttsReady,
    showSilentModeWarning,
    setShowSilentModeWarning,
    speak,
    stopSpeaking,
    handleFirstInteraction,
    skipWelcome,
    setSkipWelcome,
    needsInteraction,
  } = useTTS();

  const {
    facing,
    setFacing,
    mode,
    setMode,
    isRecording,
    lastMediaUri,
    flashVisible,
    takePicture,
    startVideoRecording,
    stopVideoRecording,
  } = useCamera(cameraRef, speak);

  const {
    selectedSeconds,
    setSelectedSeconds,
    countdown,
    isRunning,
    startCountdown,
    handleQuickTimer,
  } = useCountdown(speak, stopSpeaking, takePicture, startVideoRecording, mode);


  const viewLastMedia = async () => {
    try {
      if (lastMediaUri) {
        await Linking.openURL(lastMediaUri);
        return;
      }

      const perm = await MediaLibrary.getPermissionsAsync();
      const granted = perm?.granted || (await MediaLibrary.requestPermissionsAsync())?.granted;
      if (!granted) {
        speak('Grant gallery permission to view your media.');
        return;
      }

      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 1,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      if (assets.length > 0) {
        speak('Opening gallery');
        Alert.alert('View Media', 'Please check your gallery app for the latest media.');
      } else {
        speak('No media found');
      }
    } catch (error) {
      speak('Unable to open media.');
    }
  };

  return (
    <View style={styles.container}>
      {(permission && permission.granted) ? (
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
          mode={mode}
        >
          <Header
            ttsVolume={ttsVolume}
            setTtsVolume={setTtsVolume}
            stopSpeaking={stopSpeaking}
            handleFirstInteraction={handleFirstInteraction}
            facing={facing}
            setFacing={setFacing}
          />

          {showSilentModeWarning && Platform.OS === 'ios' && !isPad && (
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

          {needsInteraction && (
            <View pointerEvents="none" style={styles.interactionPrompt}>
              <Text style={styles.interactionPromptText}>Press any button to start</Text>
            </View>
          )}

          {isRunning && countdown !== null && (
            <View pointerEvents="none" style={styles.countdownOverlay}>
              <Text style={styles.countdownDisplayLarge}>{countdown}</Text>
            </View>
          )}

          {flashVisible && (
            <View pointerEvents="none" style={styles.flashOverlay} />
          )}

          {isRecording && (
            <View pointerEvents="none" style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording...</Text>
            </View>
          )}
        </CameraView>
      ) : (
        <View style={styles.camera}>
          <Header
            ttsVolume={ttsVolume}
            setTtsVolume={setTtsVolume}
            stopSpeaking={stopSpeaking}
            handleFirstInteraction={handleFirstInteraction}
            facing={facing}
            setFacing={setFacing}
          />

          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraPlaceholderTitle}>Welcome to AutoSnap</Text>
            <Text style={styles.cameraPlaceholderSubtitle}>Grant camera permission to continue</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <Timer
        selectedSeconds={selectedSeconds}
        setSelectedSeconds={setSelectedSeconds}
        handleFirstInteraction={handleFirstInteraction}
        handleQuickTimer={handleQuickTimer}
        isRunning={isRunning}
        isRecording={isRecording}
      />

      <CameraControls
        mode={mode}
        setMode={setMode}
        handleFirstInteraction={handleFirstInteraction}
        isRecording={isRecording}
        isRunning={isRunning}
        startCountdown={startCountdown}
        stopVideoRecording={stopVideoRecording}
        countdown={countdown}
        skipWelcome={skipWelcome}
        setSkipWelcome={setSkipWelcome}
        controlsDisabled={!permission || !permission.granted}
      />
    </View>
  );
}
