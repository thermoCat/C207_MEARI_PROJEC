import { useState, useEffect, useRef, useCallback } from "react";
import type { NavigateFunction, Location } from "react-router-dom";
import { getRoomDetail, enterRoom, leaveRoom } from "../../api/rooms.api";
import { leaveWebRTC } from "../../api/webrtc.api";
import type { RoomDetailData } from "../../api/rooms.api";
import type { ConnectionStatus } from "../useVideoRoom";

const DISABLE_WEBRTC = true;

interface UseRoomLifecycleParams {
  roomId: string | undefined;
  memberId: number;
  navigate: NavigateFunction;
  location: Location;
  setRoomData: (data: RoomDetailData | null) => void;
  clearRoomData: () => void;
  clearRoles: () => void;
  leaveVideoRoom: () => Promise<void>;
  initializeExistingContent: (contentId: number, themeId: number) => Promise<void>;
  updateParticipantsFromMembers: (members: Array<{ member_id: number; is_ready: boolean }>) => void;
  setNeedsAutoContentSelect: (needs: boolean) => void;
  // WebRTC
  status: ConnectionStatus;
  join: (mediaSettings?: { audioEnabled: boolean; videoEnabled: boolean; audioDeviceId?: string; videoDeviceId?: string }) => void;
  publishStream: () => void;
  publisher: unknown;
  isMediaChecked: boolean;
  mediaSettingsRef: React.RefObject<{ audioEnabled: boolean; videoEnabled: boolean; audioDeviceId?: string; videoDeviceId?: string } | null>;
}

