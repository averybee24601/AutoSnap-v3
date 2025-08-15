import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

export const useCountdown = (speak, stopSpeaking, takePicture, startVideoRecording, mode) => {
  const [selectedSecondsState, setSelectedSecondsState] = useState(5);
  const [countdown, setCountdown] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer = null;
    if (isRunning && countdown > 0) {
      // Queue countdown numbers without interrupting previous speech
      speak(String(countdown));
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isRunning && countdown === 0) {
      const message = mode === 'photo' ? 'Cheese!' : 'Video recording';
      speak(message, {
        pitch: 1.2,
        rate: Platform.OS === 'ios' ? 0.6 : 1,
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

  const startCountdown = useCallback(() => {
    // Interrupt any ongoing TTS (welcome, instructions, or other)
    try { stopSpeaking && stopSpeaking(); } catch {}
    setCountdown(selectedSecondsState);
    setIsRunning(true);
  }, [selectedSecondsState, stopSpeaking]);

  const handleQuickTimer = useCallback((seconds) => {
    try { stopSpeaking && stopSpeaking(); } catch {}
    setSelectedSecondsState(seconds);
    speak(`Timer set to ${seconds} seconds`);
    // Interrupt current countdown and restart immediately with new seconds
    setCountdown(seconds);
    setIsRunning(true);
  }, [speak, stopSpeaking]);

  // Expose a setter that can interrupt a running countdown and TTS when changed mid-run
  const setSelectedSeconds = useCallback((seconds) => {
    setSelectedSecondsState(seconds);
    if (isRunning) {
      try { stopSpeaking && stopSpeaking(); } catch {}
      setCountdown(seconds);
      setIsRunning(true);
    }
  }, [isRunning, stopSpeaking]);

  return {
    selectedSeconds: selectedSecondsState,
    setSelectedSeconds,
    countdown,
    isRunning,
    startCountdown,
    handleQuickTimer,
  };
};
