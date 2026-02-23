import { useEffect, useRef, useState } from "react";
import { Users, MessageCircle, LayoutList, LayoutGrid, Maximize2 } from "lucide-react";
import ChatPanel from "./ChatPanel";
import VideoTilesPanel from "./VideoTilesPanel";
import type { ConnectionStatus, VideoTileData } from "../../hooks/useVideoRoom";
import type { ChatMessage } from "../../hooks/useRoomWebSocket";

type SidebarTab = "video" | "chat";
type LayoutMode = "narrow" | "grid" | "wide";

interface RightSideBardPanelProps {
  disableWebRTC: boolean;
  isMediaChecked: boolean;
  status: ConnectionStatus;
  tiles: VideoTileData[];
  participantsReady: Record<number, boolean>;
  isGameStarting: boolean;
  isPlaying: boolean;
  roomOwnerId?: number;
  chatMessages: ChatMessage[];
  sendChatMessage: (message: string, nickname: string) => void;
  nickname: string;
  memberId: number;
}

const layoutConfigs = {
  narrow: { width: "w-90", label: "1열 (기본)", icon: LayoutList },
  grid: { width: "w-[600px]", label: "2x2 그리드", icon: LayoutGrid },
  wide: { width: "w-[480px]", label: "넓은 사이드바", icon: Maximize2 },
} as const;

export default function RightSideBardPanel({
  disableWebRTC,
  isMediaChecked,
  status,
  tiles,
  participantsReady,
  isGameStarting,
  isPlaying,
  roomOwnerId,
  chatMessages,
  sendChatMessage,
  nickname,
  memberId,
}: RightSideBardPanelProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("video");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("narrow");
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const layoutDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(event.target as Node)) {
        setIsLayoutDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    setIsLayoutDropdownOpen(false);
  };

  const ActiveLayoutIcon = layoutConfigs[layoutMode].icon;

  return (
    <div
      className={`${layoutConfigs[layoutMode].width} flex flex-col border-l border-gray-200 bg-white transition-all duration-300`}
    >
      <div className="flex gap-2 p-3 py-4 bg-gray-50">
        <div className="flex gap-2 flex-1">
          <button
            onClick={() => setSidebarTab("video")}
            className={`flex-1 flex items-center cursor-pointer justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              sidebarTab === "video"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Users size={18} />
            <span>참여자</span>
          </button>
          <button
            onClick={() => setSidebarTab("chat")}
            className={`flex-1 flex items-center cursor-pointer justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              sidebarTab === "chat"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <MessageCircle size={18} />
            <span>채팅</span>
          </button>
        </div>

        <div className="relative" ref={layoutDropdownRef}>
          <button
            onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
            className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
            title="레이아웃 변경"
          >
            <ActiveLayoutIcon size={18} />
          </button>

          {isLayoutDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10 min-w-48">
              {(Object.entries(layoutConfigs) as [LayoutMode, (typeof layoutConfigs)[LayoutMode]][]).map(
                ([mode, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={mode}
                      onClick={() => handleLayoutChange(mode)}
                      className={`flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-50 transition-colors text-left ${
                        layoutMode === mode ? "bg-blue-50 text-blue-600" : "text-gray-700"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-sm">{config.label}</span>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        {sidebarTab === "video" && isMediaChecked && (
          <VideoTilesPanel
            disableWebRTC={disableWebRTC}
            layoutMode={layoutMode}
            status={status}
            tiles={tiles}
            participantsReady={participantsReady}
            isGameStarting={isGameStarting}
            isPlaying={isPlaying}
            roomOwnerId={roomOwnerId}
          />
        )}

        {sidebarTab === "chat" && (
          <div className="h-full">
            <ChatPanel
              messages={chatMessages}
              onSendMessage={sendChatMessage}
              nickname={nickname}
              currentUserId={memberId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
