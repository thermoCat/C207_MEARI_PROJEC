import { useState, useRef, useEffect, useCallback } from "react";
import type { SubtitleItem, TimeIndexedSubtitle } from "./types";
import { generateUserColor } from "./types";
import type { RoleSegment, Sentence } from "../useRoomWebSocket";
import type { RoomDetailData } from "../../api/rooms.api";

interface UseVideoPlaybackParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  selectedNationality: "KR" | "VN";
  mySelectedRoleId: number | undefined;
  currentRound: number;
  selectedRoles: Record<number, number>;
  roomData: RoomDetailData | null;
  isRoundInProgress: boolean;
  getNicknameByRoleId: (roleId: number) => { nickname: string; memberId: number } | null;
}

export function useVideoPlayback({
  videoRef,
  selectedNationality,
  mySelectedRoleId,
  currentRound,
  selectedRoles,
  roomData,
  isRoundInProgress,
  getNicknameByRoleId,
}: UseVideoPlaybackParams) {
  const needPlayOnCanPlayRef = useRef(false);
  const timeIndexedSubtitlesRef = useRef<TimeIndexedSubtitle[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [currentSubtitles, setCurrentSubtitles] = useState<SubtitleItem[]>([]);
  const [roleSegments, setRoleSegments] = useState<RoleSegment[]>([]);
  const [timeUntilStart, setTimeUntilStart] = useState<number | null>(null);

  // 카운트다운 처리
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [countdown]);

  // Round 시작 카운트다운 처리 및 영상 재생
  useEffect(() => {
    if (timeUntilStart !== null && timeUntilStart > 0) {
      const timer = setTimeout(() => setTimeUntilStart(timeUntilStart - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeUntilStart === 0) {
      setTimeUntilStart(null);
      setIsPlaying(true);
      setTimeout(() => {
        if (videoRef.current) {
          console.log('Starting video playback for Round', currentRound);
          videoRef.current.currentTime = 0;
          videoRef.current.play().then(() => {
            console.log('Video playing successfully');
          }).catch((error) => {
            console.error('Failed to play video:', error);
          });
        }
      }, 50);
    }
  }, [timeUntilStart, currentRound]);

  // 영상 시간에 따른 자막 업데이트
  useEffect(() => {
    const video = videoRef.current;
    if (!video || timeIndexedSubtitlesRef.current.length === 0) return;

    const updateSubtitle = () => {
      const currentTime = video.currentTime;
      const subtitles: SubtitleItem[] = [];
      const activeIndices: number[] = [];

      timeIndexedSubtitlesRef.current.forEach((sub, index) => {
        if (currentTime >= sub.start_time && currentTime <= sub.end_time) {
          activeIndices.push(index);
        }
      });

      const addedSentences = new Set<number>();

      if (activeIndices.length > 0) {
        activeIndices.forEach((currentIndex) => {
          const allSubs = timeIndexedSubtitlesRef.current;
          if (currentIndex > 0 && !addedSentences.has(currentIndex - 1)) {
            const prevSub = allSubs[currentIndex - 1];
            const info = getNicknameByRoleId(prevSub.role_id);
            addedSentences.add(currentIndex - 1);
            subtitles.push({
              roleName: prevSub.role_name, roleId: prevSub.role_id,
              text: selectedNationality === "KR" ? prevSub.text_ko : prevSub.text_vn,
              isMyRole: currentRound >= 1 && prevSub.role_id === mySelectedRoleId,
              timing: 'prev',
              nickname: info?.nickname,
              nicknameColor: info ? generateUserColor(info.memberId) : undefined,
            });
          }
          if (!addedSentences.has(currentIndex)) {
            const curSub = allSubs[currentIndex];
            const info = getNicknameByRoleId(curSub.role_id);
            addedSentences.add(currentIndex);
            subtitles.push({
              roleName: curSub.role_name, roleId: curSub.role_id,
              text: selectedNationality === "KR" ? curSub.text_ko : curSub.text_vn,
              isMyRole: currentRound >= 1 && curSub.role_id === mySelectedRoleId,
              timing: 'current',
              nickname: info?.nickname,
              nicknameColor: info ? generateUserColor(info.memberId) : undefined,
            });
          }
          if (currentIndex < allSubs.length - 1 && !addedSentences.has(currentIndex + 1)) {
            const nextSub = allSubs[currentIndex + 1];
            const info = getNicknameByRoleId(nextSub.role_id);
            addedSentences.add(currentIndex + 1);
            subtitles.push({
              roleName: nextSub.role_name, roleId: nextSub.role_id,
              text: selectedNationality === "KR" ? nextSub.text_ko : nextSub.text_vn,
              isMyRole: currentRound >= 1 && nextSub.role_id === mySelectedRoleId,
              timing: 'next',
              nickname: info?.nickname,
              nicknameColor: info ? generateUserColor(info.memberId) : undefined,
            });
          }
        });
      } else {
        const allSubs = timeIndexedSubtitlesRef.current;
        let prevIndex = -1;
        for (let i = allSubs.length - 1; i >= 0; i--) {
          if (allSubs[i].end_time <= currentTime) { prevIndex = i; break; }
        }
        let nextIndex = -1;
        for (let i = 0; i < allSubs.length; i++) {
          if (allSubs[i].start_time > currentTime) { nextIndex = i; break; }
        }
        if (prevIndex >= 0) {
          const prevSub = allSubs[prevIndex];
          const info = getNicknameByRoleId(prevSub.role_id);
          subtitles.push({
            roleName: prevSub.role_name, roleId: prevSub.role_id,
            text: selectedNationality === "KR" ? prevSub.text_ko : prevSub.text_vn,
            isMyRole: currentRound >= 1 && prevSub.role_id === mySelectedRoleId,
            timing: 'prev',
            nickname: info?.nickname,
            nicknameColor: info ? generateUserColor(info.memberId) : undefined,
          });
        }
        if (nextIndex >= 0) {
          const nextSub = allSubs[nextIndex];
          const info = getNicknameByRoleId(nextSub.role_id);
          subtitles.push({
            roleName: nextSub.role_name, roleId: nextSub.role_id,
            text: selectedNationality === "KR" ? nextSub.text_ko : nextSub.text_vn,
            isMyRole: currentRound >= 1 && nextSub.role_id === mySelectedRoleId,
            timing: 'next',
            nickname: info?.nickname,
            nicknameColor: info ? generateUserColor(info.memberId) : undefined,
          });
        }
      }
      setCurrentSubtitles(subtitles);
    };

    video.addEventListener('timeupdate', updateSubtitle);
    return () => video.removeEventListener('timeupdate', updateSubtitle);
  }, [mySelectedRoleId, isPlaying, currentRound, selectedNationality, selectedRoles, roomData, getNicknameByRoleId]);

  // Round 모드: 할당되지 않은 구간 음소거/해제
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying || currentRound < 1 || roleSegments.length === 0) return;

    const assignedSentenceIds = new Set<number>();
    roleSegments.forEach((segment) => {
      segment.sentences.forEach((sentence: Sentence) => {
        assignedSentenceIds.add(sentence.sentence_id);
      });
    });

    const unassignedTimeRanges: Array<{ start: number; end: number }> = [];
    timeIndexedSubtitlesRef.current.forEach((subtitle) => {
      if (!assignedSentenceIds.has(subtitle.sentence_id)) {
        unassignedTimeRanges.push({ start: subtitle.start_time - 0.5, end: subtitle.end_time + 0.5 });
      }
    });
    unassignedTimeRanges.sort((a, b) => a.start - b.start);

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const isUnassignedVoiceTime = unassignedTimeRanges.some(
        (range) => currentTime >= range.start && currentTime <= range.end
      );
      video.muted = !isUnassignedVoiceTime;
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (video) video.muted = false;
    };
  }, [isPlaying, currentRound, roleSegments]);

  // segments 데이터를 시간대별로 재가공
  const processSegments = useCallback((segments: RoleSegment[]) => {
    setRoleSegments(segments);
    const allSubtitles: TimeIndexedSubtitle[] = [];
    segments.forEach((segment) => {
      segment.sentences.forEach((sentence: Sentence) => {
        allSubtitles.push({
          sentence_id: sentence.sentence_id,
          start_time: sentence.start_time,
          end_time: sentence.end_time,
          role_id: segment.role_id,
          role_name: segment.role_name,
          text_ko: sentence.text_ko,
          text_vn: sentence.text_vn,
        });
      });
    });
    allSubtitles.sort((a, b) => a.start_time - b.start_time);
    timeIndexedSubtitlesRef.current = allSubtitles;
  }, []);

  const startWatchingPhase = useCallback(() => {
    needPlayOnCanPlayRef.current = true;
    setIsPlaying(true);
    setTimeout(() => {
      if (needPlayOnCanPlayRef.current && videoRef.current) {
        console.log('Fallback: Playing video after 1.5s delay');
        videoRef.current.play().catch(err => {
          console.error('Fallback video play failed:', err);
        });
      }
    }, 1500);
  }, []);

  const startRoundCountdown = useCallback((serverTime: number) => {
    const currentTime = Date.now();
    const timeLeft = serverTime - currentTime;
    if (timeLeft > 0) {
      setTimeUntilStart(Math.ceil(timeLeft / 1000));
    } else {
      setTimeUntilStart(0);
    }
  }, []);

  const resetVideoState = useCallback(() => {
    setIsPlaying(false);
    setVideoReady(false);
    setRoleSegments([]);
    setCurrentSubtitles([]);
    timeIndexedSubtitlesRef.current = [];
  }, []);

  // 다음 차례 알림 + 내 차례 감지 (녹음 인디케이터용)
  const isMyTurnFromSubtitles = isRoundInProgress && currentSubtitles.some(
    subtitle => subtitle.timing === 'current' && subtitle.isMyRole
  );

  return {
    videoRef,
    needPlayOnCanPlayRef,
    timeIndexedSubtitlesRef,
    isPlaying,
    setIsPlaying,
    countdown,
    videoReady,
    setVideoReady,
    currentSubtitles,
    roleSegments,
    timeUntilStart,
    isMyTurnFromSubtitles,
    processSegments,
    startWatchingPhase,
    startRoundCountdown,
    resetVideoState,
  };
}