export function useRoomLifecycle({
  roomId,
  memberId,
  navigate,
  location,
  setRoomData,
  clearRoomData,
  clearRoles,
  leaveVideoRoom,
  initializeExistingContent,
  updateParticipantsFromMembers,
  setNeedsAutoContentSelect,
  status,
  join,
  publishStream,
  publisher,
  isMediaChecked,
  mediaSettingsRef,
}: UseRoomLifecycleParams) {
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [isEntered, setIsEntered] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const hasEnteredRef = useRef(false);
  const previousMembersRef = useRef<Array<{ member_id: number; nickname: string }>>([]);
  const leaveRef = useRef(leaveVideoRoom);

  useEffect(() => {
    leaveRef.current = leaveVideoRoom;
  }, [leaveVideoRoom]);

  // 방 정보 가져오기 + 입장
  useEffect(() => {
    const fetchRoomDetail = async () => {
      if (!roomId) return;
      if (hasEnteredRef.current) return;
      hasEnteredRef.current = true;

      try {
        setIsRoomLoading(true);
        const response = await getRoomDetail(Number(roomId));
        if (!response.data.success || !response.data.data) {
          alert('방 정보를 가져올 수 없습니다.');
          navigate('/main');
          return;
        }

        setRoomData(response.data.data);
        previousMembersRef.current = response.data.data.members.map(m => ({
          member_id: m.member_id, nickname: m.nickname,
        }));
        updateParticipantsFromMembers(response.data.data.members);

        // 기존 content_id가 있으면 초기화
        if (response.data.data.content_id) {
          await initializeExistingContent(
            response.data.data.content_id,
            response.data.data.theme_id || 1
          );
        } else if ((location.state as { isQuickCreate?: boolean })?.isQuickCreate && response.data.data.theme_id) {
          setNeedsAutoContentSelect(true);
        }

        const isAlreadyMember = response.data.data.members.some(m => m.member_id === memberId);

        if (isAlreadyMember) {
          const navPassword = (location.state as { password?: string })?.password;
          if (navPassword) sessionStorage.setItem(`room_${roomId}_pwd`, navPassword);
          previousMembersRef.current = response.data.data.members.map(m => ({
            member_id: m.member_id, nickname: m.nickname,
          }));
          updateParticipantsFromMembers(response.data.data.members);
          setIsEntered(true);
        } else {
          const navPassword = (location.state as { password?: string })?.password;
          const savedPassword = sessionStorage.getItem(`room_${roomId}_pwd`);
          const roomPassword = navPassword || savedPassword || undefined;

          const maxRetries = 3;
          let entered = false;

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              await enterRoom(Number(roomId), { password: roomPassword });
              entered = true;
              break;
            } catch (error: unknown) {
              const axiosError = error as { response?: { status?: number } };
              if (axiosError.response?.status === 409) { entered = true; break; }
              if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, 1000));
                const retryResp = await getRoomDetail(Number(roomId));
                if (retryResp.data.data?.members.some(m => m.member_id === memberId)) {
                  entered = true;
                  break;
                }
              } else {
                console.error('Failed to enter room:', error);
                alert('방 입장에 실패했습니다.');
                navigate('/main');
                return;
              }
            }
          }

          if (entered) {
            if (roomPassword) sessionStorage.setItem(`room_${roomId}_pwd`, roomPassword);
            const updatedResponse = await getRoomDetail(Number(roomId));
            if (updatedResponse.data.success && updatedResponse.data.data) {
              setRoomData(updatedResponse.data.data);
              previousMembersRef.current = updatedResponse.data.data.members.map(m => ({
                member_id: m.member_id, nickname: m.nickname,
              }));
              updateParticipantsFromMembers(updatedResponse.data.data.members);
            }
            setIsEntered(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch room detail:', error);
        alert('방 정보를 가져오는데 실패했습니다.');
        navigate('/main');
      } finally {
        setIsRoomLoading(false);
      }
    };

    fetchRoomDetail();
  }, [roomId, navigate, setRoomData, memberId]);

  // WebRTC 연결
  useEffect(() => {
    if (DISABLE_WEBRTC) return;
    if (isEntered && roomId && status === 'idle' && isMediaChecked) {
      join(mediaSettingsRef.current || undefined);
    }
  }, [isEntered, roomId, status, isMediaChecked]);

  // WebRTC 연결 완료 후 스트림 publish
  useEffect(() => {
    if (DISABLE_WEBRTC) return;
    if (status === 'connected' && publisher && isMediaChecked) {
      const timer = setTimeout(() => {
        console.log('Publishing stream after connection established');
        publishStream();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status, publisher, isMediaChecked, publishStream]);

  // 브라우저 뒤로가기 감지
  useEffect(() => {
    const handlePopState = async () => {
      if (roomId && isEntered && !isLeaving) {
        window.history.pushState(null, '', window.location.href);
        await handleLeaveInternal();
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [roomId, isEntered, isLeaving]);

  // 브라우저 닫기/새로고침 시 퇴장 처리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomId && isEntered) {
        const token = localStorage.getItem('access_token');
        const baseUrl = import.meta.env.VITE_BASE_SERVER_URL;
        fetch(`${baseUrl}/rooms/${roomId}/leave`, {
          method: 'DELETE',
          keepalive: true,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        sessionStorage.removeItem(`room_${roomId}_pwd`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, isEntered]);

  const handleLeaveInternal = useCallback(async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setIsEntered(false);

    try {
      if (roomId) {
        await leaveRef.current();
        try { await leaveWebRTC(Number(roomId)); } catch (error) {
          console.error('Failed to leave WebRTC:', error);
        }
        await leaveRoom(Number(roomId));
        clearRoomData();
        clearRoles();
        sessionStorage.removeItem(`room_${roomId}_pwd`);
      }
      navigate("/main", { replace: true });
    } catch (error) {
      console.error('Failed to leave room:', error);
      navigate("/main", { replace: true });
    } finally {
      setIsLeaving(false);
    }
  }, [roomId, isLeaving, navigate, clearRoomData, clearRoles]);

  const handleLeave = useCallback(() => {
    handleLeaveInternal();
  }, [handleLeaveInternal]);

  // 멤버 입퇴장 시 방 정보 갱신 헬퍼
  const refreshRoomData = useCallback(async () => {
    if (!roomId) return null;
    try {
      const response = await getRoomDetail(Number(roomId));
      if (response.data.success && response.data.data) {
        setRoomData(response.data.data);
        previousMembersRef.current = response.data.data.members.map(m => ({
          member_id: m.member_id, nickname: m.nickname,
        }));
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to refresh room detail:', error);
    }
    return null;
  }, [roomId, setRoomData]);

  return {
    isRoomLoading,
    isEntered,
    isMediaChecked: isMediaChecked,
    isLeaving,
    handleLeave,
    refreshRoomData,
    previousMembersRef,
  };
}
