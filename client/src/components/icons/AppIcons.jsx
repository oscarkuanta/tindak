import {
  ArrowsClockwise,
  ArrowBendUpLeft,
  Bell,
  Buildings,
  ChatCircleDots,
  CheckCircle,
  ClockCountdown,
  EnvelopeSimple,
  EyeSlash,
  FlagBanner,
  GraduationCap,
  HandsClapping,
  HourglassMedium,
  House,
  Hospital,
  Info,
  Key,
  MagnifyingGlass,
  MapPin,
  Medal,
  Megaphone,
  Paperclip,
  ProhibitInset,
  Question,
  RoadHorizon,
  Robot,
  SealCheck,
  SealWarning,
  ShieldWarning,
  SmileyAngry,
  Star,
  ThumbsUp,
  Trash,
  Tray,
  UserFocus,
  Warning,
  WarningOctagon,
} from '@phosphor-icons/react';
import { cn } from '../../lib/cn.js';

const REACTIONS = {
  DANGEROUS: { Icon: WarningOctagon, tone: 'reaction-red' },
  LONG_STANDING: { Icon: HourglassMedium, tone: 'reaction-amber' },
  ANNOYING: { Icon: SmileyAngry, tone: 'reaction-violet' },
};

const SEVERITIES = {
  LOW: { Icon: Info, tone: 'severity-low' },
  MEDIUM: { Icon: Warning, tone: 'severity-medium' },
  DANGEROUS: { Icon: WarningOctagon, tone: 'severity-danger' },
};

const FLAG_REASONS = {
  SEXUAL: ProhibitInset,
  VIOLENCE: ShieldWarning,
  HATE: ChatCircleDots,
  PERSONAL_ATTACK: UserFocus,
  SPAM: Megaphone,
  NOT_COMPLAINT: Question,
  FAKE_BOARD: SealWarning,
  SYSTEM_NSFW: Robot,
};

const QUICK_TAGS = {
  RESPONSIVE: { Icon: ThumbsUp, tone: 'text-mint-700' },
  SLOW: { Icon: ClockCountdown, tone: 'text-amber' },
  DOUBTFUL: { Icon: Question, tone: 'text-violet' },
};

const BOARD_TYPES = {
  SCHOOL: GraduationCap,
  CAMPUS: GraduationCap,
  OFFICE: Buildings,
  ROAD: RoadHorizon,
  AREA: House,
  PUBLIC_FACILITY: Hospital,
  OTHER: MapPin,
};

const NOTIFICATIONS = {
  REPORT_STATUS_CHANGED: { Icon: ArrowsClockwise, tone: 'notif-blue' },
  REPORT_INFO_REQUESTED: { Icon: Question, tone: 'notif-amber' },
  REPORT_MARKED_DUPLICATE: { Icon: Paperclip, tone: 'notif-slate' },
  REPORT_HIDDEN: { Icon: EyeSlash, tone: 'notif-slate' },
  REPORT_REMOVED: { Icon: Trash, tone: 'notif-red' },
  REPORT_SUPPORT_MILESTONE: { Icon: HandsClapping, tone: 'notif-mint' },
  SUPPORTED_REPORT_RESOLVED: { Icon: CheckCircle, tone: 'notif-mint' },
  BOARD_NEW_REPORT: { Icon: Megaphone, tone: 'notif-blue' },
  HANDLER_NEW_REPORT: { Icon: Tray, tone: 'notif-blue' },
  HANDLER_DANGEROUS_REPORT: { Icon: WarningOctagon, tone: 'notif-red' },
  HANDLER_DEADLINE_SOON: { Icon: ClockCountdown, tone: 'notif-red' },
  HANDLER_REPORT_REOPENED: { Icon: ArrowBendUpLeft, tone: 'notif-amber' },
  HANDLER_INFO_ANSWERED: { Icon: ChatCircleDots, tone: 'notif-mint' },
  BOARD_INVITATION: { Icon: EnvelopeSimple, tone: 'notif-violet' },
  BOARD_RATING_DIGEST: { Icon: Star, tone: 'notif-amber' },
  BOARD_VERIFIED: { Icon: SealCheck, tone: 'notif-blue' },
  BOARD_VERIFICATION_REVOKED: { Icon: SealWarning, tone: 'notif-red' },
  BOARD_CANDIDATE_NEW: { Icon: Medal, tone: 'notif-amber' },
  BOARD_OWNER_CHANGED: { Icon: Key, tone: 'notif-violet' },
  BOARD_NEEDS_REVIEW: { Icon: MagnifyingGlass, tone: 'notif-red' },
};

export function ReactionIcon({ type, active = true, size = 18, className }) {
  const reaction = REACTIONS[type];
  if (!reaction) return null;
  const { Icon, tone } = reaction;
  return (
    <span aria-hidden="true" className={cn('reaction-dot', tone, active && 'is-active', className)}>
      <Icon size={size} weight="fill" />
    </span>
  );
}

export function SeverityIcon({ severity, size = 16, className }) {
  const item = SEVERITIES[severity];
  if (!item) return null;
  const { Icon, tone } = item;
  return <Icon aria-hidden="true" size={size} weight="fill" className={cn(tone, className)} />;
}

export function FlagReasonIcon({ reason, size = 18, className }) {
  const Icon = FLAG_REASONS[reason] ?? FlagBanner;
  return <Icon aria-hidden="true" size={size} weight="duotone" className={className} />;
}

export function QuickTagIcon({ tag, size = 16, className }) {
  const item = QUICK_TAGS[tag];
  if (!item) return null;
  const { Icon, tone } = item;
  return <Icon aria-hidden="true" size={size} weight="fill" className={cn(tone, className)} />;
}

export function BoardTypeIcon({ type, size = 22, className }) {
  const Icon = BOARD_TYPES[type] ?? MapPin;
  return <Icon aria-hidden="true" size={size} weight="duotone" className={className} />;
}

export function NotificationIcon({ type, size = 18 }) {
  const { Icon, tone } = NOTIFICATIONS[type] ?? { Icon: Bell, tone: 'notif-slate' };
  return (
    <span aria-hidden="true" className={cn('notif-icon', tone)}>
      <Icon size={size} weight="fill" />
    </span>
  );
}

export function StarIcon({ filled = true, size = 16, className }) {
  return (
    <Star
      aria-hidden="true"
      size={size}
      weight={filled ? 'fill' : 'regular'}
      className={cn(filled ? 'text-yellow' : 'text-border', className)}
    />
  );
}
