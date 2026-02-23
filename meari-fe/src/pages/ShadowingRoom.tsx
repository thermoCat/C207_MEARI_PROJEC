import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import MediaCheckScreen from "../components/webrtc/MediaCheckScreen";
import ContentSelectModal from "../components/webrtc/ContentSelectModal";
import Toast from "../components/common/Toast";
import RoleSelectModal from "../components/webrtc/RoleSelectModal";
import RecordingIndicator from "../components/webrtc/RecordingIndicator";
import { useVideoRoom } from "../hooks/useVideoRoom";
import { useRoomWebSocket, type ChatMessage } from "../hooks/useRoomWebSocket";
import { finishWatching, finishRound } from "../api/rooms.api";
import { useRoomStore } from "../store/room.store";
import { useRoleStore } from "../store/role.store";
import LoadingPanel from "@/components/webrtc/LoadingPanel";
import EnterPanel from "@/components/webrtc/EnterPanel";
import ShadowingHeader from "@/components/webrtc/ShadowingHeader";
import RightSideBardPanel from "@/components/webrtc/RightSideBardPanel";
import MainVideoPanel from "@/components/webrtc/MainVideoPanel";
import { useToastNotifications } from "../hooks/shadowing/useToastNotifications";
import { useMediaControls } from "../hooks/shadowing/useMediaControls";
import { useContentSelection } from "../hooks/shadowing/useContentSelection";
import { useShadowingGamePhase } from "../hooks/shadowing/useShadowingGamePhase";
import { useVideoPlayback } from "../hooks/shadowing/useVideoPlayback";
import { useRecordingScheduler } from "../hooks/shadowing/useRecordingScheduler";
import { useRoomLifecycle } from "../hooks/shadowing/useRoomLifecycle";
import RoomIdErrorPanel from "@/components/webrtc/RoomIdErrorPanel";

const DISABLE_WEBRTC = true;

