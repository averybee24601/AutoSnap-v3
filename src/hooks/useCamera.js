import { useState, useRef, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

export const useCamera = (cameraRef, speak) => {
  const [facing, setFacing] = useState('back');
  const [mode, setMode] = useState('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [lastMediaUri, setLastMediaUri] = useState(null);
  const [flashVisible, setFlashVisible] = useState(false);

  const takePicture = useCallback(async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setFlashVisible(true);
        setTimeout(() => setFlashVisible(false), 140);
        speak('Snap!', { rate: Platform.OS === 'ios' ? 0.55 : 0.95, pitch: 1.2 });
        const photo = await cameraRef.current.takePictureAsync();

        if (!photo || !photo.uri) {
          throw new Error('No photo URI returned');
        }

        // Always consider the capture itself a success; saving may fail separately
        let savedAsset = null;
        try {
          savedAsset = await MediaLibrary.saveToLibraryAsync(photo.uri);
        } catch (saveError) {
          console.warn('Failed to save photo to library:', saveError);
        }

        const fallbackUri = photo.uri;
        const savedUri = savedAsset?.uri || savedAsset?.localUri || fallbackUri;
        setLastMediaUri(savedUri);
        speak('Photo captured. Looks great!', { pitch: 1.1 });
      } catch (error) {
        console.error('Error in takePicture:', error);
        speak('Failed to capture photo');
      }
    }
  }, [cameraRef, isRecording, speak]);

  const startVideoRecording = useCallback(async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync();

        // If recording returns, consider capture a success, even if saving fails
        let savedAsset = null;
        try {
          savedAsset = await MediaLibrary.saveToLibraryAsync(video.uri);
        } catch (saveError) {
          console.warn('Failed to save video to library:', saveError);
        }

        const fallbackUri = video?.uri;
        const savedUri = savedAsset?.uri || savedAsset?.localUri || fallbackUri;
        if (savedUri) {
          setLastMediaUri(savedUri);
        }
        speak('Video captured');
        setIsRecording(false);
      } catch (error) {
        console.error('Error during video capture:', error);
        speak('Failed to capture video');
        setIsRecording(false);
      }
    }
  }, [cameraRef, isRecording, speak]);

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

  return {
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
  };
};
