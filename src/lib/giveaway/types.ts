export type SourceKind = 'instagram' | 'csv' | 'list' | 'demo';
export type Comment = {
  id: string; username: string; text: string; timestamp: string | null;
  displayName?: string; avatar?: string; parentId?: string;
};
export type Source = { kind: SourceKind; label: string; permalink: string; importedAt: string; mediaId?: string; reportedCount?: number; warning?: string };
export type Rules = { owner: string; requireMention: boolean; cutoff: string; allowUndated: boolean; manualExclusions: Record<string, string> };
export type Excluded = { comment: Comment; reason: string };
export type Review = { valid: Comment[]; excluded: Excluded[]; processed: number; undated: number };
export type Snapshot = { version: 1; source: Source; rules: Rules; comments: Comment[]; review: Review };
export type ManualChecks = { follows: boolean; likes: boolean; story: boolean };
export type Draw = {
  id: string; at: string; winner: Comment; winnerIndex: number; size: number;
  reason: string | null; previousHash: string | null; hash: string;
  random: { algorithm: 'uint32-rejection-v1'; words: number[]; ceiling: number };
};
export type Event = { at: string; type: 'review' | 'disqualification' | 'avatar' | 'new-dataset'; drawId: string; reason?: string; checks?: ManualChecks; avatarHash?: string; hash: string; previousHash: string };
export type Audit = {
  version: 1; id: string; lockedAt: string; snapshot: Snapshot; snapshotHash: string;
  draws: Draw[]; events: Event[]; status: 'pending' | 'confirmed' | 'disqualified';
  signature: string; signatureNote: string;
  avatars: Record<string, { dataUrl: string; hash: string; username: string }>;
};
export const DEFAULT_RULES: Rules = {
  owner: '_myaimportaciones', requireMention: true,
  cutoff: '2026-10-18T23:59:59-03:00', allowUndated: false, manualExclusions: {}
};
export const POST = 'https://www.instagram.com/p/DeIpHXtkYyf/';
export const SOURCE_LABELS: Record<SourceKind, string> = { instagram: 'Comentarios de Meta', csv: 'CSV importado', list: 'Lista importada', demo: 'Demostración' };