export default function ShadowingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useAuthStore();
  const roomOwnerId = useRoomStore((state) => state.roomData?.owner_id);
  const isOwner = userInfo?.memberId === roomOwnerId;
  const { roomData, contentId, setRoomData, setContentId, clearRoomData } = useRoomStore();
  const { availableRoles, mySelectedRoleId, selectedRoles, clearRoles } = useRoleStore();
  const memberId = userInfo?.memberId ?? 0;
  const nickname = userInfo?.nickname || "User";

  // 채팅
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // 미디어 체크 상태
  const [isMediaChecked, setIsMediaChecked] = useState(DISABLE_WEBRTC ? true : false);

  // --- Custom Hooks ---
  const toast = useToastNotifications();
  const videoRef = useRef<HTMLVideoElement>(null);

  // WebRTC
  const {
    status, error, tiles, publisher, isAudioEnabled, isVideoEnabled,
    join, leave, publishStream, toggleAudio, toggleVideo,
  } = useVideoRoom({
    roomId: Number(roomId), nickname, password: undefined,
    autoJoin: false, autoPublish: false, isOwner,
  });

  // 역할 ID로 닉네임 찾기
  const getNicknameByRoleId = useCallback((roleId: number): { nickname: string; memberId: number } | null => {
    const memberEntry = Object.entries(selectedRoles).find(([, selectedRoleId]) => selectedRoleId === roleId);
    if (!memberEntry) return null;
    const mid = Number(memberEntry[0]);
    const member = roomData?.members.find(m => m.member_id === mid);
    if (!member) return null;
    return { nickname: member.nickname, memberId: mid };
  }, [selectedRoles, roomData]);

  // Media Controls
  const media = useMediaControls(videoRef);

  // Content Selection
  const content = useContentSelection({
    roomId, roomData,
    setContentId,
    showToast: toast.showToast,
  });

  // Game Phase - need WS first, but WS needs game phase callbacks...
  // We initialize WebSocket and game phase together

  const {
    toggleReady: wsToggleReady, assignRole,
    sendChatMessage, sendRecordingComplete,
  } = useRoomWebSocket({
    roomId: Number(roomId),
    memberId,
    onContentSelected: async (message) => {
      if (!message.content_id) return;
      await content.handleContentSelectedWS(message.content_id);
      gamePhase.resetReadyState();
    },
    onReady: (message) => {
      if (message.member_id !== undefined && message.ready !== undefined) {
        gamePhase.handleReadyMessage(message.member_id, message.ready);
      }
    },
    onRolePick: async (message) => {
      await gamePhase.handleRolePick(message.content_id);
    },
    onRoleAssigned: (message) => {
      if (message.role_id && message.member_id) {
        gamePhase.handleRoleAssigned(message.member_id, message.role_id);
      }
    },
    onRoleReleased: (message) => {
      if (message.member_id) {
        gamePhase.handleRoleReleased(message.member_id);
      }
    },
    onGameStart: (message) => {
      if (message.segments) {
        video.processSegments(message.segments);
      }
      if (message.phase === 'WATCHING') {
        video.startWatchingPhase();
      }
    },
    onPhaseWaiting: () => {
      gamePhase.resetToWaitingState();
      content.resetContentState();
    },
    onRolesConfirmed: (message) => {
      if (message.segments) {
        video.processSegments(message.segments);
        gamePhase.handleRolesConfirmed();
      }
    },
    onRoundStart: (message) => {
      if (message.segments) {
        video.processSegments(message.segments);
      }
      if (message.round) {
        gamePhase.setCurrentRound(message.round);
        gamePhase.setIsRoundInProgress(true);
        gamePhase.setIsRoundStarting(false);
        if (message.round >= 2) media.setSelectedNationality("KR");
      }
      if (message.server_time) {
        video.startRoundCountdown(message.server_time);
      }
    },
    onGameFinished: (message) => {
      console.log('Game finished:', message);
      video.resetVideoState();
      recording.resetRecordingState();
      setContentId(null);
      clearRoles();
      gamePhase.resetToWaitingState();
      content.resetContentState();
      toast.showToast('게임이 종료되었습니다');
    },
    onMemberJoin: async (message) => {
      if (message.nickname) {
        setChatMessages(prev => [...prev, {
          sender_id: 0, nickname: 'System',
          message: `${message.nickname}님이 입장하셨습니다`,
          timestamp: new Date().toISOString(), isSystem: true,
        }]);
      }
      if (roomId) {
        const data = await lifecycle.refreshRoomData();
        if (data) {
          if (!message.nickname && message.member_id) {
            const newMember = data.members.find(m => m.member_id === message.member_id);
            if (newMember) {
              setChatMessages(prev => [...prev, {
                sender_id: 0, nickname: 'System',
                message: `${newMember.nickname}님이 입장하셨습니다`,
                timestamp: new Date().toISOString(), isSystem: true,
              }]);
            }
          }
          gamePhase.updateParticipantsFromMembers(data.members);
        }
      }
    },
    onMemberLeave: async (message) => {
      let leavingNickname = message.nickname;
      if (!leavingNickname && message.member_id) {
        const prev = lifecycle.previousMembersRef.current.find(m => m.member_id === message.member_id);
        if (prev) leavingNickname = prev.nickname;
      }
      if (leavingNickname) {
        setChatMessages(prev => [...prev, {
          sender_id: 0, nickname: 'System',
          message: `${leavingNickname}님이 퇴장하셨습니다`,
          timestamp: new Date().toISOString(), isSystem: true,
        }]);
      }
      if (roomId) {
        const data = await lifecycle.refreshRoomData();
        if (data) gamePhase.updateParticipantsFromMembers(data.members);
      }
    },
    onError: (error) => console.error('WebSocket error:', error),
    onChatMessage: (message) => setChatMessages(prev => [...prev, message]),
  });

  // Game Phase (needs wsToggleReady, assignRole)
  const gamePhase = useShadowingGamePhase({
    roomId, contentId, isOwner, memberId, roomData,
    wsToggleReady, assignRole,
    showToast: toast.showToast,
  });

  // Video Playback
  const video = useVideoPlayback({
    videoRef,
    selectedNationality: media.selectedNationality,
    mySelectedRoleId,
    currentRound: gamePhase.currentRound,
    selectedRoles,
    roomData,
    isRoundInProgress: gamePhase.isRoundInProgress,
    getNicknameByRoleId,
  });

  // Recording Scheduler
  const recording = useRecordingScheduler({
    videoReady: video.videoReady,
    isPlaying: video.isPlaying,
    currentRound: gamePhase.currentRound,
    isRoundInProgress: gamePhase.isRoundInProgress,
    roleSegments: video.roleSegments,
    mySelectedRoleId,
    roomId, memberId,
    publisher, isAudioEnabled,
    currentSubtitles: video.currentSubtitles,
    sendRecordingComplete,
    showToast: toast.showToast,
  });

  // Room Lifecycle
  const lifecycle = useRoomLifecycle({
    roomId, memberId, navigate, location,
    setRoomData, clearRoomData, clearRoles,
    leaveVideoRoom: leave,
    initializeExistingContent: content.initializeExistingContent,
    updateParticipantsFromMembers: gamePhase.updateParticipantsFromMembers,
    setNeedsAutoContentSelect: content.setNeedsAutoContentSelect,
    status, join, publishStream, publisher,
    isMediaChecked,
    mediaSettingsRef: media.mediaSettingsRef,
  });

  // 영상 재생 완료 핸들러
  const handleVideoEnded = async () => {
    video.setIsPlaying(false);
    if (gamePhase.currentRound >= 1 && gamePhase.isRoundInProgress) {
      gamePhase.setIsRoundInProgress(false);
      toast.showToast(`Round ${gamePhase.currentRound} 완료`);
      if (isOwner && roomId) {
        gamePhase.setIsFinishingRound(true);
        setTimeout(async () => {
          try {
            const response = await finishRound(Number(roomId), gamePhase.currentRound);
            if (!response.data.success) {
              toast.showToast('라운드 종료에 실패했어요');
            }
          } catch (err) {
            console.error('Failed to finish round:', err);
            toast.showToast('라운드 종료에 실패했어요');
          } finally {
            gamePhase.setIsFinishingRound(false);
          }
        }, 2000);
      }
    } else if (roomId && isOwner && contentId) {
      gamePhase.setIsWaitingForRolePick(true);
      try {
        const response = await finishWatching(Number(roomId), { content_id: contentId });
        if (response.data.success) gamePhase.setIsGameStarting(false);
      } catch (err) {
        console.error('Failed to finish watching:', err);
      }
    } else {
      gamePhase.setIsWaitingForRolePick(true);
    }
  };

  const handleMediaCheckComplete = (
    audioEnabled: boolean, videoEnabled: boolean,
    audioDeviceId?: string, videoDeviceId?: string
  ) => {
    media.handleMediaCheckComplete(audioEnabled, videoEnabled, audioDeviceId, videoDeviceId);
    setIsMediaChecked(true);
  };

  // 방 정보
  const roomInfo = roomData ? {
    isLocked: roomData.has_password, title: roomData.title,
    password: '', themeId: roomData.theme_id, themeName: roomData.theme_name,
  } : {
    isLocked: false, title: "Loading...", password: "", themeId: 1, themeName: "",
  };

  if (!roomId) {
    return (
      <RoomIdErrorPanel />
    );
  }

  if (lifecycle.isRoomLoading) return <LoadingPanel />;
  if (!lifecycle.isEntered) return <EnterPanel />;

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <div className="flex flex-1 flex-col">
        <ShadowingHeader roomInfo={roomInfo} />
        <MainVideoPanel
          disableWebRTC={DISABLE_WEBRTC}
          status={status}
          error={error}
          onJoin={join}
          isOwner={isOwner}
          roomInfo={roomInfo}
          videoRef={videoRef}
          needPlayOnCanPlayRef={video.needPlayOnCanPlayRef}
          videoUrl={content.videoUrl}
          selectedContent={content.selectedContent}
          themeDescription={content.themeDescription}
          availableContents={content.availableContents}
          isContentsLoading={content.isContentsLoading}
          mainContentIndex={content.mainContentIndex}
          carouselOrder={content.carouselOrder}
          isTransitioning={content.isTransitioning}
          isPlaying={video.isPlaying}
          isGameStarting={gamePhase.isGameStarting}
          isRoleAssigned={gamePhase.isRoleAssigned}
          isRoleSelectOpen={gamePhase.isRoleSelectOpen}
          isWaitingForRolePick={gamePhase.isWaitingForRolePick}
          isRoundInProgress={gamePhase.isRoundInProgress}
          isFinishingRound={gamePhase.isFinishingRound}
          isRoundStarting={gamePhase.isRoundStarting}
          currentRound={gamePhase.currentRound}
          countdown={video.countdown}
          timeUntilStart={video.timeUntilStart}
          isReady={gamePhase.isReady}
          isReadyLoading={gamePhase.isReadyLoading}
          totalParticipants={gamePhase.totalParticipants}
          readyCount={gamePhase.readyCount}
          allParticipantsReady={gamePhase.allParticipantsReady}
          isSubtitleEnabled={media.isSubtitleEnabled}
          currentSubtitles={video.currentSubtitles}
          availableRoles={availableRoles}
          onContentSelect={content.handleContentSelect}
          onMainContentChange={content.handleMainContentChange}
          onCancelContentSelection={content.handleCancelContentSelection}
          onToggleReady={gamePhase.handleToggleReady}
          onStartShadowing={gamePhase.handleStartShadowing}
          onStartRound={gamePhase.handleStartRound}
          onFinishRoom={gamePhase.handleFinishRoom}
          onSetRoleSelectOpen={gamePhase.setIsRoleSelectOpen}
          onVideoEnded={handleVideoEnded}
          onVideoReady={() => video.setVideoReady(true)}
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onLeave={lifecycle.handleLeave}
          volume={media.volume}
          onVolumeChange={media.setVolume}
          selectedAudioDevice={media.selectedAudioDevice}
          selectedVideoDevice={media.selectedVideoDevice}
          onAudioDeviceChange={media.handleAudioDeviceChange}
          onVideoDeviceChange={media.handleVideoDeviceChange}
          selectedNationality={media.selectedNationality}
          onNationalityChange={media.setSelectedNationality}
          onToggleSubtitle={media.toggleSubtitle}
          isNationalityLocked={gamePhase.currentRound >= 2}
        />
      </div>

      <RightSideBardPanel
        disableWebRTC={DISABLE_WEBRTC}
        isMediaChecked={isMediaChecked}
        status={status}
        tiles={tiles}
        participantsReady={gamePhase.participantsReady}
        isGameStarting={gamePhase.isGameStarting}
        isPlaying={video.isPlaying}
        roomOwnerId={roomOwnerId}
        chatMessages={chatMessages}
        sendChatMessage={sendChatMessage}
        nickname={nickname}
        memberId={memberId}
      />

      {content.isContentSelectOpen && (
        <ContentSelectModal
          themeId={roomInfo.themeId}
          onClose={() => content.setIsContentSelectOpen(false)}
          onSelect={content.handleContentSelect}
        />
      )}

      {gamePhase.isRoleSelectOpen && (
        <RoleSelectModal
          roles={availableRoles}
          onSelect={gamePhase.handleRoleSelect}
          onClose={() => gamePhase.setIsRoleSelectOpen(false)}
          onConfirm={gamePhase.handleConfirmRoles}
          isHost={isOwner}
          isConfirming={gamePhase.isConfirmingRoles}
          roomMembers={roomData?.members}
          selectedRoles={selectedRoles}
          currentUserId={memberId}
        />
      )}

      {toast.toastMessage && (
        <Toast message={toast.toastMessage} type={toast.toastType} onClose={toast.clearToast} />
      )}

      {recording.isMyTurnRecording && <RecordingIndicator />}

      {!DISABLE_WEBRTC && !isMediaChecked && (
        <div className="fixed inset-0 z-9999 backdrop-blur-sm bg-black/30">
          <MediaCheckScreen onJoin={handleMediaCheckComplete} roomTitle={roomInfo.title} />
        </div>
      )}
    </div>
  );
}
