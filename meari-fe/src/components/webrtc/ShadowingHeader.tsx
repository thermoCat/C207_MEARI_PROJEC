import { useState } from "react";
import { Lock, Unlock, Copy, Check } from "lucide-react";

interface ShadowingHeaderRoomInfo {
  isLocked: boolean;
  title: string;
  password: string;
}

interface ShadowingHeaderProps {
  roomInfo: ShadowingHeaderRoomInfo;
}

export function ShadowingHeader({ roomInfo }: ShadowingHeaderProps) {
  // 비밀번호 Copy UI에 대한 변수
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(roomInfo.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  return (
    <div className="w-full border-b border-gray-200 px-6 py-6 bg-white">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${roomInfo.isLocked ? "bg-yellow-50" : "bg-green-50"}`}>
          {roomInfo.isLocked ? (
            <Lock size={20} className="text-yellow-600" />
          ) : (
            <Unlock size={20} className="text-green-600" />
          )}
        </div>

        <h1 className="text-lg font-semibold text-gray-900 flex-1">
          {roomInfo.title}
        </h1>

        {roomInfo.isLocked && (
          <button
            onClick={handleCopyPassword}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copiedPassword ? (
              <>
                <Check size={16} className="text-blue-600" />
                <span className="text-sm text-blue-600">복사됨</span>
              </>
            ) : (
              <>
                <Copy size={16} className="text-gray-600" />
                <span className="text-sm text-gray-700">비밀번호 복사</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default ShadowingHeader
