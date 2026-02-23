import type { ConnectionStatus, VideoTileData } from "../../hooks/useVideoRoom";
import VideoTile from "./VideoTile";

interface VideoTilesPanelProps {
  disableWebRTC: boolean;
  layoutMode: "narrow" | "grid" | "wide";
  status: ConnectionStatus;
  tiles: VideoTileData[];
  participantsReady: Record<number, boolean>;
  isGameStarting: boolean;
  isPlaying: boolean;
  roomOwnerId?: number;
}

export default function VideoTilesPanel({
  disableWebRTC,
  layoutMode,
  status,
  tiles,
  participantsReady,
  isGameStarting,
  isPlaying,
  roomOwnerId,
}: VideoTilesPanelProps) {
  return (
    <div
      className={`h-full overflow-y-auto p-3 ${
        layoutMode === "grid" ? "grid grid-cols-2 gap-3 auto-rows-min" : "space-y-3"
      }`}
    >
      {disableWebRTC ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <p className="text-gray-600 text-lg font-semibold mb-2">WebRTC 비활성화됨</p>
          <p className="text-gray-500 text-sm">쉐도잉 기능만 테스트 중입니다</p>
          <p className="text-gray-400 text-xs mt-4">
            WebRTC를 활성화하려면 DISABLE_WEBRTC를 false로 설정하세요
          </p>
        </div>
      ) : status === "connected" && tiles.length > 0 ? (
        tiles.map((tile) => {
          const tileIsReady =
            tile.memberId !== undefined && participantsReady[tile.memberId] === true;
          const showReady = tileIsReady && !isGameStarting && !isPlaying;
          const isOwnerTile = tile.memberId !== undefined && tile.memberId === roomOwnerId;
          const displayLabel = isOwnerTile ? `[방장] ${tile.label}` : tile.label;

          return (
            <VideoTile
              key={tile.id}
              streamManager={tile.streamManager}
              muted={tile.muted}
              label={displayLabel}
              isSpeaker={tile.isSpeaker}
              isReady={showReady}
              isSettingUp={tile.isSettingUp}
              videoClassName={layoutMode === "wide" ? "aspect-[21/9]" : undefined}
            />
          );
        })
      ) : (
        <p className="text-center text-gray-500 text-sm py-8 col-span-2">
          {status === "connecting" ? "연결 중..." : "참여자가 없습니다"}
        </p>
      )}
    </div>
  );
}

