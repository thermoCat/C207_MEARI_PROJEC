import { useState, useEffect, useCallback } from "react";
import type { Content } from "../../api/contents.api";
import { selectRoomContent, getThemes, getThemeContents } from "../../api/contents.api";
import { getContentVideoUrl } from "../../api/rooms.api";
import type { RoomDetailData } from "../../api/rooms.api";

interface UseContentSelectionParams {
  roomId: string | undefined;
  roomData: RoomDetailData | null;
  setContentId: (id: number | null) => void;
  showToast: (msg: string) => void;
}

export function useContentSelection({
  roomId,
  roomData,
  setContentId,
  showToast,
}: UseContentSelectionParams) {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [themeDescription, setThemeDescription] = useState("");
  const [availableContents, setAvailableContents] = useState<Content[]>([]);
  const [isContentsLoading, setIsContentsLoading] = useState(false);
  const [mainContentIndex, setMainContentIndex] = useState(0);
  const [carouselOrder, setCarouselOrder] = useState<number[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isContentSelectOpen, setIsContentSelectOpen] = useState(false);
  const [needsAutoContentSelect, setNeedsAutoContentSelect] = useState(false);

  // 테마 설명 가져오기
  useEffect(() => {
    const fetchThemeDescription = async () => {
      if (!roomData?.theme_id) return;
      try {
        const response = await getThemes();
        if (response.data.success && response.data.data) {
          const theme = response.data.data.find(t => t.theme_id === roomData.theme_id);
          if (theme) setThemeDescription(theme.description);
        }
      } catch (error) {
        console.error('Failed to fetch theme description:', error);
      }
    };
    fetchThemeDescription();
  }, [roomData?.theme_id]);

  // 테마별 컨텐츠 목록 불러오기
  useEffect(() => {
    const fetchContents = async () => {
      if (!roomData?.theme_id) return;
      setIsContentsLoading(true);
      try {
        const response = await getThemeContents(roomData.theme_id);
        if (response.data.success && response.data.data) {
          setAvailableContents(response.data.data);
          const initialOrder = response.data.data
            .map((_: Content, index: number) => index)
            .filter((index: number) => index !== 0);
          setCarouselOrder(initialOrder);
        }
      } catch (error) {
        console.error('Failed to fetch contents:', error);
      } finally {
        setIsContentsLoading(false);
      }
    };
    fetchContents();
  }, [roomData?.theme_id]);

  // 빠른 생성: 자동 컨텐츠 선택
  useEffect(() => {
    if (!needsAutoContentSelect || availableContents.length === 0 || !roomId) return;
    const autoSelectContent = async () => {
      try {
        const firstContent = availableContents[0];
        const response = await selectRoomContent(Number(roomId), firstContent.content_id);
        if (response.data.success) {
          setSelectedContent(firstContent);
        }
      } catch (error) {
        console.error('[autoSelectContent] Failed:', error);
      }
      setNeedsAutoContentSelect(false);
    };
    autoSelectContent();
  }, [needsAutoContentSelect, availableContents, roomId]);

  const handleMainContentChange = useCallback((newMainIndex: number) => {
    if (isTransitioning || newMainIndex === mainContentIndex) return;
    setIsTransitioning(true);
    const oldMainIndex = mainContentIndex;
    setCarouselOrder(prev => [...prev.filter(idx => idx !== newMainIndex), oldMainIndex]);
    setMainContentIndex(newMainIndex);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning, mainContentIndex]);

  const handleContentSelect = useCallback(async (content: Content) => {
    if (!roomId) return;
    setIsTransitioning(true);
    try {
      const response = await selectRoomContent(Number(roomId), content.content_id);
      if (response.data.success) {
        setSelectedContent(content);
        setIsContentSelectOpen(false);
        setTimeout(() => setIsTransitioning(false), 700);
      } else {
        showToast('컨텐츠 선택에 실패했어요');
        setIsTransitioning(false);
      }
    } catch (error) {
      console.error('Failed to select content:', error);
      showToast('컨텐츠 선택에 실패했어요');
      setIsTransitioning(false);
    }
  }, [roomId, showToast]);

  const handleCancelContentSelection = useCallback(() => {
    if (!selectedContent) return;
    const contentIndex = availableContents.findIndex(
      (content) => content.content_id === selectedContent.content_id
    );
    if (contentIndex !== -1) {
      setMainContentIndex(contentIndex);
      const newCarouselOrder = availableContents
        .map((_: Content, index: number) => index)
        .filter((index: number) => index !== contentIndex);
      setCarouselOrder(newCarouselOrder);
    }
    setSelectedContent(null);
    setVideoUrl(null);
  }, [selectedContent, availableContents]);

  // WS 콜백용: 컨텐츠 선택 수신 처리
  const handleContentSelectedWS = useCallback(async (contentIdFromWS: number) => {
    setContentId(contentIdFromWS);

    let videoUrlFromApi = '';
    try {
      const videoResponse = await getContentVideoUrl(contentIdFromWS);
      if (videoResponse.data.success && videoResponse.data.data) {
        videoUrlFromApi = videoResponse.data.data.video_url;
        setVideoUrl(videoUrlFromApi);
      }
    } catch (error) {
      console.error('[CONTENT_SELECTED] Failed to get video URL:', error);
      showToast('비디오를 불러오는데 실패했습니다');
      return;
    }

    setSelectedContent((prev) => {
      if (prev && prev.content_id === contentIdFromWS) return prev;
      const themeId = roomData?.theme_id || 1;
      getThemeContents(themeId).then(res => {
        if (res.data.success && res.data.data) {
          const actual = res.data.data.find((c: Content) => c.content_id === contentIdFromWS);
          if (actual) {
            setSelectedContent({
              content_id: contentIdFromWS,
              theme_id: themeId,
              title: actual.title,
              description: actual.description,
              video_url: videoUrlFromApi || actual.video_url,
              thumbnail_url: actual.thumbnail_url,
              total_duration: actual.total_duration,
            });
          }
        }
      }).catch(() => {});
      return {
        content_id: contentIdFromWS,
        theme_id: themeId,
        title: '컨텐츠 로딩 중...',
        description: '',
        video_url: videoUrlFromApi,
        thumbnail_url: '',
        total_duration: 0,
      };
    });
  }, [roomData?.theme_id, setContentId, showToast]);

  // 기존 컨텐츠 초기화 (방 입장 시 content_id가 이미 있는 경우)
  const initializeExistingContent = useCallback(async (existingContentId: number, existingThemeId: number) => {
    setContentId(existingContentId);
    try {
      const [videoResponse, contentsResponse] = await Promise.all([
        getContentVideoUrl(existingContentId),
        getThemeContents(existingThemeId),
        selectRoomContent(Number(roomId), existingContentId).catch(() => null),
      ]);

      let videoUrlFromApi = '';
      if (videoResponse.data.success && videoResponse.data.data) {
        videoUrlFromApi = videoResponse.data.data.video_url;
        setVideoUrl(videoUrlFromApi);
      }

      const actualContent = contentsResponse.data.success && contentsResponse.data.data
        ? contentsResponse.data.data.find((c: Content) => c.content_id === existingContentId)
        : null;

      setSelectedContent({
        content_id: existingContentId,
        theme_id: existingThemeId,
        title: actualContent?.title ?? '선택된 컨텐츠',
        description: actualContent?.description ?? '',
        video_url: videoUrlFromApi || actualContent?.video_url || '',
        thumbnail_url: actualContent?.thumbnail_url ?? '',
        total_duration: actualContent?.total_duration ?? 0,
      });
    } catch (error) {
      console.error('[initializeExistingContent] Failed to get video URL:', error);
    }
  }, [roomId, setContentId]);

  const resetContentState = useCallback(() => {
    setSelectedContent(null);
    setVideoUrl(null);
  }, []);

  return {
    selectedContent,
    videoUrl,
    themeDescription,
    availableContents,
    isContentsLoading,
    mainContentIndex,
    carouselOrder,
    isTransitioning,
    isContentSelectOpen,
    setIsContentSelectOpen,
    setNeedsAutoContentSelect,
    handleMainContentChange,
    handleContentSelect,
    handleCancelContentSelection,
    handleContentSelectedWS,
    initializeExistingContent,
    resetContentState,
  };
}
