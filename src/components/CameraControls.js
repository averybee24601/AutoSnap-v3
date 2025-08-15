import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const isPad = Platform.OS === 'ios' && Platform.isPad;

const CameraControls = ({
  mode,
  setMode,
  handleFirstInteraction,
  isRecording,
  isRunning,
  startCountdown,
  stopVideoRecording,
  countdown,
  skipWelcome,
  setSkipWelcome,
  controlsDisabled,
}) => {
  return (
    <View style={[styles.bottomControls, isPad && styles.bottomControlsPad]}>
      {/* Skip welcome - full row is pressable for accessibility */}
      <TouchableOpacity
        style={styles.skipWelcomeRow}
        onPress={() => {
          handleFirstInteraction();
          setSkipWelcome(!skipWelcome);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: skipWelcome }}
        accessibilityLabel="Skip welcome message"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 16 }}
      >
        <View style={[styles.checkboxBase, skipWelcome && styles.checkboxChecked]}>
          {skipWelcome && (
            <Ionicons name="checkmark" size={18} color="#0b5ed7" />
          )}
        </View>
        <Text style={styles.skipWelcomeText}>Skip welcome message</Text>
      </TouchableOpacity>
      {/* Mode Selector */}
      <View style={[styles.modeContainer, isPad && styles.modeContainerPad]}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'photo' && styles.modeTabActive, controlsDisabled && styles.disabled]}
          onPress={() => {
            handleFirstInteraction();
            setMode('photo');
          }}
          disabled={controlsDisabled}
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
          style={[styles.modeTab, mode === 'video' && styles.modeTabActive, controlsDisabled && styles.disabled]}
          onPress={() => {
            handleFirstInteraction();
            setMode('video');
          }}
          disabled={controlsDisabled}
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

      {/* Main Action Button - Center Only */}
      <View style={styles.actionButtons}>
        {/* Capture/Record Button */}
        {mode === 'photo' ? (
          <TouchableOpacity
            style={[styles.captureButton, (isRunning || controlsDisabled) && styles.disabled, isPad && styles.captureButtonPad]}
            onPress={() => {
              handleFirstInteraction();
              startCountdown();
            }}
            disabled={isRunning || controlsDisabled}
          >
            <View style={styles.captureButtonInner}>
              {isRunning && <Text style={styles.captureCountdown}>{countdown}</Text>}
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.captureButton, styles.videoButton, (isRunning || controlsDisabled) && styles.disabled, isPad && styles.captureButtonPad]}
            onPress={() => {
              handleFirstInteraction();
              isRecording ? stopVideoRecording() : startCountdown();
            }}
            disabled={isRunning || controlsDisabled}
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
  );
};

export default CameraControls;
