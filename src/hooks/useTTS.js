import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';

export const useTTS = () => {
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [ttsReady, setTtsReady] = useState(false);
  const [showSilentModeWarning, setShowSilentModeWarning] = useState(false);
  const hasSpokenWelcome = useRef(false);

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
    } catch {}
  };

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

  useEffect(() => {
    const initializeTTSSystem = async () => {
      console.log('Starting TTS system initialization...');
      try {
        await MediaLibrary.requestPermissionsAsync();
        await Audio.requestPermissionsAsync();
        
        if (Platform.OS === 'ios') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            interruptionModeIOS: InterruptionModeIOS?.DoNotMix || 3,
            shouldDuckAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid?.DoNotMix || 3,
            playThroughEarpieceAndroid: false,
          });
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
        
        await Speech.stop();
        const voices = await Speech.getAvailableVoicesAsync();
        
        if (Platform.OS === 'ios' && voices.length > 0) {
          await Speech.speak('', { volume: 0.01, rate: 10 });
          await new Promise(resolve => setTimeout(resolve, 100));
          await Speech.speak(' ', { volume: 0.1, rate: 1, language: 'en-US' });
          await Speech.stop();
        }
        
        setTtsReady(true);
      } catch (error) {
        console.error('Error initializing TTS system:', error);
      }
    };
    initializeTTSSystem();
  }, []);


  const handleFirstInteraction = useCallback(async () => {
    // Ensure this logic runs only once
    if (hasSpokenWelcome.current) {
      return;
    }

    // On mobile iOS, re-configure audio mode on first interaction to ensure it's unlocked by a user gesture.
    if (Platform.OS === 'ios' && !Platform.isPad) {
      try {
        console.log('Re-configuring audio mode on first interaction for mobile iOS...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false, // We are not recording, just speaking
          playsInSilentModeIOS: true, // Crucial for playing over silent mode
          staysActiveInBackground: false, // No need for background for TTS
          interruptionModeIOS: InterruptionModeIOS.DoNotMix, // Do not mix, be the primary audio source
          shouldDuckAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio mode re-configured successfully for mobile iOS.');

        // Perform a priming speak call, which is often needed after setting audio mode
        await Speech.speak('', { volume: 0.01, rate: 10 });
        await new Promise(resolve => setTimeout(resolve, 100));
        await Speech.speak(' ', { volume: 0.1, rate: 1, language: 'en-US' });
        await Speech.stop();
        console.log('TTS Primed for mobile iOS.');
      } catch (error) {
        console.error('Error during mobile iOS audio re-configuration or priming:', error);
        // If re-configuration fails, we might still try to speak, but it's less likely to work.
        // The error handling in speakDirect will catch the TTS failure.
      }
    }

    // Now, proceed with the welcome message if TTS is ready and volume is up
    if (ttsReady && ttsVolume > 0) {
      hasSpokenWelcome.current = true;
      const welcomeMessage = 'Welcome to AutoSnap. Set a timer using the buttons at the bottom, then press the capture button to start the countdown. I will count down and announce when your photo or video is captured.';
      speakDirect(welcomeMessage, {
        onError: (error) => {
          console.error('TTS welcome error after first interaction:', error);
          hasSpokenWelcome.current = false; // Allow retry if it fails
          if (Platform.OS === 'ios' && error.message?.includes('AVAudioSession')) {
            setShowSilentModeWarning(true);
          }
        },
      });
    }
  }, [ttsReady, ttsVolume]); // Removed hasSpokenWelcome.current from deps as it's a ref

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setTtsReady(false);
        setTimeout(() => setTtsReady(true), 500);
      }
    });
    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    ttsVolume,
    setTtsVolume,
    ttsReady,
    showSilentModeWarning,
    setShowSilentModeWarning,
    speak,
    stopSpeaking,
    handleFirstInteraction,
  };
};
