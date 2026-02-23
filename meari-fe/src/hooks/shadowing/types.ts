import type { RoleSegment } from "../useRoomWebSocket";

export interface SubtitleItem {
  roleName: string;
  roleId: number;
  text: string;
  isMyRole: boolean;
  timing: 'prev' | 'current' | 'next';
  nickname?: string;
  nicknameColor?: string;
}

export interface TimeIndexedSubtitle {
  sentence_id: number;
  start_time: number;
  end_time: number;
  role_id: number;
  role_name: string;
  text_ko: string;
  text_vn: string;
}

export type { RoleSegment };

export function generateUserColor(memberId: number): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];
  return colors[memberId % colors.length];
}
