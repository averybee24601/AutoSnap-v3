import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const isPad = Platform.OS === 'ios' && Platform.isPad;

const Timer = ({ selectedSeconds, setSelectedSeconds, handleFirstInteraction, handleQuickTimer, isRunning, isRecording }) => {
  return (
    <View style={[styles.timerOptions, isPad && styles.timerOptionsPad]}>
      <Text style={[styles.timerLabel, isPad && styles.timerLabelPad]}>Timer:</Text>
      {[5, 10, 20, 30, 45, 60].map((sec) => (
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
          disabled={isRecording}
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
  );
};

export default Timer;
