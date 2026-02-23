import type { RefObject } from "react";
import { X, UserCircle } from "lucide-react";
import VideoControls from "./VideoControls";
import RoundFinishPanel from "./RoundFinishPanel";
import SubtitleOverlay from "./SubtitleOverlay";
import ContentCarousel from "./ContentCarousel";
import GameControlPanel from "./GameControlPanel";
import type { ConnectionStatus } from "../../hooks/useVideoRoom";
import type { Content } from "../../api/contents.api";
import type { SubtitleItem } from "../../hooks/shadowing/types";
import type { Role } from "../../hooks/useRoomWebSocket";

interface MainVideoPanelProps {
  // Connection
  disableWebRTC: boolean;
  status: ConnectionStatus;
  error: string | null;
  onJoin: () => void;

  // Room
  isOwner: boolean;
  roomInfo: { themeName: string; themeId: number };

  // Video refs
  videoRef: RefObject<HTMLVideoElement | null>;
  needPlayOnCanPlayRef: RefObject<boolean>;
  videoUrl: string | null;

  // Content
  selectedContent: Content | null;
  themeDescription: string;
  availableContents: Content[];
  isContentsLoading: boolean;
  mainContentIndex: number;
  carouselOrder: number[];
  isTransitioning: boolean;

  // Game state
  isPlaying: boolean;
  isGameStarting: boolean;
  isRoleAssigned: boolean;
  isRoleSelectOpen: boolean;
  isWaitingForRolePick: boolean;
  isRoundInProgress: boolean;
  isFinishingRound: boolean;
  isRoundStarting: boolean;
  currentRound: number;
  countdown: number | null;
  timeUntilStart: number | null;

  // Ready state
  isReady: boolean;
  isReadyLoading: boolean;
  totalParticipants: number;
  readyCount: number;
  allParticipantsReady: boolean;

  // Subtitles
  isSubtitleEnabled: boolean;
  currentSubtitles: SubtitleItem[];

  // Roles
  availableRoles: Role[];

  // Handlers
  onContentSelect: (content: Content) => void;
  onMainContentChange: (index: number) => void;
  onCancelContentSelection: () => void;
  onToggleReady: () => void;
  onStartShadowing: () => void;
  onStartRound: (round: number) => void;
  onFinishRoom: () => void;
  onSetRoleSelectOpen: (open: boolean) => void;
  onVideoEnded: () => void;
  onVideoReady: () => void;

  // Video controls
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  selectedAudioDevice?: string;
  selectedVideoDevice?: string;
  onAudioDeviceChange: (deviceId: string) => void;
  onVideoDeviceChange: (deviceId: string) => void;
  selectedNationality: "KR" | "VN";
  onNationalityChange: (nationality: "KR" | "VN") => void;
  onToggleSubtitle: () => void;
  isNationalityLocked: boolean;
}

