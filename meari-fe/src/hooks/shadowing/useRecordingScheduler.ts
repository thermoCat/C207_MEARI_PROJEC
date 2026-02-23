import { useState, useRef, useEffect, useCallback } from "react";
import type { RoleSegment, Sentence } from "../useRoomWebSocket";
import type { SubtitleItem } from "./types";
import { useAudioRecorder } from "../useAudioRecorder";
import { getPresignedUrl, uploadRecordingToS3 } from "../../api/rooms.api";
import type { Publisher } from "openvidu-browser";

interface UseRecordingSchedulerParams {
  videoReady: boolean;
  isPlaying: boolean;
  currentRound: number;
  isRoundInProgress: boolean;
  roleSegments: RoleSegment[];
  mySelectedRoleId: number | undefined;
  roomId: string | undefined;
  memberId: number;
  publisher: Publisher | null;
  isAudioEnabled: boolean;
  currentSubtitles: SubtitleItem[];
  sendRecordingComplete: (sentenceId: number, s3Key: string) => void;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export function useRecordingScheduler({
  videoReady,
  isPlaying,
  currentRound,
  isRoundInProgress,
  roleSegments,
  mySelectedRoleId,
  roomId,
  memberId,
  publisher,
  isAudioEnabled,
  currentSubtitles,
  sendRecordingComplete,
  showToast,
}: UseRecordingSchedulerParams) {
  const [isMyTurnRecording, setIsMyTurnRecording] = useState(false);
  const currentRecordingSentenceIdRef = useRef<number | null>(null);
  const presignedUrlsRef = useRef<Map<number, string>>(new Map());
  const s3KeysRef = useRef<Map<number, string>>(new Map());
  const hasShownNextTurnToastRef = useRef<Set<number>>(new Set());

  const handleRecordingComplete = useCallback(async (audioBlob: Blob, sentenceId: number) => {
    try {
      console.log(`Uploading recording for sentence ${sentenceId}, size: ${audioBlob.size} bytes`);
      const presignedUrl = presignedUrlsRef.current.get(sentenceId);
      const s3Key = s3KeysRef.current.get(sentenceId);
      if (!presignedUrl || !s3Key) {
        console.error(`No presigned URL/s3_key found for sentence ${sentenceId}`);
        return;
      }
      await uploadRecordingToS3(presignedUrl, audioBlob);
      console.log(`Successfully uploaded recording for sentence ${sentenceId}`);
      sendRecordingComplete(sentenceId, s3Key);
      presignedUrlsRef.current.delete(sentenceId);
      s3KeysRef.current.delete(sentenceId);
    } catch (error) {
      console.error('Failed to upload recording:', error);
    }
  }, [sendRecordingComplete]);

  const { startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: (audioBlob) => {
      const sentenceId = currentRecordingSentenceIdRef.current;
      if (sentenceId !== null) {
        handleRecordingComplete(audioBlob, sentenceId);
        currentRecordingSentenceIdRef.current = null;
      } else {
        console.warn('[ShadowingRoom] sentenceId is null, cannot upload');
      }
    },
    onError: (error) => {
      console.error('Recording error:', error);
      showToast('녹음에 실패했습니다');
    },
  });

  const startRecordingRef = useRef(startRecording);
  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    startRecordingRef.current = startRecording;
    stopRecordingRef.current = stopRecording;
  });

  // 다음 차례 알림
  useEffect(() => {
    if (!isRoundInProgress) return;
    const myNextSubtitle = currentSubtitles.find(
      subtitle => subtitle.timing === 'next' && subtitle.isMyRole
    );
    if (myNextSubtitle) {
      const uniqueKey = `${myNextSubtitle.roleId}-${myNextSubtitle.text}`;
      const uniqueId = uniqueKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      if (!hasShownNextTurnToastRef.current.has(uniqueId)) {
        showToast('다음 차례입니다!', 'info');
        hasShownNextTurnToastRef.current.add(uniqueId);
      }
    }
  }, [currentSubtitles, isRoundInProgress, showToast]);

  // 라운드 변경 시 토스트 이력 초기화
  useEffect(() => {
    hasShownNextTurnToastRef.current.clear();
  }, [currentRound]);

  // 현재 내 차례인지 감지
  useEffect(() => {
    if (!isRoundInProgress) {
      setIsMyTurnRecording(false);
      return;
    }
    const myCurrentSubtitle = currentSubtitles.find(
      subtitle => subtitle.timing === 'current' && subtitle.isMyRole
    );
    setIsMyTurnRecording(!!myCurrentSubtitle);
  }, [currentSubtitles, isRoundInProgress]);

  // 녹음 스케줄링 + 마이크 자동 음소거
  useEffect(() => {
    const video = document.querySelector('video');
    if (!videoReady || !video || !isPlaying || currentRound < 1 || roleSegments.length === 0 || !mySelectedRoleId) {
      return;
    }

    console.log('Setting up recording schedule and mic control for Round', currentRound);
    const timeouts: number[] = [];

    const mySegment = roleSegments.find(seg => seg.role_id === mySelectedRoleId);
    if (!mySegment) {
      console.log('No segment found for my role');
      return;
    }

    if (publisher && isAudioEnabled) {
      publisher.publishAudio(false);
      console.log('Mic muted at round start (not my turn)');
    }

    mySegment.sentences.forEach((sentence: Sentence) => {
      const startTime = (sentence.start_time - 0.5) * 1000;
      const endTime = (sentence.end_time + 0.5) * 1000;

      const startTimeout = setTimeout(async () => {
        try {
          if (publisher && isAudioEnabled) {
            publisher.publishAudio(true);
          }
          const response = await getPresignedUrl({
            room_id: Number(roomId),
            round: currentRound,
            member_id: memberId,
            sentence_id: sentence.sentence_id,
          });
          if (response.data.success && response.data.data) {
            const { upload_url, s3_key } = response.data.data;
            presignedUrlsRef.current.set(sentence.sentence_id, upload_url);
            s3KeysRef.current.set(sentence.sentence_id, s3_key);
            currentRecordingSentenceIdRef.current = sentence.sentence_id;
            startRecordingRef.current();
          }
        } catch (error) {
          console.error('Failed to get presigned URL:', error);
        }
      }, startTime);

      const endTimeout = setTimeout(() => {
        stopRecordingRef.current();
        if (publisher) publisher.publishAudio(false);
      }, endTime);

      timeouts.push(startTimeout as unknown as number, endTimeout as unknown as number);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      stopRecordingRef.current();
      if (publisher && isAudioEnabled) {
        publisher.publishAudio(true);
      }
    };
  }, [videoReady, isPlaying, currentRound, roleSegments, mySelectedRoleId, roomId, memberId, publisher, isAudioEnabled]);

  const resetRecordingState = useCallback(() => {
    currentRecordingSentenceIdRef.current = null;
    presignedUrlsRef.current.clear();
    s3KeysRef.current.clear();
    hasShownNextTurnToastRef.current.clear();
    setIsMyTurnRecording(false);
  }, []);

  return {
    isMyTurnRecording,
    resetRecordingState,
  };
}
