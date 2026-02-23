import { useState, useRef, useEffect, useCallback } from "react";

interface MediaSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

export function useMediaControls(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [volume, setVolume] = useState(100);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>();
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>();
  const [selectedNationality, setSelectedNationality] = useState<"KR" | "VN">("KR");
  const [isSubtitleEnabled, setIsSubtitleEnabled] = useState(true);
  const mediaSettingsRef = useRef<MediaSettings | null>(null);

  const toggleSubtitle = useCallback(() => {
    setIsSubtitleEnabled(prev => !prev);
  }, []);

  const handleAudioDeviceChange = useCallback((deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    console.log('Audio device changed to:', deviceId);
  }, []);

  const handleVideoDeviceChange = useCallback((deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    console.log('Video device changed to:', deviceId);
  }, []);

  const handleMediaCheckComplete = useCallback((
    audioEnabled: boolean,
    videoEnabled: boolean,
    audioDeviceId?: string,
    videoDeviceId?: string
  ) => {
    mediaSettingsRef.current = { audioEnabled, videoEnabled, audioDeviceId, videoDeviceId };
    setSelectedAudioDevice(audioDeviceId);
    setSelectedVideoDevice(videoDeviceId);
  }, []);

  // 쉐도잉 영상 볼륨 적용
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume, videoRef]);

  return {
    volume,
    setVolume,
    selectedAudioDevice,
    selectedVideoDevice,
    selectedNationality,
    setSelectedNationality,
    isSubtitleEnabled,
    toggleSubtitle,
    mediaSettingsRef,
    handleAudioDeviceChange,
    handleVideoDeviceChange,
    handleMediaCheckComplete,
  };
}
