import { useState, useRef, useCallback } from "react";
import type { Role } from "../useRoomWebSocket";
import { getContentRoles, type ContentRole } from "../../api/contents.api";
import { startGame, confirmRoles, startRound, finishRoom } from "../../api/rooms.api";
import { useRoomStore } from "../../store/room.store";
import { useRoleStore } from "../../store/role.store";
import type { RoomDetailData } from "../../api/rooms.api";

interface UseShadowingGamePhaseParams {
  roomId: string | undefined;
  contentId: number | null;
  isOwner: boolean;
  memberId: number;
  roomData: RoomDetailData | null;
  wsToggleReady: (ready: boolean) => void;
  assignRole: (roleId: number) => void;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
}

export function useShadowingGamePhase({
  roomId,
  contentId,
  isOwner,
  memberId,
  roomData,
  wsToggleReady,
  assignRole,
  showToast,
}: UseShadowingGamePhaseParams) {
  const [isReady, setIsReady] = useState(false);
  const [isReadyLoading, setIsReadyLoading] = useState(false);
  const [isGameStarting, setIsGameStarting] = useState(false);
  const [isRoundStarting, setIsRoundStarting] = useState(false);
  const [isRoundInProgress, setIsRoundInProgress] = useState(false);
  const [isFinishingRound, setIsFinishingRound] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [isWaitingForRolePick, setIsWaitingForRolePick] = useState(false);
  const [participantsReady, setParticipantsReady] = useState<Record<number, boolean>>({});
  const [isConfirmingRoles, setIsConfirmingRoles] = useState(false);
  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);
  const [isRoleAssigned, setIsRoleAssigned] = useState(false);
  const readyTimeoutRef = useRef<number | null>(null);

  const { setAvailableRoles, setMySelectedRole, setMemberRole, removeMemberRole, getConfirmData, clearRoles } = useRoleStore();

  const totalParticipants = roomData?.members.length || 0;
  const readyCount = Object.values(participantsReady).filter(ready => ready).length;
  const allParticipantsReady = totalParticipants > 0 && readyCount === totalParticipants;

  const handleToggleReady = useCallback(() => {
    if (isReadyLoading) return;
    setIsReadyLoading(true);
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    readyTimeoutRef.current = setTimeout(() => {
      setIsReadyLoading(false);
      showToast('준비 완료에 실패했어요');
    }, 5000) as unknown as number;
    try {
      wsToggleReady(!isReady);
    } catch (error) {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      setIsReadyLoading(false);
      showToast('준비 완료에 실패했어요');
      console.error('Failed to toggle ready:', error);
    }
  }, [isReadyLoading, isReady, wsToggleReady, showToast]);

  const handleStartShadowing = useCallback(async () => {
    if (!roomId || !contentId) {
      showToast('컨텐츠를 선택해주세요');
      return;
    }
    try {
      setIsGameStarting(true);
      setIsReady(false);
      setParticipantsReady({});
      const response = await startGame(Number(roomId), { content_id: contentId });
      if (!response.data.success) {
        setIsGameStarting(false);
        showToast('게임 시작에 실패했어요');
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsGameStarting(false);
      showToast('게임 시작에 실패했어요');
    }
  }, [roomId, contentId, showToast]);

  const handleStartRound = useCallback(async (round: number) => {
    if (!roomId) return;
    try {
      setIsRoundStarting(true);
      const response = await startRound(Number(roomId), { round });
      if (response.data.success) {
        console.log(`Round ${round} start API called successfully`);
      } else {
        setIsRoundStarting(false);
        showToast('라운드 시작에 실패했어요');
      }
    } catch (error) {
      console.error('Failed to start round:', error);
      setIsRoundStarting(false);
      showToast('라운드 시작에 실패했어요');
    }
  }, [roomId, showToast]);

  const handleRoleSelect = useCallback((role: Role) => {
    assignRole(role.role_id);
    console.log('Role selected:', role);
  }, [assignRole]);

  const handleConfirmRoles = useCallback(async () => {
    if (!roomId) return;
    try {
      setIsConfirmingRoles(true);
      const confirmData = getConfirmData();
      console.log('Confirming roles:', confirmData);
      const response = await confirmRoles(Number(roomId), { roles: confirmData });
      if (response.data.success) {
        showToast('역할 선택이 확정되었습니다');
        setIsRoleSelectOpen(false);
        setIsRoleAssigned(true);
      } else {
        showToast('역할 확정에 실패했어요');
      }
    } catch (error) {
      console.error('Failed to confirm roles:', error);
      showToast('역할 확정에 실패했어요');
    } finally {
      setIsConfirmingRoles(false);
    }
  }, [roomId, getConfirmData, showToast]);

  const handleFinishRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      console.log('Finishing room...');
      const response = await finishRoom(Number(roomId));
      if (response.data.success) {
        console.log('Room finished successfully');
      } else {
        showToast('처음으로 돌아가기에 실패했어요');
      }
    } catch (error) {
      console.error('Failed to finish room:', error);
      showToast('처음으로 돌아가기에 실패했어요');
    }
  }, [roomId, showToast]);

  const resetToWaitingState = useCallback(() => {
    console.log('Resetting to waiting state');
    setIsRoleAssigned(false);
    setCurrentRound(0);
    setIsRoundInProgress(false);
    setIsGameStarting(false);
    setIsRoundStarting(false);
    setIsFinishingRound(false);
    setIsReady(false);
    clearRoles();
    showToast('대기 상태로 돌아갔습니다');
  }, [clearRoles, showToast]);

  // WS 콜백 헬퍼
  const handleReadyMessage = useCallback((msgMemberId: number, ready: boolean) => {
    setParticipantsReady(prev => ({ ...prev, [msgMemberId]: ready }));
    if (msgMemberId === memberId) {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      setIsReadyLoading(false);
      setIsReady(ready);
    }
  }, [memberId]);

  const handleRolePick = useCallback(async (msgContentId?: number | null) => {
    setIsWaitingForRolePick(false);
    const storeContentId = useRoomStore.getState().contentId;
    const currentContentId = storeContentId || msgContentId;
    if (!currentContentId) {
      console.error('No content_id available to fetch roles');
      showToast('역할 정보를 불러올 수 없습니다');
      return;
    }
    try {
      const response = await getContentRoles(currentContentId);
      if (response.data.success && response.data.data) {
        const roles: Role[] = response.data.data.map((role: ContentRole) => ({
          id: role.content_id,
          role_id: role.role_id,
          name: role.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setAvailableRoles(roles);
        setIsRoleSelectOpen(true);
      } else {
        console.error('Failed to fetch roles:', response.data.error);
        showToast('역할 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      showToast('역할 정보를 불러오는데 실패했습니다');
    }
  }, [showToast, setAvailableRoles]);

  const handleRoleAssigned = useCallback((msgMemberId: number, roleId: number) => {
    setMemberRole(msgMemberId, roleId);
    if (msgMemberId === memberId) {
      setMySelectedRole(roleId);
      showToast('역할이 등록되었습니다');
    }
  }, [memberId, setMemberRole, setMySelectedRole, showToast]);

  const handleRoleReleased = useCallback((msgMemberId: number) => {
    removeMemberRole(msgMemberId);
    if (msgMemberId === memberId) {
      setMySelectedRole(undefined);
      showToast('역할이 해제되었습니다');
    }
  }, [memberId, removeMemberRole, setMySelectedRole, showToast]);

  const handleRolesConfirmed = useCallback(() => {
    setIsRoleSelectOpen(false);
    setIsRoleAssigned(true);
    showToast('역할이 확정되었습니다');
  }, [showToast]);

  const updateParticipantsFromMembers = useCallback((members: Array<{ member_id: number; is_ready: boolean }>) => {
    const readyState: Record<number, boolean> = {};
    members.forEach(m => { readyState[m.member_id] = m.is_ready; });
    setParticipantsReady(readyState);
  }, []);

  const resetReadyState = useCallback(() => {
    setIsReady(false);
    setParticipantsReady({});
  }, []);

  const resetGameState = useCallback(() => {
    setIsRoundInProgress(false);
    setIsGameStarting(false);
    setIsRoundStarting(false);
    setIsFinishingRound(false);
    setCurrentRound(0);
    setIsWaitingForRolePick(false);
    setIsRoleAssigned(false);
    setIsRoleSelectOpen(false);
    setIsReady(false);
    setParticipantsReady({});
  }, []);

  return {
    isReady,
    isReadyLoading,
    isGameStarting,
    setIsGameStarting,
    isRoundStarting,
    setIsRoundStarting,
    isRoundInProgress,
    setIsRoundInProgress,
    isFinishingRound,
    setIsFinishingRound,
    currentRound,
    setCurrentRound,
    isWaitingForRolePick,
    setIsWaitingForRolePick,
    participantsReady,
    isConfirmingRoles,
    isRoleSelectOpen,
    setIsRoleSelectOpen,
    isRoleAssigned,
    setIsRoleAssigned,
    totalParticipants,
    readyCount,
    allParticipantsReady,
    handleToggleReady,
    handleStartShadowing,
    handleStartRound,
    handleRoleSelect,
    handleConfirmRoles,
    handleFinishRoom,
    resetToWaitingState,
    handleReadyMessage,
    handleRolePick,
    handleRoleAssigned,
    handleRoleReleased,
    handleRolesConfirmed,
    updateParticipantsFromMembers,
    resetReadyState,
    resetGameState,
  };
}
