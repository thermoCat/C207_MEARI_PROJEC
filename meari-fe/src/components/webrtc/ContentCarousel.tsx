import { Users, Clock } from "lucide-react";
import type { Content } from "../../api/contents.api";

interface ContentCarouselProps {
  availableContents: Content[];
  mainContentIndex: number;
  carouselOrder: number[];
  isTransitioning: boolean;
  selectedContent: Content | null;
  isContentsLoading: boolean;
  themeName: string;
  onContentSelect: (content: Content) => void;
  onMainContentChange: (index: number) => void;
}

export default function ContentCarousel({
  availableContents,
  mainContentIndex,
  carouselOrder,
  isTransitioning,
  selectedContent,
  isContentsLoading,
  themeName,
  onContentSelect,
  onMainContentChange,
}: ContentCarouselProps) {
  if (isContentsLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (availableContents.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
        컨텐츠가 없습니다.
      </div>
    );
  }

  const mainContent = availableContents[mainContentIndex];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 메인 컨텐츠 배경 이미지 */}
      <div className="absolute inset-0 transition-opacity duration-700 ease-in-out">
        <img
          src={mainContent.thumbnail_url}
          alt={mainContent.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-in-out"
        />
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-black/60 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-black/60 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-linear-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

      {/* 스크롤 가능한 컨텐츠 레이어 */}
      <div className="absolute inset-0 z-20 overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
        <div className="relative min-h-full flex flex-col px-8 py-8">
          <div
            className={`transition-all duration-700 ${
              isTransitioning && selectedContent
                ? "-translate-y-full opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <h1 className="text-white text-2xl font-bold">컨텐츠 선택</h1>
          </div>

          {/* 컨텐츠 정보 영역 */}
          <div className="flex-1 flex items-end min-h-50 py-8">
            <div className="max-w-2xl transition-all duration-700 ease-in-out">
              <span className="inline-block px-4 py-1.5 bg-gray-500/30 text-gray-300 text-sm font-medium rounded-full mb-3">
                {themeName}
              </span>
              <h2 className="text-white text-5xl font-bold mb-3">
                {mainContent.title}
              </h2>
              <p className="text-gray-200 text-base leading-relaxed line-clamp-2 mb-4">
                {mainContent.description}
              </p>
              <div className="flex items-center gap-6">
                {mainContent.max_people && (
                  <div className="flex items-center gap-2 text-white">
                    <Users size={20} />
                    <span className="text-base font-medium">
                      {mainContent.max_people}명
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-white">
                  <Clock size={20} />
                  <span className="text-base font-medium">
                    {Math.floor(mainContent.total_duration / 60)}:
                    {Math.floor(mainContent.total_duration % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                </div>
                <button
                  onClick={() => onContentSelect(mainContent)}
                  className="ml-2 px-8 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-full font-semibold text-lg transition-all shadow-xl"
                >
                  이 컨텐츠로 시작하기
                </button>
              </div>
            </div>
          </div>

          {/* 하단 캐러셀 */}
          <div
            className={`transition-all duration-700 ${
              isTransitioning && selectedContent
                ? "translate-y-full opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50">
              {carouselOrder.map((contentIndex) => {
                const content = availableContents[contentIndex];
                if (!content) return null;
                return (
                  <button
                    key={content.content_id}
                    onClick={() => onMainContentChange(contentIndex)}
                    className="shrink-0 w-64 min-[1920px]:w-80 border border-white/20 hover:border-white/40 hover:shadow-lg bg-white/5 rounded-lg overflow-hidden transition-all duration-500 text-left group animate-slide-in-right"
                  >
                    <div className="relative w-full h-44 min-[1920px]:h-52 overflow-hidden">
                      <img
                        src={content.thumbnail_url}
                        alt={content.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {content.max_people && (
                        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                          <Users size={12} />
                          <span>{content.max_people}명</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Clock size={12} />
                        <span>
                          {Math.floor(content.total_duration / 60)}:
                          {Math.floor(content.total_duration % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-1 line-clamp-1 transition-colors text-gray-200">
                        {content.title}
                      </h3>
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {content.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
