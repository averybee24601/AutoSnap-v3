import { useState, useCallback } from 'react';
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

        // Save to library if permission granted; otherwise keep local URI
        let savedUri = photo.uri;
        try {
          const perm = await MediaLibrary.getPermissionsAsync();
          const granted = perm?.granted || (await MediaLibrary.requestPermissionsAsync())?.granted;
          if (granted) {
            const savedAsset = await MediaLibrary.saveToLibraryAsync(photo.uri);
            savedUri = savedAsset?.uri || savedAsset?.localUri || savedUri;
          } else {
            // No permission; keep local URI and inform user
            speak('Photo saved locally. Grant gallery permission to save to your library.');
          }
        } catch (saveError) {
          console.warn('Could not save photo to library:', saveError);
        }

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
        let savedUri = video?.uri;
        try {
          const perm = await MediaLibrary.getPermissionsAsync();
          const granted = perm?.granted || (await MediaLibrary.requestPermissionsAsync())?.granted;
          if (granted && video?.uri) {
            const savedAsset = await MediaLibrary.saveToLibraryAsync(video.uri);
            savedUri = savedAsset?.uri || savedAsset?.localUri || savedUri;
          } else {
            speak('Video saved locally. Grant gallery permission to save to your library.');
          }
        } catch (saveError) {
          console.warn('Could not save video to library:', saveError);
        }

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
