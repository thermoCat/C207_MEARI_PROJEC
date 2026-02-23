import { Users, Check, X, Play, Home } from "lucide-react";

interface GameControlPanelProps {
  isOwner: boolean;
  isGameStarting: boolean;
  isRoleAssigned: boolean;
  isPlaying: boolean;
  isWaitingForRolePick: boolean;
  isRoleSelectOpen: boolean;
  isRoundInProgress: boolean;
  isFinishingRound: boolean;
  isRoundStarting: boolean;
  currentRound: number;
  isReady: boolean;
  isReadyLoading: boolean;
  totalParticipants: number;
  readyCount: number;
  allParticipantsReady: boolean;
  onToggleReady: () => void;
  onStartShadowing: () => void;
  onStartRound: (round: number) => void;
  onFinishRoom: () => void;
}

export default function GameControlPanel({
  isOwner,
  isGameStarting,
  isRoleAssigned,
  isPlaying,
  isWaitingForRolePick,
  isRoleSelectOpen,
  isRoundInProgress,
  isFinishingRound,
  isRoundStarting,
  currentRound,
  isReady,
  isReadyLoading,
  totalParticipants,
  readyCount,
  allParticipantsReady,
  onToggleReady,
  onStartShadowing,
  onStartRound,
  onFinishRoom,
}: GameControlPanelProps) {
  const showReadyControls =
    !isGameStarting && !isRoleAssigned && !isPlaying && !isWaitingForRolePick && !isRoleSelectOpen;

  return (
    <>
      {/* 입장 인원 - 우측 하단 */}
      {showReadyControls && totalParticipants > 0 && (
        <div className="absolute right-8 bottom-8 z-20 flex items-center gap-4 px-7 py-3 bg-white/10 backdrop-blur-sm rounded-full min-w-[140px] animate-slide-up">
          <Users size={24} className="text-white shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-white text-2xl font-semibold w-4 text-center">
              {readyCount}
            </span>
            <span className="text-white/60 text-lg font-medium">/</span>
            <span className="text-white/80 text-xl font-medium w-4 text-center">
              {totalParticipants}
            </span>
          </div>
        </div>
      )}

      {/* 준비하기 + 시작하기 버튼 - 좌측 하단 */}
      {showReadyControls && (
        <div className="absolute left-8 bottom-8 z-20 flex gap-4 animate-slide-up">
          <button
            onClick={onToggleReady}
            disabled={isReadyLoading}
            className={`w-40 py-3 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 text-white border-2 border-white/80 bg-transparent hover:bg-white/10 ${
              isReadyLoading ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {isReadyLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isReady ? (
              <X size={18} />
            ) : (
              <Check size={18} />
            )}
            {isReadyLoading
              ? "처리 중..."
              : isReady
                ? "준비 취소"
                : "준비 완료"}
          </button>

          {isOwner && allParticipantsReady && (
            <button
              onClick={onStartShadowing}
              className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-full font-semibold text-lg transition-all shadow-lg animate-fadeInUp"
            >
              <Play size={20} fill="currentColor" />
              시작하기
            </button>
          )}
        </div>
      )}

      {/* 역할 선택 완료 후 */}
      {isRoleAssigned && (
        <>
          {isOwner && (
            <div className="absolute left-8 bottom-8 z-20 flex flex-col gap-4">
              {!isFinishingRound &&
                !isRoundInProgress &&
                !isRoundStarting &&
                currentRound < 2 && (
                  <button
                    onClick={() => onStartRound(currentRound + 1)}
                    disabled={isRoundStarting}
                    className={`px-8 py-3 rounded-full font-semibold text-lg transition-all flex items-center gap-2 animate-fadeInUp ${
                      isRoundStarting
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-white hover:bg-gray-100 text-gray-900"
                    }`}
                  >
                    {isRoundStarting ? (
                      <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play size={20} fill="currentColor" />
                    )}
                    {isRoundStarting
                      ? "시작 중..."
                      : `Round ${currentRound + 1} 시작하기`}
                  </button>
                )}

              {!isFinishingRound &&
                !isRoundInProgress &&
                currentRound === 2 && (
                  <button
                    onClick={onFinishRoom}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold text-lg transition-all flex items-center gap-2"
                  >
                    <Home size={20} />
                    처음으로 돌아가기
                  </button>
                )}
            </div>
          )}

          {!isOwner && !isRoundInProgress && currentRound < 2 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white text-xl font-semibold">
                {isFinishingRound
                  ? "라운드 종료 처리 중..."
                  : "라운드 시작을 기다리는 중입니다"}
              </p>
            </div>
          )}

          {!isOwner && !isRoundInProgress && currentRound === 2 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <p className="text-white text-xl font-semibold">
                모든 라운드가 완료되었습니다
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
