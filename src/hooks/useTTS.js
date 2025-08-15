import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

export const useTTS = () => {
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [ttsReady, setTtsReady] = useState(false);
  const [showSilentModeWarning, setShowSilentModeWarning] = useState(false);
  const hasSpokenWelcome = useRef(false);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const isWelcomeSpeakingRef = useRef(false);
  const welcomeSequenceIdRef = useRef(0);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const ttsVolumeRef = useRef(ttsVolume);

  useEffect(() => {
    ttsVolumeRef.current = ttsVolume;
  }, [ttsVolume]);

  const playWelcomeSequence = useCallback((autoplay = false) => {
    try {
      const chunks = [
        'Welcome to AutoSnap.',
        'Set a timer using the buttons at the bottom, then press the capture button to start the countdown.',
        'I will count down and announce when your photo or video is captured.'
      ];
      isWelcomeSpeakingRef.current = true;
      let index = 0;
      const sequenceId = ++welcomeSequenceIdRef.current;

      const speakNext = () => {
        // Abort if a newer sequence has started or skip was toggled
        if (welcomeSequenceIdRef.current !== sequenceId) {
          isWelcomeSpeakingRef.current = false;
          return;
        }
        if (index >= chunks.length) {
          isWelcomeSpeakingRef.current = false;
          return;
        }
        const text = chunks[index];
        try {
          Speech.stop();
          Speech.speak(text, {
            language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
            pitch: 1,
            rate: Platform.OS === 'ios' ? 0.5 : 0.8,
            volume: ttsVolumeRef.current ?? 1.0,
            onStart: () => {
              if (index === 0) {
                hasSpokenWelcome.current = true;
                setNeedsInteraction(false);
              }
            },
            onDone: () => {
              // Abort if sequence invalidated
              if (welcomeSequenceIdRef.current !== sequenceId) {
                isWelcomeSpeakingRef.current = false;
                return;
              }
              index += 1;
              speakNext();
            },
            onStopped: () => {
              // Interrupted (e.g., countdown). Do not continue.
              isWelcomeSpeakingRef.current = false;
            },
            onError: () => {
              isWelcomeSpeakingRef.current = false;
              if (autoplay && index === 0) {
                hasSpokenWelcome.current = false;
                setNeedsInteraction(true);
              }
            },
          });
        } catch {
          isWelcomeSpeakingRef.current = false;
          if (autoplay && index === 0) {
            setNeedsInteraction(true);
          }
        }
      };

      speakNext();
    } catch (e) {
      if (autoplay) {
        setNeedsInteraction(true);
      }
    }
  }, [setNeedsInteraction]);

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
    } catch {}
  };

  const speakDirect = (text, options = {}) => {
    console.log(`speakDirect called with: "${text}"`);
    try {
      // Do not preemptively stop; allow natural completion to avoid cutting countdown/welcome
      Speech.speak(text, {
        language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
        pitch: 1,
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        volume: ttsVolumeRef.current ?? 1.0,
        ...options,
      });
      console.log('Speech.speak called successfully');
    } catch (error) {
      console.error('Error in speakDirect:', error);
    }
  };

  const speak = useCallback((text, options = {}) => {
    console.log(`speak called, volume: ${ttsVolumeRef.current}, text: "${text}"`);
    if ((ttsVolumeRef.current ?? 0) === 0) {
      console.log('TTS volume is 0, not speaking');
      return;
    }
    try {
      // Avoid cutting current speech (e.g., welcome or countdown). Let Expo TTS queue it.
      Speech.speak(text, {
        language: Platform.OS === 'ios' ? 'en-US' : 'en_US',
        pitch: 1,
        rate: Platform.OS === 'ios' ? 0.5 : 0.8,
        volume: ttsVolumeRef.current ?? 1.0,
        ...options,
      });
    } catch (error) {
      console.error('Error in speak:', error);
    }
  }, []);

  useEffect(() => {
    const initializeTTSSystem = async () => {
      console.log('Starting TTS system initialization...');
      try {
        // Load persisted prefs
        try {
          const persistedSkip = await AsyncStorage.getItem('autosnap_skip_welcome');
          if (persistedSkip != null) {
            setSkipWelcome(persistedSkip === 'true');
          }
        } catch {}

        // No explicit permission requests needed for TTS
        
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


  // Attempt autoplay of welcome when ready, respecting skip and platform limitations
  useEffect(() => {
    if (!ttsReady) return;
    if (hasSpokenWelcome.current) return;
    if (skipWelcome) {
      hasSpokenWelcome.current = true;
      return;
    }

    // Try to autoplay; if platform blocks, show prompt handled in onError
    playWelcomeSequence(true);
  }, [ttsReady, skipWelcome, playWelcomeSequence]);

  // Persist skipWelcome preference
  useEffect(() => {
    AsyncStorage.setItem('autosnap_skip_welcome', String(skipWelcome)).catch(() => {});
  }, [skipWelcome]);

  const handleFirstInteraction = useCallback(async () => {
    // Ensure this logic runs only once
    if (hasSpokenWelcome.current) {
      setNeedsInteraction(false);
      return;
    }

    // Respect skip setting: mark as spoken and bail out
    if (skipWelcome) {
      hasSpokenWelcome.current = true;
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
        // Do not call stop() right after to avoid cutting queued speech
        await Speech.speak('', { volume: 0.01, rate: 10 });
        await new Promise(resolve => setTimeout(resolve, 100));
        await Speech.speak(' ', { volume: 0.1, rate: 1, language: 'en-US' });
        console.log('TTS Primed for mobile iOS.');
      } catch (error) {
        console.error('Error during mobile iOS audio re-configuration or priming:', error);
        // If re-configuration fails, we might still try to speak, but it's less likely to work.
        // The error handling in speakDirect will catch the TTS failure.
      }
    }

    // Now, proceed with the welcome message if TTS is ready and volume is up
    if (ttsReady && ttsVolume > 0 && !skipWelcome) {
      playWelcomeSequence(false);
    } else {
      setNeedsInteraction(false);
    }
  }, [ttsReady, ttsVolume, skipWelcome]); // Removed hasSpokenWelcome.current from deps as it's a ref

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

  // If user toggles skip at any time, stop any ongoing TTS immediately and mark welcome as handled
  useEffect(() => {
    if (skipWelcome) {
      // Invalidate any in-flight welcome sequence so recursion cannot continue
      welcomeSequenceIdRef.current += 1;
      stopSpeaking();
      isWelcomeSpeakingRef.current = false;
      hasSpokenWelcome.current = true;
      setNeedsInteraction(false);
    }
  }, [skipWelcome]);

  return {
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
    setNeedsInteraction,
  };
};