export default function MainVideoPanel({
  disableWebRTC,
  status,
  error,
  onJoin,
  isOwner,
  roomInfo,
  videoRef,
  needPlayOnCanPlayRef,
  videoUrl,
  selectedContent,
  themeDescription,
  availableContents,
  isContentsLoading,
  mainContentIndex,
  carouselOrder,
  isTransitioning,
  isPlaying,
  isGameStarting,
  isRoleAssigned,
  isRoleSelectOpen,
  isWaitingForRolePick,
  isRoundInProgress,
  isFinishingRound,
  isRoundStarting,
  currentRound,
  countdown,
  timeUntilStart,
  isReady,
  isReadyLoading,
  totalParticipants,
  readyCount,
  allParticipantsReady,
  isSubtitleEnabled,
  currentSubtitles,
  availableRoles,
  onContentSelect,
  onMainContentChange,
  onCancelContentSelection,
  onToggleReady,
  onStartShadowing,
  onStartRound,
  onFinishRoom,
  onSetRoleSelectOpen,
  onVideoEnded,
  onVideoReady,
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave,
  volume,
  onVolumeChange,
  selectedAudioDevice,
  selectedVideoDevice,
  onAudioDeviceChange,
  onVideoDeviceChange,
  selectedNationality,
  onNationalityChange,
  onToggleSubtitle,
  isNationalityLocked,
}: MainVideoPanelProps) {
  const isConnectedOrDisabled = disableWebRTC || status === "connected";

  return (
    <>
      {/* 메인 비디오 영역 */}
      <div className="flex-1 p-4 bg-white">
        <div className="relative h-full w-full rounded-lg bg-black flex items-center justify-center overflow-hidden">
          {/* WebRTC 연결 상태 */}
          {!disableWebRTC && status === "connecting" && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400">연결 중...</p>
            </div>
          )}
          {!disableWebRTC && status === "error" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => onJoin()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          )}

          {isConnectedOrDisabled && (
            <>
              {/* 카운트다운 오버레이 */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 rounded-lg">
                  <div className="text-white text-9xl font-bold animate-pulse">
                    {countdown}
                  </div>
                </div>
              )}

              {isFinishingRound && <RoundFinishPanel />}

              {/* Round 시작 대기 오버레이 */}
              {timeUntilStart !== null && timeUntilStart > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 rounded-lg">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-white text-2xl font-semibold mb-2">
                    Round {currentRound} 준비 중
                  </p>
                  <p className="text-gray-300 text-lg">
                    {timeUntilStart}초 후 시작
                  </p>
                </div>
              )}

              {/* 영상 재생 중 */}
              {isPlaying && selectedContent && videoUrl && (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="absolute inset-0 w-full h-full object-contain"
                    autoPlay
                    playsInline
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ pointerEvents: "none" }}
                    onLoadedMetadata={() => onVideoReady()}
                    onPlay={() => onVideoReady()}
                    onCanPlay={() => {
                      if (needPlayOnCanPlayRef.current && videoRef.current) {
                        console.log("onCanPlay: Playing video");
                        needPlayOnCanPlayRef.current = false;
                        videoRef.current.play().catch((err) => {
                          console.error("onCanPlay video play failed:", err);
                        });
                      }
                    }}
                    onEnded={onVideoEnded}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />
                  <SubtitleOverlay
                    isSubtitleEnabled={isSubtitleEnabled}
                    currentSubtitles={currentSubtitles}
                  />
                </div>
              )}

              {/* 영상 재생 전 */}
              {!isPlaying && (
                <>
                  {/* 비디오 배경 (blur 처리) */}
                  {selectedContent && videoUrl && (
                    <div className="absolute inset-0 overflow-hidden">
                      <video
                        src={videoUrl}
                        className="w-full h-full object-cover"
                        style={{ filter: "blur(20px)", transform: "scale(1.1)" }}
                        muted
                        playsInline
                      />
                      <video
                        src={videoUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                          filter: "blur(2px)",
                          transform: "scale(1.1)",
                          maskImage:
                            "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                          WebkitMaskImage:
                            "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                        }}
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/65" />
                    </div>
                  )}

                  {/* 컨텐츠 정보 - 왼쪽 중앙 */}
                  {selectedContent && (
                    <div className="absolute left-8 top-[35%] z-20 max-w-2xl">
                      <span className="inline-block px-4 py-1.5 bg-gray-500/30 text-gray-300 text-sm font-medium rounded-full mb-3">
                        {roomInfo.themeName}
                      </span>
                      <h2 className="text-white text-5xl font-bold mb-3">
                        {selectedContent.title}
                      </h2>
                      <p className="text-gray-200 text-base leading-relaxed mb-4">
                        {themeDescription}
                      </p>
                      {isOwner &&
                        !isGameStarting &&
                        !isRoleAssigned &&
                        !isWaitingForRolePick &&
                        !isRoleSelectOpen && (
                          <button
                            onClick={onCancelContentSelection}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-colors border border-white/30"
                          >
                            <X size={18} />
                            컨텐츠 선택 취소
                          </button>
                        )}
                    </div>
                  )}

                  {/* 역할 선택 대기 중 */}
                  {isWaitingForRolePick ? (
                    <div className="relative flex flex-col items-center gap-4 z-10">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-white text-xl font-semibold">
                        다른 사용자들을 기다리는 중입니다..
                      </p>
                    </div>
                  ) : (
                    <>
                      {!selectedContent ? (
                        isOwner ? (
                          <ContentCarousel
                            availableContents={availableContents}
                            mainContentIndex={mainContentIndex}
                            carouselOrder={carouselOrder}
                            isTransitioning={isTransitioning}
                            selectedContent={selectedContent}
                            isContentsLoading={isContentsLoading}
                            themeName={roomInfo.themeName}
                            onContentSelect={onContentSelect}
                            onMainContentChange={onMainContentChange}
                          />
                        ) : (
                          <div className="relative flex flex-col items-center justify-center h-full gap-4 z-10">
                            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            <p className="text-white text-xl font-semibold">
                              컨텐츠 선택 중입니다..
                            </p>
                          </div>
                        )
                      ) : (
                        <GameControlPanel
                          isOwner={isOwner}
                          isGameStarting={isGameStarting}
                          isRoleAssigned={isRoleAssigned}
                          isPlaying={isPlaying}
                          isWaitingForRolePick={isWaitingForRolePick}
                          isRoleSelectOpen={isRoleSelectOpen}
                          isRoundInProgress={isRoundInProgress}
                          isFinishingRound={isFinishingRound}
                          isRoundStarting={isRoundStarting}
                          currentRound={currentRound}
                          isReady={isReady}
                          isReadyLoading={isReadyLoading}
                          totalParticipants={totalParticipants}
                          readyCount={readyCount}
                          allParticipantsReady={allParticipantsReady}
                          onToggleReady={onToggleReady}
                          onStartShadowing={onStartShadowing}
                          onStartRound={onStartRound}
                          onFinishRoom={onFinishRoom}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* WebRTC idle 상태 */}
          {!disableWebRTC && status === "idle" && (
            <button
              onClick={() => onJoin()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              참여하기
            </button>
          )}

          {/* 역할 선택 버튼 */}
          {isConnectedOrDisabled &&
            !isPlaying &&
            !isGameStarting &&
            countdown === null &&
            !isRoleAssigned &&
            availableRoles.length > 0 && (
              <button
                onClick={() => onSetRoleSelectOpen(true)}
                className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-800 rounded-lg shadow-lg transition-colors font-medium"
              >
                <UserCircle size={20} />
                캐릭터 선택
              </button>
            )}
        </div>
      </div>

      {/* 비디오 컨트롤바 영역 */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <VideoControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={onToggleAudio}
          onToggleVideo={onToggleVideo}
          onLeave={onLeave}
          volume={volume}
          onVolumeChange={onVolumeChange}
          selectedAudioDevice={selectedAudioDevice}
          selectedVideoDevice={selectedVideoDevice}
          onAudioDeviceChange={onAudioDeviceChange}
          onVideoDeviceChange={onVideoDeviceChange}
          selectedNationality={selectedNationality}
          onNationalityChange={onNationalityChange}
          isSubtitleEnabled={isSubtitleEnabled}
          onToggleSubtitle={onToggleSubtitle}
          isNationalityLocked={isNationalityLocked}
        />
      </div>
    </>
  );
}
