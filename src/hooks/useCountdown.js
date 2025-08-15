import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export const useCountdown = (speak, takePicture, startVideoRecording, mode) => {
  const [selectedSeconds, setSelectedSeconds] = useState(3);
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

  const startCountdown = () => {
    if (isRunning) return;
    setCountdown(selectedSeconds);
    setIsRunning(true);
  };

  const handleQuickTimer = (seconds) => {
    setSelectedSeconds(seconds);
    speak(`Timer set to ${seconds} seconds`);
    setTimeout(() => startCountdown(), 500);
  };

  return {
    selectedSeconds,
    setSelectedSeconds,
    countdown,
    isRunning,
    startCountdown,
    handleQuickTimer,
  };
};
