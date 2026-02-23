import type { SubtitleItem } from "../../hooks/shadowing/types";

interface SubtitleOverlayProps {
  isSubtitleEnabled: boolean;
  currentSubtitles: SubtitleItem[];
}

export default function SubtitleOverlay({
  isSubtitleEnabled,
  currentSubtitles,
}: SubtitleOverlayProps) {
  if (!isSubtitleEnabled || currentSubtitles.length === 0) return null;

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-5xl px-4">
      <div className="space-y-2">
        {currentSubtitles.map((subtitle, index) => {
          const isCurrent = subtitle.timing === "current";
          const isPrev = subtitle.timing === "prev";
          const isNext = subtitle.timing === "next";

          return (
            <div
              key={`${subtitle.roleId}-${subtitle.timing}-${index}`}
              className={`px-5 py-3 rounded-lg text-center flex justify-center items-center gap-2 transition-all ${
                isCurrent ? "bg-black/80" : "bg-black/50"
              } ${isPrev || isNext ? "opacity-70" : "opacity-100"}`}
            >
              {subtitle.nickname && (
                <p
                  className={`text-sm font-semibold ${
                    isCurrent ? "text-base" : "text-xs"
                  }`}
                  style={{
                    color: subtitle.nicknameColor || "#9CA3AF",
                  }}
                >
                  {subtitle.nickname}
                  {subtitle.isMyRole && " (나)"}
                </p>
              )}
              <p
                className={`text-white font-medium ${
                  isCurrent ? "text-xl" : "text-base"
                }`}
              >
                {subtitle.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
