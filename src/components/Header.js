import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { styles } from '../styles';

const isPad = Platform.OS === 'ios' && Platform.isPad;

const Header = ({ ttsVolume, setTtsVolume, stopSpeaking, handleFirstInteraction, facing, setFacing }) => {
  return (
    <View style={[styles.topHeader, isPad && styles.topHeaderPad]}>
      <Text style={[styles.appTitle, isPad && styles.appTitlePad]}>AutoSnap</Text>
      <View style={styles.topControls}>
        <View style={[styles.volumeControl, isPad && styles.volumeControlPad]}>
          <TouchableOpacity
            onPress={() => {
              const newVolume = ttsVolume > 0 ? 0 : 1.0;
              setTtsVolume(newVolume);
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
  );
};

export default Header;
